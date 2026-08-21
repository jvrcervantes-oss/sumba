<?php
/**
 * stripe-webhook.php — Sumba Rental Motorbike
 *
 * Stripe avisa aqui cuando un pago se COMPLETA (checkout.session.completed).
 * Hasta el 21-ago-2026 no existia: se cobraba y no se enteraba nadie — ni el
 * cliente recibia confirmacion ni el operador aviso. Todo vivia solo en el
 * panel de Stripe.
 *
 * Hace tres cosas, en este orden y por ese motivo:
 *   1. Apunta la reserva en private/bookings.csv  <- lo duradero va PRIMERO.
 *      Si luego falla el SMTP, la venta no se pierde: esta en disco.
 *   2. Email de confirmacion al cliente (fechas, moto, total, que hacer ahora).
 *   3. Aviso al operador con todos los datos + el email/telefono del cliente.
 *
 * Config y secretos en  private/sumba-mail-config.php  (fuera del repo).
 * Alta del endpoint: Stripe > Developers > Webhooks > checkout.session.completed
 *   URL: https://sumba.balibestmotorcycle.com/api/stripe-webhook.php
 */

date_default_timezone_set('Asia/Makassar');   // hora de Sumba (WITA), no UTC

require_once __DIR__ . '/mailer.php';

$cfgFile = dirname(__DIR__) . '/private/sumba-mail-config.php';
if (!file_exists($cfgFile)) {
    http_response_code(500);
    exit('not configured');
}
$cfg = require $cfgFile;

$logFile = dirname(__DIR__) . '/private/stripe-webhook.log';
function sr_log($msg) {
    global $logFile;
    @file_put_contents($logFile, date('c') . ' | ' . $msg . "\n", FILE_APPEND | LOCK_EX);
}

/**
 * Aviso instantaneo por Telegram. Best-effort a proposito: si falla no se
 * reintenta ni cambia la respuesta a Stripe — el registro serio son el CSV y
 * el email. Esto es para ENTERARSE rapido, no para dejar constancia.
 *
 * La guarda function_exists es para poder sustituirlo por un doble al probar.
 */
if (!function_exists('sr_telegram')):
function sr_telegram($cfg, $text) {
    if (empty($cfg['telegram_token']) || empty($cfg['telegram_chat_id'])) {
        return [false, 'sin configurar'];
    }
    $ch = curl_init('https://api.telegram.org/bot' . $cfg['telegram_token'] . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'chat_id'                  => $cfg['telegram_chat_id'],
            'text'                     => $text,
            'parse_mode'               => 'HTML',
            'disable_web_page_preview' => true,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code === 200, 'http=' . $code . ' ' . substr((string)$resp, 0, 160)];
}
endif;

// ── 1. Verificar la firma ANTES de creer nada ──────────────────────
// Sin esto, cualquiera que sepa la URL puede inventarse una reserva pagada.
// Formato de la cabecera:  t=1712345678,v1=<hmac>,v1=<hmac de la clave rotada>
$payload = file_get_contents('php://input');
$sigHdr  = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$secret  = $cfg['webhook_secret'] ?? '';

if ($secret === '' || strpos($secret, 'whsec_') !== 0) {
    sr_log('RECHAZADO: webhook_secret sin configurar');
    http_response_code(500);
    exit('not configured');
}

$ts = 0; $sigs = [];
foreach (explode(',', $sigHdr) as $part) {
    $kv = explode('=', trim($part), 2);
    if (count($kv) !== 2) continue;
    if ($kv[0] === 't')  $ts = (int)$kv[1];
    if ($kv[0] === 'v1') $sigs[] = $kv[1];
}

// Tolerancia 300 s (la de Stripe por defecto): frena el replay de una peticion
// capturada. Nunca 0 — el reloj del servidor no va clavado al de Stripe.
if (!$ts || abs(time() - $ts) > 300) {
    sr_log('RECHAZADO: timestamp fuera de tolerancia (t=' . $ts . ')');
    http_response_code(400);
    exit('bad signature');
}

$expected = hash_hmac('sha256', $ts . '.' . $payload, $secret);
$ok = false;
foreach ($sigs as $s) { if (hash_equals($expected, $s)) { $ok = true; break; } }
if (!$ok) {
    sr_log('RECHAZADO: firma no coincide');
    http_response_code(400);
    exit('bad signature');
}

