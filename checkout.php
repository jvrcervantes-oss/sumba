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

// Precios, fechas, antelacion minima y zona horaria viven en api/booking-lib.php,
// compartidos con la reserva en efectivo (api/reserve-cash.php): un solo sitio
// para las reglas, que con dos caminos de reserva ya no podian ir duplicadas.
require_once __DIR__ . '/api/booking-lib.php';

// CANCEL_URL ya trae su propia query (?booking=cancel), asi que el separador no puede
// ser siempre '?': la URL salia como /?booking=cancel?error=fechas y el segundo '?' se
// queda dentro del valor => la web nunca veia el motivo del rechazo y el usuario volvia
// a la home sin explicacion. Un solo sitio para construirla, que son 4 los que la usan.
function cancel_to($code) {
    $sep = strpos(CANCEL_URL, '?') === false ? '?' : '&';
    header('Location: ' . CANCEL_URL . $sep . 'error=' . rawurlencode($code), true, 303);
    exit;
}

// ── Validar y calcular (en servidor; los dias salen de from/to, nunca de ?days=) ──
list($okQuote, $q) = sr_quote($_GET);
if (!$okQuote) cancel_to($q);   // 'fechas' o 'antelacion' (con su propio texto al cliente)

$qty        = $q['qty'];
$from       = $q['from'];
$to         = $q['to'];
$days       = $q['days'];
$bikeId     = $q['bike'];
$protection = $q['protection'];
$retLoc     = $q['dropoff'];
$hasDropoff = $retLoc !== '';
$dropoffFee = $q['dropoff_unit'];

// Idioma en el que el cliente ha reservado: viaja a metadata para que el email
// de confirmacion (api/stripe-webhook.php) salga en su idioma, no en el nuestro.
$lang = ($_GET['lang'] ?? 'en') === 'es' ? 'es' : 'en';

// UTM tracking — limpiar y limitar longitud
$utm_source   = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_source']   ?? ''), 0, 100);
$utm_medium   = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_medium']   ?? ''), 0, 100);
$utm_campaign = substr(preg_replace('/[^a-zA-Z0-9_\-. ]/', '', $_GET['utm_campaign'] ?? ''), 0, 200);
$utm_content  = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['utm_content']  ?? ''), 0, 100);
$fbclid       = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['fbclid']       ?? ''), 0, 250);
// gclid: el identificador de clic de Google Ads. Va a metadata para poder cruzar
// una reserva pagada con su anuncio aunque el navegador no vuelva de Stripe
// (la conversion de Ads se dispara en el front, en la vuelta: si el cliente cierra
// la pestana, la venta es real pero Ads no la ve).
$gclid        = substr(preg_replace('/[^a-zA-Z0-9_\-.]/',  '', $_GET['gclid']        ?? ''), 0, 250);

$bikePrice = $q['bike_day'];
$bikeUnits = $days * $qty;

$protUnitPrice = $q['prot_unit'];   // seguro de ESA moto (por dia) o deposito fijo
$protUnits     = $q['prot_units'];
$protName      = $protection === 'deposit' ? 'Refundable Deposit' : 'Insurance Fee';
$protDesc      = $protection === 'deposit'
    ? $qty . ' moto' . ($qty > 1 ? 's' : '') . ' × Rp 3.000.000 (reembolsable al terminar el alquiler)'
    : $days . ' día' . ($days > 1 ? 's' : '') . ' × ' . $qty . ' moto' . ($qty > 1 ? 's' : '') . ' (no reembolsable)';

$description = $qty . ' moto' . ($qty > 1 ? 's' : '') . ' × ' . $days . ' día' . ($days > 1 ? 's' : '');

// ── Conversión Google Ads en el PAGO COMPLETADO ───────────────────
// Devolvemos a la web con el total real (calculado en servidor, no manipulable)
// + un id de transacción para que Ads deduplique refrescos. El front lee
// ?paid=1 al cargar y dispara la conversión (ver script en <head> de index.html).
$total_idr   = $q['total_idr']; // total en IDR reales, calculado en servidor
$txid        = $from . '-' . $to . '-' . $qty . '-' . time();
$success_url = SUCCESS_URL
             . (strpos(SUCCESS_URL, '?') === false ? '?' : '&')
             . 'paid=1&value=' . $total_idr . '&cur=IDR&tx=' . rawurlencode($txid)
             . '&session_id={CHECKOUT_SESSION_ID}';

// ── Crear Checkout Session via Stripe API ──────────────────────────
$data = [
  'line_items[0][price_data][currency]'                  => 'idr',
  'line_items[0][price_data][unit_amount]'               => $bikePrice,
  'line_items[0][price_data][product_data][name]'        => $q['bike_name'],
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
  'metadata[ubicacion]'                                  => 'Tambolaka Airport',
  'metadata[pago]'                                       => 'stripe',
  'metadata[dropoff]'                                    => $hasDropoff ? $retLoc : '',
  'metadata[total_idr]'                                  => $total_idr,
  'metadata[txid]'                                       => $txid,
  'metadata[lang]'                                       => $lang,

  // Marca de propiedad. La cuenta de Stripe es compartida con los bots de
  // WhatsApp (BBM y B2K), que escuchan checkout.session.completed de TODA la
  // cuenta. Sin esta marca, una reserva de Sumba les llega "sin dueño": el de
  // B2K la descarta por moneda, pero el de BBM tambien cobra en IDR y solo se
  // libra porque nuestras sesiones no traen un `phone` en la metadata. El dia
  // que alguien lo anada, BBM daria por pagado un lead SUYO con el telefono de
  // un cliente de Sumba. Con `bot` puesto, los dos la marcan como ajena y salen.
  'metadata[bot]'                                        => 'sumba-rental',

  // El telefono lo pide Stripe en su propia pantalla de pago. Sin el, entregar una
  // moto en la puerta del aeropuerto depende de que el cliente conteste un email.
  'phone_number_collection[enabled]'                     => 'true',
];

// Devolución en Waingapu: tarifa fija de traslado por moto, un solo sentido.
// Se cobra por moto (quantity = $qty), no una vez por reserva.
if ($hasDropoff) {
    $data['line_items[2][price_data][currency]']                  = 'idr';
    $data['line_items[2][price_data][unit_amount]']               = $dropoffFee;
    $data['line_items[2][price_data][product_data][name]']        = 'One-way Drop-off Fee — Waingapu';
    $data['line_items[2][price_data][product_data][description]'] = 'Devolución en Waingapu (tarifa fija por moto, un solo sentido)';
    $data['line_items[2][quantity]']                               = $qty;
}

// Añadir UTM si están presentes
if ($utm_source)   $data['metadata[utm_source]']   = $utm_source;
if ($utm_medium)   $data['metadata[utm_medium]']   = $utm_medium;
if ($utm_campaign) $data['metadata[utm_campaign]'] = $utm_campaign;
if ($utm_content)  $data['metadata[utm_content]']  = $utm_content;
if ($fbclid)       $data['metadata[fbclid]']       = $fbclid;
if ($gclid)        $data['metadata[gclid]']        = $gclid;

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
    cancel_to('conexion');
}

$session = json_decode($body, true);

if (!empty($session['url'])) {
    header('Location: ' . $session['url'], true, 303);
    exit;
}

$code = $session['error']['code'] ?? 'unknown';
cancel_to($code);
