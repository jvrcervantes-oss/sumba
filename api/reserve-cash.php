<?php
/**
 * reserve-cash.php — Sumba Rental Motorbike (25-sep-2026)
 *
 * Reserva con pago EN EFECTIVO a la recogida en el aeropuerto. Pedido del owner.
 *
 * Lo que cambia frente a la tarjeta: aqui no hay Stripe que frene los abusos ni que
 * fije el importe. Por eso, y en este orden:
 *   1. Solo POST + JSON + Origin/Referer exacto del dominio. Un formulario de otra web
 *      o un curl sin cabeceras no pasan (sin cabeceras CORS: nadie mas puede leernos).
 *   2. Honeypot + limites: por IP, por email/telefono y un tope global diario. Sin
 *      ellos cualquiera usa esto para mandar emails con nuestra marca o para llenar el
 *      Telegram del operador de reservas falsas que le hacen apartar motos.
 *   3. El importe lo calcula sr_quote() (api/booking-lib.php), el mismo que usa
 *      checkout.php. Del navegador NO se acepta ningun total.
 *   4. Lo duradero primero: la fila del CSV. Si luego falla el aviso, la reserva existe.
 *   5. Telegram + email al operador dicen SIN COBRAR y SIN CONFIRMAR: se confirma por
 *      WhatsApp antes de apartar la moto. Email al cliente: "reserva recibida".
 *
 * Responde JSON: {ok:true, ref, total} o {ok:false, error:<codigo>}.
 */

require_once __DIR__ . '/booking-lib.php';
require_once __DIR__ . '/mailer.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($code, array $body) {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

$cfgFile = dirname(__DIR__) . '/private/sumba-mail-config.php';
if (!file_exists($cfgFile)) out(500, ['ok' => false, 'error' => 'config']);   // nunca aceptar en silencio
$cfg  = require $cfgFile;
$site = rtrim($cfg['site_url'] ?? 'https://sumba.balibestmotorcycle.com', '/');

$logFile = dirname(__DIR__) . '/private/cash-bookings.log';
$log = function ($msg) use ($logFile) {
    @file_put_contents($logFile, date('c') . ' | ' . $msg . "\n", FILE_APPEND | LOCK_EX);
};

// ── 1. Forma de la peticion ────────────────────────────────────────
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, ['ok' => false, 'error' => 'metodo']);
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) out(415, ['ok' => false, 'error' => 'formato']);

// Origin exacto; si el navegador no lo manda, Referer del mismo sitio. Sin ninguno
// de los dos se rechaza: "rechazar solo si llega y no coincide" dejaria pasar un curl.
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$sameSite = $origin !== '' ? $origin === $site : strpos($referer, $site . '/') === 0;
if (!$sameSite) out(403, ['ok' => false, 'error' => 'origen']);

$raw = file_get_contents('php://input', false, null, 0, 4096);
$in  = json_decode((string)$raw, true);
if (!is_array($in)) out(400, ['ok' => false, 'error' => 'formato']);

// Honeypot: campo oculto que una persona nunca rellena. Se contesta "ok" para que el
// bot no aprenda nada, pero no se apunta ni se avisa a nadie.
if (trim((string)($in['website'] ?? '')) !== '') {
    $log('honeypot | descartado');
    out(200, ['ok' => true, 'ref' => 'SR-C' . strtoupper(bin2hex(random_bytes(3))), 'total' => 0]);
}

// ── 2. Datos de contacto (los pedia Stripe; ahora los pedimos nosotros) ──
$name  = trim((string)($in['name'] ?? ''));
$email = trim((string)($in['email'] ?? ''));
$phone = trim((string)($in['phone'] ?? ''));
$lang  = ($in['lang'] ?? 'en') === 'es' ? 'es' : 'en';
$es    = $lang === 'es';