// ── 2. Quedarnos solo con lo que nos interesa ──────────────────────
$event = json_decode($payload, true);
$type  = $event['type'] ?? '';
if ($type !== 'checkout.session.completed') {
    http_response_code(200);
    exit('ignored');
}

$s = $event['data']['object'] ?? [];
$sid = $s['id'] ?? '';
if (!$sid) { http_response_code(200); exit('ignored'); }

// Una sesion completada pero sin pagar (pago diferido) no es una reserva.
if (($s['payment_status'] ?? '') !== 'paid') {
    sr_log("$sid | ignorado: payment_status=" . ($s['payment_status'] ?? '?'));
    http_response_code(200);
    exit('ignored');
}

// ── 3. Idempotencia ────────────────────────────────────────────────
// Stripe reintenta si no contestamos 2xx, y puede entregar el mismo evento
// dos veces. Dos marcas separadas a proposito: si el CSV ya esta escrito no
// lo duplicamos, pero si los emails fallaron SI se reintentan en la reentrega.
$markLogged = dirname(__DIR__) . '/private/stripe-logged.log';
$markMailed = dirname(__DIR__) . '/private/stripe-mailed.log';
$seen = function ($file, $id) {
    return file_exists($file) && strpos((string)@file_get_contents($file), $id) !== false;
};
$mark = function ($file, $id) { @file_put_contents($file, $id . "\n", FILE_APPEND | LOCK_EX); };

// ── 4. Datos de la reserva ─────────────────────────────────────────
$m = $s['metadata'] ?? [];
$cd = $s['customer_details'] ?? [];

// ponytail: duplica BIKE_NAMES de checkout.php y FLEET de src/data.js.
// Si entra una moto nueva hay que anadirla en los tres sitios.
$BIKE_NAMES = [
    'motorbike' => 'BH Custom BH-G3',
    'cb150x'    => 'Honda CB150X',
];

$bikeId   = $m['bike'] ?? '';
$bikeName = $BIKE_NAMES[$bikeId] ?? ($bikeId ?: 'Motorbike');
$qty      = (int)($m['motos'] ?? 1);
$days     = (int)($m['dias'] ?? 0);
$from     = $m['fecha_ini'] ?? '';
$to       = $m['fecha_fin'] ?? '';
$prot     = $m['proteccion'] ?? '';
$pickup   = $m['ubicacion'] ?? 'Tambolaka Airport';
$dropoff  = $m['dropoff'] ?? '';

// Idioma en el que reservo el cliente (lo manda checkout.php en la metadata).
// El email del cliente sale en SU idioma; el del operador, siempre en castellano.
$es = ($m['lang'] ?? 'en') === 'es';

// El importe autoritativo es el que cobro Stripe, no la metadata que enviamos.
// IDR es 2-decimal en Stripe: amount_total viene x100.
$totalIdr = isset($s['amount_total']) ? (int)round($s['amount_total'] / 100) : (int)($m['total_idr'] ?? 0);

$email = $cd['email'] ?? '';
$name  = trim((string)($cd['name'] ?? ''));
$phone = $cd['phone'] ?? '';

$ref = 'SR-' . strtoupper(substr($sid, -8));

$fmtRp   = fn($n) => 'Rp ' . number_format($n, 0, ',', '.');
$fmtDate = function ($iso, $spanish = false) {
    $d = DateTime::createFromFormat('!Y-m-d', (string)$iso);
    if (!$d) return (string)$iso;
    if (!$spanish) return $d->format('D j M Y');
    // DateTime formatea siempre en ingles: para el castellano, tabla y punto.
    $dd = ['Mon' => 'lun', 'Tue' => 'mar', 'Wed' => 'mié', 'Thu' => 'jue', 'Fri' => 'vie', 'Sat' => 'sáb', 'Sun' => 'dom'];
    $mm = ['Jan' => 'ene', 'Feb' => 'feb', 'Mar' => 'mar', 'Apr' => 'abr', 'May' => 'may', 'Jun' => 'jun',
           'Jul' => 'jul', 'Aug' => 'ago', 'Sep' => 'sep', 'Oct' => 'oct', 'Nov' => 'nov', 'Dec' => 'dic'];
    return $dd[$d->format('D')] . ' ' . $d->format('j') . ' ' . $mm[$d->format('M')] . ' ' . $d->format('Y');
};
$protLabel = $prot === 'deposit'
    ? ($es ? 'Depósito reembolsable (' . $fmtRp(3000000) . ' por moto, se devuelve al entregar la moto sin daños)'
           : 'Refundable deposit (' . $fmtRp(3000000) . ' per bike, returned when you bring the bike back undamaged)')
    : ($es ? 'Seguro (no reembolsable)' : 'Insurance fee (non-refundable)');
