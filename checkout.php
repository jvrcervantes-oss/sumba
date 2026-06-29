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

define('PRICE_IDR', 20000000); // 200.000 IDR/día × 100 (IDR es 2-decimal en Stripe)
define('MAX_QTY',   6);
define('MAX_DAYS',  90);

// ── Validar parámetros entrantes ───────────────────────────────────
$days = max(1, min((int)($_GET['days'] ?? 1), MAX_DAYS));
$qty  = max(1, min((int)($_GET['qty']  ?? 1), MAX_QTY));
$from = preg_replace('/[^0-9\-]/', '', $_GET['from'] ?? '');
$to   = preg_replace('/[^0-9\-]/', '', $_GET['to']   ?? '');

// UTM tracking — limpiar y limitar longitud
$utm_source   = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_source']   ?? ''), 0, 100);
$utm_medium   = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_medium']   ?? ''), 0, 100);
$utm_campaign = substr(preg_replace('/[^a-zA-Z0-9_\-. ]/', '', $_GET['utm_campaign'] ?? ''), 0, 200);
$utm_content  = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_content']  ?? ''), 0, 100);
$fbclid       = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['fbclid']       ?? ''), 0, 250);

$units       = $days * $qty;
$description = $qty . ' moto' . ($qty > 1 ? 's' : '') . ' × ' . $days . ' día' . ($days > 1 ? 's' : '');

// ── Crear Checkout Session via Stripe API ──────────────────────────
$data = [
  'line_items[0][price_data][currency]'                  => 'idr',
  'line_items[0][price_data][unit_amount]'               => PRICE_IDR,
  'line_items[0][price_data][product_data][name]'        => 'Sumba Rental Motorbike',
  'line_items[0][price_data][product_data][description]' => $description,
  'line_items[0][quantity]'                              => $units,
  'mode'                                                 => 'payment',
  'success_url'                                          => SUCCESS_URL,
  'cancel_url'                                           => CANCEL_URL,
  'metadata[motos]'                                      => $qty,
  'metadata[dias]'                                       => $days,
  'metadata[fecha_ini]'                                  => $from,
  'metadata[fecha_fin]'                                  => $to,
  'metadata[ubicacion]'                                  => 'Bandar Udara Lede Kalumbang',
  'metadata[total_idr]'                                  => $units * PRICE_IDR / 100,
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