// Nada de caracteres de control (saltos de linea incluidos): el nombre acaba en un
// email, en Telegram y en un CSV.
if (mb_strlen($name) < 2 || mb_strlen($name) > 80 || preg_match('/[\x00-\x1F\x7F]/u', $name) || !preg_match('//u', $name)) {
    out(422, ['ok' => false, 'error' => 'nombre']);
}
// Validar el email ANTES de cualquier uso: FILTER_VALIDATE_EMAIL rechaza CR/LF, y
// eso es lo que impide inyectar cabeceras en el SMTP.
if (strlen($email) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL)) out(422, ['ok' => false, 'error' => 'email']);
$phoneDigits = preg_replace('/\D/', '', $phone);
if (!preg_match('/^\+?[0-9 ()\-]{7,24}$/', $phone) || strlen($phoneDigits) < 7 || strlen($phoneDigits) > 16) {
    out(422, ['ok' => false, 'error' => 'telefono']);
}

// ── 3. Reserva y precio (en servidor) ──────────────────────────────
list($okQuote, $q) = sr_quote($in);
if (!$okQuote) out(422, ['ok' => false, 'error' => $q]);   // 'fechas' | 'antelacion'

// ── 4. Limites ─────────────────────────────────────────────────────
// En fichero, con flock. IPs y contactos guardados como hash (son datos personales)
// y todo lo de mas de 24 h se tira en cada escritura.
$limits = [
    'ip'      => [3600,  5],   // 5 por hora desde la misma IP
    'contact' => [86400, 3],   // 3 al dia con el mismo email o telefono
    'global'  => [86400, 25],  // 25 al dia en total: muy por encima de lo real
];
$salt  = (string)($cfg['webhook_secret'] ?? 'sumba');
$h     = fn($v) => substr(hash_hmac('sha256', (string)$v, $salt), 0, 20);
$keys  = [
    'ip:' . $h($_SERVER['REMOTE_ADDR'] ?? '')  => 'ip',
    'em:' . $h(strtolower($email))             => 'contact',
    'ph:' . $h($phoneDigits)                   => 'contact',
    'global'                                   => 'global',
];
$rlFile = dirname(__DIR__) . '/private/cash-ratelimit.json';
$fh = @fopen($rlFile, 'c+');
if (!$fh || !flock($fh, LOCK_EX)) out(500, ['ok' => false, 'error' => 'config']);
$now  = time();
$data = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
foreach ($data as $k => $ts) {
    $data[$k] = array_values(array_filter((array)$ts, fn($t) => $t > $now - 86400));
    if (!$data[$k]) unset($data[$k]);
}
foreach ($keys as $k => $kind) {
    list($win, $max) = $limits[$kind];
    $recent = array_filter($data[$k] ?? [], fn($t) => $t > $now - $win);
    if (count($recent) >= $max) {
        flock($fh, LOCK_UN); fclose($fh);
        $log("limite $kind | descartado");
        out(429, ['ok' => false, 'error' => 'limite']);
    }
}
foreach ($keys as $k => $kind) $data[$k][] = $now;
ftruncate($fh, 0); rewind($fh);
fwrite($fh, json_encode($data));
fflush($fh); flock($fh, LOCK_UN); fclose($fh);

// ── 5. Apuntar (lo duradero primero) ───────────────────────────────
$ref = 'SR-C' . strtoupper(bin2hex(random_bytes(3)));
$utm = is_array($in['utm'] ?? null) ? $in['utm'] : [];
$u   = fn($k, $len) => substr(preg_replace('/[^a-zA-Z0-9_\-. ]/', '', (string)($utm[$k] ?? '')), 0, $len);

$csv = $cfg['bookings_csv'] ?? (dirname(__DIR__) . '/private/bookings.csv');
$row = [date('c'), $ref, 'efectivo', $email, $name, $phone, $q['bike_name'], $q['qty'], $q['days'], $q['from'], $q['to'],
        $q['protection'], $q['dropoff'], $q['total_idr'], $u('utm_source', 100), $u('utm_campaign', 200),
        $u('gclid', 250), $u('fbclid', 250), 'efectivo', 'pendiente', $q['deposit_idr'], ''];
if (!sr_append_booking($csv, $row)) {
    $log("$ref | FALLO escribiendo el CSV");
    out(500, ['ok' => false, 'error' => 'guardar']);
}
$log("$ref | apuntada | " . sr_fmt_rp($q['total_idr']));

