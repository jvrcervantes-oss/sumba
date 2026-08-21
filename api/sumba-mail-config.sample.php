<?php
/**
 * PLANTILLA de configuracion del webhook de reservas de Sumba Rental.
 *
 * PASOS (se hacen UNA vez, en el servidor — nunca en el repo):
 *   1. Copia este fichero a   ../private/sumba-mail-config.php
 *   2. Rellena 'smtp_pass' con la clave del buzon ride@balimotoadventures.com
 *      (la misma que ya usa B2K en private/itinerary-config.php).
 *   3. Rellena 'webhook_secret' con el "Signing secret" (whsec_...) que da
 *      Stripe al dar de alta el endpoint. Sin el, el webhook rechaza TODO.
 *
 * private/ esta en .gitignore y bloqueada por .htaccess: no sale del servidor.
 */

return [
    // --- Firma del webhook de Stripe (Dashboard > Developers > Webhooks) ---
    // Endpoint a dar de alta:
    //   https://sumba.balibestmotorcycle.com/api/stripe-webhook.php
    // Evento:  checkout.session.completed
    'webhook_secret' => 'PON_AQUI_EL_whsec_DE_STRIPE',

    // --- SMTP Hostinger (mismo buzon que los dosieres de B2K) ---
    'smtp_host'   => 'smtp.hostinger.com',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',
    'smtp_user'   => 'ride@balimotoadventures.com',
    'smtp_pass'   => 'PON_AQUI_LA_CLAVE_DEL_CORREO',
    // Dominio del EHLO y del Message-ID: el del remitente, para que SPF/DKIM cuadren.
    'smtp_helo'   => 'balimotoadventures.com',

    // --- Remitente de cara al cliente ---
    // El cliente ha reservado en sumba.balibestmotorcycle.com, asi que el NOMBRE
    // dice Sumba Rental aunque el buzon sea el de la matriz.
    'from_email'  => 'ride@balimotoadventures.com',
    'from_name'   => 'Sumba Rental Motorbike',

    // --- A quien avisamos de cada reserva pagada ---
    'owner_notify' => 'ride@balimotoadventures.com',

    // --- Contacto que se le da al cliente en el email ---
    'whatsapp'     => '62881037978255',
    'site_url'     => 'https://sumba.balibestmotorcycle.com',

    // --- Registro de reservas (CSV en private/, fuera del web root) ---
    'bookings_csv' => dirname(__DIR__) . '/private/bookings.csv',
];
