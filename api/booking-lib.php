<?php
/**
 * booking-lib.php — Sumba Rental Motorbike
 *
 * Lo que comparten los dos caminos de reserva: tarjeta (checkout.php -> Stripe)
 * y efectivo a la recogida (api/reserve-cash.php, desde el 25-sep-2026).
 *
 * Existe para que las reglas de precio y de fechas vivan en UN sitio de PHP. Con el
 * efectivo no hay Stripe que fije el importe: si cada endpoint validara a su manera,
 * el dia que uno se quede atras el operador cobraria en el aeropuerto una cifra que
 * no es la de la web. Tambien por eso sr_quote() NUNCA acepta un total del cliente.
 *
 * No lee $_GET/$_POST ni redirige: devuelve datos o un codigo de error, y cada
 * endpoint decide como responder (checkout.php redirige; reserve-cash.php, JSON).
 *
 * Protegido en api/.htaccess como mailer.php: es una libreria, no una URL.
 */

date_default_timezone_set('Asia/Makassar');   // hora de Sumba (WITA): "hoy" es el de Sumba

// Precios en IDR x 100 (IDR es 2-decimal en Stripe: 125.000 IDR = 12500000).
// ponytail: duplica src/data.js FLEET (price, insuranceDay) — si cambia un precio ahi,
// sincronizar aqui a mano. 25-sep-2026: BH-G3 200k -> 125k/dia y su seguro 100k -> 50k
// (el seguro pasa a ir por moto; la CB150X sigue en 300k + 100k).
const SR_BIKES = [
    'motorbike' => ['name' => 'BH Custom BH-G3', 'day' => 12500000, 'insurance_day' => 5000000],
    'cb150x'    => ['name' => 'Honda CB150X',    'day' => 30000000, 'insurance_day' => 10000000],
];
const SR_DEPOSIT_FLAT  = 300000000; // Rp 3.000.000 fijo por moto, reembolsable
const SR_DROPOFF       = ['waingapu' => 100000000]; // Rp 1.000.000 por moto, un solo sentido
const SR_MAX_QTY       = 6;
const SR_MAX_DAYS      = 90;
// Antelacion minima para la recogida: las motos se preparan a mano y hace falta un
// dia por delante. Subirlo = cambiar este 1 y el MIN_LEAD_DAYS de index.html.
const SR_MIN_LEAD_DAYS = 1;

/**
 * Valida una reserva y calcula su importe. $in: from, to, qty, bike, protection, retLoc.
 * Devuelve [true, $quote] o [false, 'fechas'|'antelacion'].
 * Los dias se derivan de from/to, nunca del cliente (antes venian en ?days= y se
 * podia pagar 1 dia por una reserva de 30). Fecha invalida => se rechaza, no se ajusta.
 */
function sr_quote(array $in) {
    $qty  = max(1, min((int)($in['qty'] ?? 1), SR_MAX_QTY));
    $from = preg_replace('/[^0-9\-]/', '', (string)($in['from'] ?? ''));
    $to   = preg_replace('/[^0-9\-]/', '', (string)($in['to'] ?? ''));

    $d0 = DateTime::createFromFormat('!Y-m-d', $from);
    $d1 = DateTime::createFromFormat('!Y-m-d', $to);
    if (!$d0 || !$d1 || $d0->format('Y-m-d') !== $from || $d1->format('Y-m-d') !== $to || $d1 <= $d0) {
        return [false, 'fechas'];
    }
    $days = (int)$d0->diff($d1)->days;
    if ($days > SR_MAX_DAYS) return [false, 'fechas'];

    $minPickup = (new DateTime('today'))->modify('+' . SR_MIN_LEAD_DAYS . ' day');
    if ($d0 < $minPickup) return [false, 'antelacion'];

    $bikeId = (string)($in['bike'] ?? 'motorbike');
    if (!array_key_exists($bikeId, SR_BIKES)) $bikeId = 'motorbike';
    $bike = SR_BIKES[$bikeId];

    $protection = ($in['protection'] ?? 'insurance') === 'deposit' ? 'deposit' : 'insurance';
    $retLoc     = (string)($in['retLoc'] ?? '');
    $hasDropoff = array_key_exists($retLoc, SR_DROPOFF);

    $protUnit  = $protection === 'deposit' ? SR_DEPOSIT_FLAT : $bike['insurance_day'];
    $protUnits = $protection === 'deposit' ? $qty : $days * $qty;
    $dropUnit  = $hasDropoff ? SR_DROPOFF[$retLoc] : 0;

    $rental100  = $bike['day'] * $days * $qty;
    $prot100    = $protUnit * $protUnits;
    $dropoff100 = $dropUnit * $qty;

    return [true, [
        'from' => $from, 'to' => $to, 'days' => $days, 'qty' => $qty,
        'bike' => $bikeId, 'bike_name' => $bike['name'], 'bike_day' => $bike['day'],
        'protection' => $protection, 'prot_unit' => $protUnit, 'prot_units' => $protUnits,
        'dropoff' => $hasDropoff ? $retLoc : '', 'dropoff_unit' => $dropUnit,
        // Importes en IDR reales (sin el x100 de Stripe)
        'rental_idr'  => intdiv($rental100, 100),
        'prot_idr'    => intdiv($prot100, 100),
        'dropoff_idr' => intdiv($dropoff100, 100),
        'total_idr'   => intdiv($rental100 + $prot100 + $dropoff100, 100),
        // Lo que es fianza a devolver, no ingreso (en efectivo son billetes que vuelven)
        'deposit_idr' => $protection === 'deposit' ? intdiv($prot100, 100) : 0,
    ]];
}