$dropoffLabel = $dropoff === 'waingapu'
    ? ($es ? 'Waingapu (entrega en un solo sentido)' : 'Waingapu (one-way drop-off)')
    : ($es ? 'El mismo sitio que la recogida' : 'Same place as pick-up');
$protLabelEs = $prot === 'deposit' ? 'Depósito reembolsable' : 'Seguro (no reembolsable)';
$dropoffLabelEs = $dropoff === 'waingapu' ? 'Waingapu (un solo sentido)' : 'El mismo sitio que la recogida';

// ── 5. Apuntar la reserva (lo duradero primero) ────────────────────
$csv = $cfg['bookings_csv'] ?? (dirname(__DIR__) . '/private/bookings.csv');
if (!$seen($markLogged, $sid)) {
    if (!file_exists($csv)) {
        @file_put_contents($csv, "fecha,ref,session,email,nombre,telefono,moto,qty,dias,desde,hasta,proteccion,dropoff,total_idr,utm_source,utm_campaign,gclid,fbclid\n", LOCK_EX);
    }
    $row = [date('c'), $ref, $sid, $email, $name, $phone, $bikeName, $qty, $days, $from, $to, $prot,
            $dropoff, $totalIdr, $m['utm_source'] ?? '', $m['utm_campaign'] ?? '', $m['gclid'] ?? '', $m['fbclid'] ?? ''];
    $line = '"' . implode('","', array_map(fn($v) => str_replace('"', '""', (string)$v), $row)) . "\"\n";
    @file_put_contents($csv, $line, FILE_APPEND | LOCK_EX);
    $mark($markLogged, $sid);
    sr_log("$sid | $ref | apuntado en CSV | $email | " . $fmtRp($totalIdr));
}

// ── 6. Emails ──────────────────────────────────────────────────────
if ($seen($markMailed, $sid)) {
    http_response_code(200);
    exit('duplicate');
}

$wa      = $cfg['whatsapp'] ?? '62881037978255';
$site    = rtrim($cfg['site_url'] ?? 'https://sumba.balibestmotorcycle.com', '/');
$waLink  = 'https://wa.me/' . $wa . '?text=' . rawurlencode($es
    ? "\u{a1}Hola! Mi referencia de reserva es $ref. Estos son los datos de mi vuelo:"
    : "Hi! My booking reference is $ref. Here are my flight details:");

$e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');

$rowsToHtml = function ($rows) use ($e) {
    $out = '';
    foreach ($rows as $r) {
        $out .= '<tr>'
          . '<td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:13px;color:#5b6f78;vertical-align:top;width:42%">' . $e($r[0]) . '</td>'
          . '<td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:14px;color:#1b2b33;font-weight:600">' . $e($r[1]) . '</td>'
          . '</tr>';
    }
    return $out;
};

$rowsClient = $es ? [
    ['Referencia',   $ref],
    ['Moto',         $bikeName . ' × ' . $qty],
    ['Recogida',     $fmtDate($from, true) . ' — ' . $pickup],
    ['Devolución',   $fmtDate($to, true) . ' — ' . $dropoffLabel],
    ['Duración',     $days . ' día' . ($days === 1 ? '' : 's')],
    ['Protección',   $protLabel],
    ['Total pagado', $fmtRp($totalIdr)],
] : [
    ['Booking reference', $ref],
    ['Motorbike',         $bikeName . ' × ' . $qty],
    ['Pick-up',           $fmtDate($from) . ' — ' . $pickup],
    ['Return',            $fmtDate($to) . ' — ' . $dropoffLabel],
    ['Duration',          $days . ' day' . ($days === 1 ? '' : 's')],
    ['Protection',        $protLabel],
    ['Total paid',        $fmtRp($totalIdr)],
];
$rowsOwner = [
    ['Referencia',   $ref],
    ['Moto',         $bikeName . ' × ' . $qty],
    ['Recogida',     $fmtDate($from, true) . ' — ' . $pickup],
    ['Devolución',   $fmtDate($to, true) . ' — ' . $dropoffLabelEs],
    ['Duración',     $days . ' día' . ($days === 1 ? '' : 's')],
    ['Protección',   $protLabelEs],
    ['Total cobrado', $fmtRp($totalIdr)],
];
$rowsHtml      = $rowsToHtml($rowsClient);
$rowsOwnerHtml = $rowsToHtml($rowsOwner);

