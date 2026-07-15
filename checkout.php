<?php
// ── Sumba Rental Motorbike — Stripe Checkout Session ──────────────
// La clave secreta vive en /private/sumba-config.php, FUERA de public_html.
// Este archivo nunca contiene credenciales.
$config_path = __DIR__ . '/private/sumba-config.php';
if (!file_exists($config_path)) {
    http_response_code(500);
    exit('Server configuration error. Contact the site administrator.');
}
require_once $config_path;
// private/sumba-config.php define: STRIPE_SECRET, SUCCESS_URL, CANCEL_URL

// Precio por moto y protección, en IDR × 100 (IDR es 2-decimal en Stripe).
// ponytail: duplica src/data.js FLEET/PROTECTION — si cambia un precio ahí, sincronizar aquí a mano.
define('BIKE_PRICES', [
    'motorbike' => 20000000, // BH Custom BH-G3 — 200.000 IDR/día
    'cb150x'    => 30000000, // Honda CB150X    — 300.000 IDR/día
]);
define('BIKE_NAMES', [
    'motorbike' => 'BH Custom BH-G3',
    'cb150x'    => 'Honda CB150X',
]);
define('INSURANCE_PRICE_DAY', 10000000);  // 100.000 IDR/día por moto, no reembolsable
define('DEPOSIT_PRICE_FLAT',  300000000); // Rp 3.000.000 fijo por moto, reembolsable
define('MAX_QTY',   6);
define('MAX_DAYS',  90);

// ── Validar parámetros entrantes ───────────────────────────────────
$days  = max(1, min((int)($_GET['days'] ?? 1), MAX_DAYS));
$qty   = max(1, min((int)($_GET['qty']  ?? 1), MAX_QTY));
$from  = preg_replace('/[^0-9\-]/', '', $_GET['from'] ?? '');
$to    = preg_replace('/[^0-9\-]/', '', $_GET['to']   ?? '');

$bikeId = $_GET['bike'] ?? 'motorbike';
if (!array_key_exists($bikeId, BIKE_PRICES)) $bikeId = 'motorbike';

$protection = ($_GET['protection'] ?? 'insurance') === 'deposit' ? 'deposit' : 'insurance';

// UTM tracking — limpiar y limitar longitud
$utm_source   = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_source']   ?? ''), 0, 100);
$utm_medium   = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_medium']   ?? ''), 0, 100);
$utm_campaign = substr(preg_replace('/[^a-zA-Z0-9_\-. ]/', '', $_GET['utm_campaign'] ?? ''), 0, 200);
$utm_content  = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_content']  ?? ''), 0, 100);
$fbclid       = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['fbclid']       ?? ''), 0, 250);

$bikePrice = BIKE_PRICES[$bikeId];
$bikeUnits = $days * $qty;

$protUnitPrice = $protection === 'deposit' ? DEPOSIT_PRICE_FLAT : INSURANCE_PRICE_DAY;
$protUnits     = $protection === 'deposit' ? $qty : $days * $qty;
$protName      = $protection === 'deposit' ? 'Refundable Deposit' : 'Insurance Fee';
$protDesc      = $protection === 'deposit'
    ? $qty . ' moto' . ($qty > 1 ? 's' : '') . ' × Rp 3.000.000 (reembolsable al terminar el alquiler)'
    : $days . ' día' . ($days > 1 ? 's' : '') . ' × ' . $qty . ' moto' . ($qty > 1 ? 's' : '') . ' (no reembolsable)';

$description = $qty . ' moto' . ($qty > 1 ? 's' : '') . ' × ' . $days . ' día' . ($days > 1 ? 's' : '');

// ── Conversión Google Ads en el PAGO COMPLETADO ───────────────────
// Devolvemos a la web con el total real (calculado en servidor, no manipulable)
// + un id de transacción para que Ads deduplique refrescos. El front lee
// ?paid=1 al cargar y dispara la conversión (ver script en <head> de index.html).
$total_idr   = ($bikeUnits * $bikePrice + $protUnits * $protUnitPrice) / 100; // total en IDR reales
$txid        = $from . '-' . $to . '-' . $qty . '-' . time();
$success_url = SUCCESS_URL
             . (strpos(SUCCESS_URL, '?') === false ? '?' : '&')
             . 'paid=1&value=' . $total_idr . '&cur=IDR&tx=' . rawurlencode($txid)
             . '&session_id={CHECKOUT_SESSION_ID}';

// ── Crear Checkout Session via Stripe API ──────────────────────────
$data = [
  'line_items[0][price_data][currency]'                  => 'idr',
  'line_items[0][price_data][unit_amount]'               => $bikePrice,
  'line_items[0][price_data][product_data][name]'        => BIKE_NAMES[$bikeId],
  'line_items[0][price_data][product_data][description]' => $description,
  'line_items[0][quantity]'                              => $bikeUnits,
  'line_items[1][price_data][currency]'                  => 'idr',
  'line_items[1][price_data][unit_amount]'               => $protUnitPrice,
  'line_items[1][price_data][product_data][name]'        => $protName,
  'line_items[1][price_data][product_data][description]' => $protDesc,
  'line_items[1][quantity]'                              => $protUnits,
  'mode'                                                 => 'payment',
  'success_url'                                          => $success_url,
  'cancel_url'                                           => CANCEL_URL,
  'metadata[bike]'                                       => $bikeId,
  'metadata[motos]'                                      => $qty,
  'metadata[dias]'                                       => $days,
  'metadata[fecha_ini]'                                  => $from,
  'metadata[fecha_fin]'                                  => $to,
  'metadata[proteccion]'                                 => $protection,
  'metadata[ubicacion]'                                  => 'Bandar Udara Lede Kalumbang',
  'metadata[total_idr]'                                  => $total_idr,
];

// Añadir UTM si están presentes
if ($utm_source)   $data['metadata[utm_source]']   = $utm_source;
if ($utm_medium)   $data['metadata[utm_medium]']   = $utm_medium;
if ($utm_campaign) $data['metadata[utm_campaign]'] = $utm_campaign;
if ($utm_content)  $data['metadata[utm_content]']  = $utm_content;
if ($fbclid)       $data['metadata[fbclid]']       = $fbclid;

$payload = http_build_query($data);

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_HTTPHEADER     => [
    'Authorization: Bearer ' . STRIPE_SECRET,
    'Content-Type: application/x-www-form-urlencoded',
    'Stripe-Version: 2024-06-20',
  ],
]);

$body = curl_exec($ch);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    header('Location: ' . CANCEL_URL . '?error=conexion', true, 303);
    exit;
}

$session = json_decode($body, true);

if (!empty($session['url'])) {
    header('Location: ' . $session['url'], true, 303);
    exit;
}

$code = $session['error']['code'] ?? 'unknown';
header('Location: ' . CANCEL_URL . '?error=' . rawurlencode($code), true, 303);
exit;