/**
 * Una celda de CSV que no se ejecuta al abrirla en Excel/Sheets. Con Stripe el
 * nombre lo ponia Stripe; con el efectivo lo teclea quien quiera, y un nombre como
 * =HYPERLINK(...) se ejecutaria en el ordenador del operador. Se aplica a los dos
 * caminos porque tambien cubre la metadata y los UTM.
 */
function sr_csv_cell($v) {
    $v = (string)$v;
    if ($v !== '' && strpos("=+-@\t\r", $v[0]) !== false) $v = "'" . $v;
    return '"' . str_replace('"', '""', $v) . '"';
}

const SR_CSV_HEADER = "fecha,ref,session,email,nombre,telefono,moto,qty,dias,desde,hasta,proteccion,dropoff,total_idr,utm_source,utm_campaign,gclid,fbclid,pago,estado_cobro,deposito_idr,fecha_cobro\n";

/**
 * Apunta una reserva. Las 4 ultimas columnas (pago, estado_cobro, deposito_idr,
 * fecha_cobro) entraron el 25-sep-2026: un CSV creado antes conserva su cabecera de
 * 18 columnas y las filas nuevas traen 4 mas al final — no se reescribe el fichero
 * para no arriesgar las filas viejas. estado_cobro/fecha_cobro se tocan a mano.
 */
function sr_append_booking($csv, array $row) {
    if (!file_exists($csv)) @file_put_contents($csv, SR_CSV_HEADER, LOCK_EX);
    $line = implode(',', array_map('sr_csv_cell', $row)) . "\n";
    return @file_put_contents($csv, $line, FILE_APPEND | LOCK_EX) !== false;
}

/**
 * Aviso instantaneo por Telegram. Best-effort: si falla no cambia la respuesta. La
 * guarda function_exists es para poder sustituirlo por un doble al probar.
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

function sr_fmt_rp($n) { return 'Rp ' . number_format((int)$n, 0, ',', '.'); }

function sr_fmt_date($iso, $spanish = false) {
    $d = DateTime::createFromFormat('!Y-m-d', (string)$iso);
    if (!$d) return (string)$iso;
    if (!$spanish) return $d->format('D j M Y');
    $dd = ['Mon' => 'lun', 'Tue' => 'mar', 'Wed' => 'mié', 'Thu' => 'jue', 'Fri' => 'vie', 'Sat' => 'sáb', 'Sun' => 'dom'];
    $mm = ['Jan' => 'ene', 'Feb' => 'feb', 'Mar' => 'mar', 'Apr' => 'abr', 'May' => 'may', 'Jun' => 'jun',
           'Jul' => 'jul', 'Aug' => 'ago', 'Sep' => 'sep', 'Oct' => 'oct', 'Nov' => 'nov', 'Dec' => 'dic'];
    return $dd[$d->format('D')] . ' ' . $d->format('j') . ' ' . $mm[$d->format('M')] . ' ' . $d->format('Y');
}