// Textos del email del cliente. Un solo sitio para las dos versiones: si se
// toca una frase, se ve al lado la otra y no se quedan descuadradas.
$L = $es ? [
    'eyebrow' => 'Reserva confirmada',
    'h1'      => 'Tu moto está reservada',
    'intro'   => 'Hemos recibido tu pago. Te esperamos en <strong>' . $e($pickup) . '</strong> con la moto lista para salir.',
    'needT'   => 'Nos falta una cosa:',
    'needB'   => 'mándanos tu <strong>número de vuelo y la hora de llegada</strong> para estar esperándote en el momento justo. Son diez segundos por WhatsApp.',
    'cta'     => 'Enviar los datos de mi vuelo',
    'docs'    => 'Trae tu <strong>pasaporte y tu carné de conducir</strong> (recomendamos el permiso internacional). Cualquier duda, responde a este email — lo lee una persona.',
    'bye'     => 'Nos vemos en Sumba,',
    'team'    => 'El equipo de Sumba Rental &middot; by Bali Best Motorcycle',
    'foot'    => 'Recibes este email porque has reservado en',
    'footRef' => 'Referencia',
] : [
    'eyebrow' => 'Booking confirmed',
    'h1'      => 'Your bike is booked',
    'intro'   => 'We have received your payment. We will meet you at <strong>' . $e($pickup) . '</strong> with the bike ready to ride.',
    'needT'   => 'One thing we still need:',
    'needB'   => 'send us your <strong>flight number and arrival time</strong> so we are waiting for you at the right moment. It takes ten seconds on WhatsApp.',
    'cta'     => 'Send my flight details',
    'docs'    => 'Bring your <strong>passport and driving licence</strong> (an international permit is recommended). Any question, just reply to this email — it reaches a real person.',
    'bye'     => 'See you in Sumba,',
    'team'    => 'The Sumba Rental team &middot; by Bali Best Motorcycle',
    'foot'    => 'You received this because you booked at',
    'footRef' => 'Reference',
];

$clientHtml = '<!DOCTYPE html><html><body style="margin:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#1b2b33">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#3aa3b5;margin:0 0 6px;font-weight:bold">' . $L['eyebrow'] . '</p>
  <h1 style="font-size:25px;margin:0 0 10px;color:#1b2b33">' . $L['h1'] . ($name ? ', ' . $e(explode(' ', $name)[0]) : '') . ' 🏍️</h1>
  <p style="font-size:15px;line-height:1.6;color:#41606b;margin:0 0 24px">' . $L['intro'] . '</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px">' . $rowsHtml . '</table>
  <div style="background:#fff3ec;border-left:3px solid #e8734a;padding:14px 16px;border-radius:6px;margin:0 0 24px">
    <p style="margin:0;font-size:14px;line-height:1.6;color:#41606b"><strong style="color:#1b2b33">' . $L['needT'] . '</strong> ' . $L['needB'] . '</p>
  </div>
  <p style="margin:0 0 28px">
    <a href="' . $e($waLink) . '" style="background:#e8734a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-weight:bold;font-size:15px;display:inline-block">' . $L['cta'] . '</a>
  </p>
  <p style="font-size:13px;color:#41606b;line-height:1.6">' . $L['docs'] . '</p>
  <p style="font-size:13px;color:#41606b;margin-top:24px">' . $L['bye'] . '<br>' . $L['team'] . '</p>
  <hr style="border:none;border-top:1px solid #e6ded0;margin:24px 0">
  <p style="font-size:11px;color:#9aa5aa;line-height:1.6">' . $L['foot'] . ' <a href="' . $e($site) . '" style="color:#9aa5aa">sumba.balibestmotorcycle.com</a>. ' . $L['footRef'] . ' ' . $e($ref) . '.</p>
</div></body></html>';