// ── 6. Avisos ──────────────────────────────────────────────────────
$e      = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$total  = sr_fmt_rp($q['total_idr']);
$nDays  = $q['days'] . ($es ? ($q['days'] === 1 ? ' día' : ' días') : ($q['days'] === 1 ? ' day' : ' days'));
$protEs = $q['protection'] === 'deposit'
    ? 'Depósito reembolsable ' . sr_fmt_rp($q['deposit_idr']) . ' (se devuelve)'
    : 'Seguro (no reembolsable)';
$dropEs = $q['dropoff'] === 'waingapu' ? 'Waingapu (un solo sentido)' : 'El mismo sitio que la recogida';
$waCli  = 'https://wa.me/' . $phoneDigits;

$tg = "\u{1F4B5} <b>Reserva EN EFECTIVO — " . $e($ref) . "</b>\n"
    . "<b>SIN COBRAR · SIN CONFIRMAR</b>\n"
    . 'Cobrar ' . $e($total) . ' en el aeropuerto · ' . $e($q['bike_name']) . ' ×' . $q['qty'] . ' · ' . $q['days'] . " días\n"
    . "\n"
    . "\u{1F4C5} " . $e(sr_fmt_date($q['from'], true)) . ' → ' . $e(sr_fmt_date($q['to'], true)) . "\n"
    . "\u{1F4CD} Tambolaka Airport → " . $e($dropEs) . "\n"
    . "\u{1F6E1} " . $e($protEs) . "\n"
    . "\n"
    . "\u{1F464} " . $e($name) . "\n"
    . "\u{2709} " . $e($email) . "\n"
    . "\u{1F4DE} " . $e($phone) . "\n"
    . "\n"
    . "\u{26A0} Confírmala por WhatsApp antes de apartar la moto: " . $e($waCli);
list($sentTg, $respTg) = sr_telegram($cfg, $tg);

$rowsHtml = function ($rows) use ($e) {
    $o = '';
    foreach ($rows as $r) {
        $o .= '<tr><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:13px;color:#5b6f78;vertical-align:top;width:42%">' . $e($r[0]) . '</td>'
            . '<td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:14px;color:#1b2b33;font-weight:600">' . $e($r[1]) . '</td></tr>';
    }
    return $o;
};

$ownerHtml = '<!DOCTYPE html><html><body style="margin:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#1b2b33">
<div style="max-width:560px;margin:0 auto;padding:28px 24px">
  <h1 style="font-size:21px;margin:0 0 4px">Reserva en efectivo — SIN COBRAR — ' . $e($ref) . '</h1>
  <p style="font-size:14px;color:#41606b;margin:0 0 20px">Cobrar ' . $e($total) . ' en el aeropuerto &middot; ' . $e($q['bike_name']) . ' × ' . $q['qty'] . ' &middot; ' . $q['days'] . ' días</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 20px">' . $rowsHtml([
    ['Referencia', $ref],
    ['Moto', $q['bike_name'] . ' × ' . $q['qty']],
    ['Recogida', sr_fmt_date($q['from'], true) . ' — Tambolaka Airport'],
    ['Devolución', sr_fmt_date($q['to'], true) . ' — ' . $dropEs],
    ['Duración', $q['days'] . ' días'],
    ['Protección', $protEs],
    ['A cobrar en efectivo', $total],
    ['Cliente', $name],
    ['Email', $email],
    ['Teléfono / WhatsApp', $phone],
  ]) . '</table>
  <p style="font-size:13px;color:#41606b;line-height:1.6"><strong>Sin pagar y sin confirmar.</strong> Escríbele por WhatsApp para confirmar y pedir el vuelo antes de apartar la moto: <a href="' . $e($waCli) . '">' . $e($phone) . '</a>. Al cobrar, marca la fila en bookings.csv (estado_cobro = cobrado).</p>
</div></body></html>';

// Email al cliente: sin ningun texto libre salvo el nombre (recortado a la primera
// palabra). Asi no sirve para mandar mensajes ajenos con nuestra marca.
$first = mb_substr(explode(' ', $name)[0], 0, 30);
$L = $es ? [
    'subj' => 'Hemos recibido tu reserva en Sumba — ' . $ref,
    'eye'  => 'Reserva recibida', 'h1' => 'Tu reserva está apuntada',
    'intro'=> 'Pagas <strong>' . $e($total) . ' en efectivo</strong> (rupias) al recoger la moto en Tambolaka Airport. Te escribimos por WhatsApp para confirmarla y pedirte el número de vuelo.',
    'dep'  => $q['protection'] === 'deposit' ? ' El depósito de ' . $e(sr_fmt_rp($q['deposit_idr'])) . ' se te devuelve al entregar la moto sin daños.' : '',
    'docs' => 'Trae tu <strong>pasaporte y tu carné de conducir</strong> (recomendamos el permiso internacional). Si no has reservado tú, ignora este email.',
    'rows' => [['Referencia', $ref], ['Moto', $q['bike_name'] . ' × ' . $q['qty']], ['Recogida', sr_fmt_date($q['from'], true) . ' — Tambolaka Airport'],
               ['Devolución', sr_fmt_date($q['to'], true)], ['Duración', $nDays], ['A pagar en efectivo', $total]],
    'bye'  => 'Nos vemos en Sumba,<br>El equipo de Sumba Rental &middot; by Bali Best Motorcycle',
] : [
    'subj' => 'We have your Sumba booking — ' . $ref,
    'eye'  => 'Booking received', 'h1' => 'Your booking is in',
    'intro'=> 'You pay <strong>' . $e($total) . ' in cash</strong> (rupiah) when you pick up the bike at Tambolaka Airport. We will message you on WhatsApp to confirm it and ask for your flight number.',
    'dep'  => $q['protection'] === 'deposit' ? ' The ' . $e(sr_fmt_rp($q['deposit_idr'])) . ' deposit is returned when you bring the bike back undamaged.' : '',
    'docs' => 'Bring your <strong>passport and driving licence</strong> (an international permit is recommended). If you did not make this booking, just ignore this email.',
    'rows' => [['Reference', $ref], ['Motorbike', $q['bike_name'] . ' × ' . $q['qty']], ['Pick-up', sr_fmt_date($q['from']) . ' — Tambolaka Airport'],
               ['Return', sr_fmt_date($q['to'])], ['Duration', $nDays], ['To pay in cash', $total]],
    'bye'  => 'See you in Sumba,<br>The Sumba Rental team &middot; by Bali Best Motorcycle',
];
$clientHtml = '<!DOCTYPE html><html><body style="margin:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#1b2b33">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#3aa3b5;margin:0 0 6px;font-weight:bold">' . $L['eye'] . '</p>
  <h1 style="font-size:25px;margin:0 0 10px;color:#1b2b33">' . $L['h1'] . ', ' . $e($first) . '</h1>
  <p style="font-size:15px;line-height:1.6;color:#41606b;margin:0 0 24px">' . $L['intro'] . $L['dep'] . '</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px">' . $rowsHtml($L['rows']) . '</table>
  <p style="font-size:13px;color:#41606b;line-height:1.6">' . $L['docs'] . '</p>
  <p style="font-size:13px;color:#41606b;margin-top:24px">' . $L['bye'] . '</p>
</div></body></html>';

$sentOwner = false; $respOwner = 'owner_notify vacio';
if (!empty($cfg['owner_notify'])) {
    list($sentOwner, $respOwner) = sr_smtp_send($cfg, $cfg['owner_notify'],
        'Reserva EFECTIVO (sin cobrar): ' . $q['bike_name'] . ' ×' . $q['qty'] . ', ' . sr_fmt_date($q['from'], true) . ' (' . $total . ')',
        $ownerHtml, $email);
}
list($sentClient, $respClient) = sr_smtp_send($cfg, $email, $L['subj'], $clientHtml, $cfg['owner_notify'] ?? '');

$log("$ref | telegram=" . ($sentTg ? 'ok' : 'FALLO: ' . $respTg) . ' | operador=' . ($sentOwner ? 'ok' : 'FALLO: ' . $respOwner)
   . ' | cliente=' . ($sentClient ? 'ok' : 'FALLO: ' . $respClient));

// Si el operador no se ha enterado por ninguna via, la reserva esta en el CSV pero
// nadie la va a mirar: se le dice al cliente que nos escriba, con su referencia.
if (!$sentTg && !$sentOwner) out(502, ['ok' => false, 'error' => 'aviso', 'ref' => $ref]);

out(200, ['ok' => true, 'ref' => $ref, 'total' => $q['total_idr']]);