$ownerHtml = '<!DOCTYPE html><html><body style="margin:0;background:#f8f3ea;font-family:Arial,Helvetica,sans-serif;color:#1b2b33">
<div style="max-width:560px;margin:0 auto;padding:28px 24px">
  <h1 style="font-size:21px;margin:0 0 4px">Nueva reserva pagada — ' . $e($ref) . '</h1>
  <p style="font-size:14px;color:#41606b;margin:0 0 20px">' . $e($fmtRp($totalIdr)) . ' &middot; ' . $e($bikeName) . ' × ' . $qty . ' &middot; ' . $e($days) . ' días</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 20px">' . $rowsOwnerHtml . '
    <tr><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:13px;color:#5b6f78">Cliente</td><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:14px;font-weight:600">' . $e($name ?: '—') . '</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:13px;color:#5b6f78">Email</td><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:14px;font-weight:600"><a href="mailto:' . $e($email) . '" style="color:#1b2b33">' . $e($email) . '</a></td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:13px;color:#5b6f78">Teléfono</td><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:14px;font-weight:600">' . $e($phone ?: '—') . '</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:13px;color:#5b6f78">Origen</td><td style="padding:9px 0;border-bottom:1px solid #e6ded0;font-size:14px;font-weight:600">' . $e(($m['utm_source'] ?? '') ?: 'directo') . ' / ' . $e(($m['utm_campaign'] ?? '') ?: '—') . '</td></tr>
    <tr><td style="padding:9px 0;font-size:13px;color:#5b6f78">Stripe</td><td style="padding:9px 0;font-size:12px;font-family:monospace">' . $e($sid) . '</td></tr>
  </table>
  <p style="font-size:13px;color:#41606b;line-height:1.6"><strong>Falta el número de vuelo.</strong> Al cliente se le ha pedido por email que lo mande por WhatsApp. Si no llega en un día, escríbele tú.</p>
</div></body></html>';

$subjClient = $es ? 'Tu moto en Sumba está reservada — ' . $ref : 'Your Sumba bike is booked — ' . $ref;
$subjOwner  = 'Nueva reserva Sumba: ' . $bikeName . ' ×' . $qty . ', ' . $fmtDate($from, true) . ' (' . $fmtRp($totalIdr) . ')';

// Telegram va primero: el email tarda lo que tarde el SMTP y esto llega al
// movil en un segundo. Si Stripe reentrega porque fallo el correo, se repetira
// el ping — un aviso duplicado es mucho mejor que uno perdido.
$tg = "\u{1F3CD} <b>Nueva reserva — " . $e($ref) . "</b>\n"
    . $e($fmtRp($totalIdr)) . ' · ' . $e($bikeName) . ' ×' . $qty . ' · ' . $days . ' días' . "\n"
    . "\n"
    . "\u{1F4C5} " . $e($fmtDate($from, true)) . ' → ' . $e($fmtDate($to, true)) . "\n"
    . "\u{1F4CD} " . $e($pickup) . ' → ' . $e($dropoffLabelEs) . "\n"
    . "\u{1F6E1} " . $e($protLabelEs) . "\n"
    . "\n"
    . "\u{1F464} " . $e($name ?: '—') . "\n"
    . "\u{2709} " . $e($email) . "\n"
    . "\u{1F4DE} " . $e($phone ?: 'NO LO HA DEJADO') . "\n"
    . "\n"
    . "\u{26A0} Falta el número de vuelo";
list($sentTg, $respTg) = sr_telegram($cfg, $tg);

$sentClient = false; $respClient = 'sin email de cliente';
if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // Reply-To al mismo buzon: si el cliente responde, la respuesta se lee.
    list($sentClient, $respClient) = sr_smtp_send($cfg, $email, $subjClient, $clientHtml, $cfg['owner_notify'] ?? '');
}

$sentOwner = false; $respOwner = 'owner_notify vacio';
if (!empty($cfg['owner_notify'])) {
    // Reply-To al cliente: contestar el aviso escribe directamente al viajero.
    list($sentOwner, $respOwner) = sr_smtp_send($cfg, $cfg['owner_notify'], $subjOwner, $ownerHtml, $email);
}

sr_log("$sid | $ref | cliente=" . ($sentClient ? 'ok' : 'FALLO: ' . $respClient)
     . ' | operador=' . ($sentOwner ? 'ok' : 'FALLO: ' . $respOwner)
     . ' | telegram=' . ($sentTg ? 'ok' : 'FALLO: ' . $respTg));

// Si no salio ninguno de los dos, devolvemos 500 a proposito: Stripe reentrega
// (hasta 3 dias) y en la reentrega solo se reintentan los emails, no el CSV.
// Un fallo de SMTP suele ser pasajero; darlo por bueno seria perder el aviso.
if (!$sentClient && !$sentOwner) {
    http_response_code(500);
    exit('mail failed');
}

$mark($markMailed, $sid);
http_response_code(200);
echo 'ok';
