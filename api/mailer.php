<?php
/**
 * mailer.php — cliente SMTP minimalista sobre SSL (puerto 465).
 *
 * Portado tal cual desde B2K (api/subscribe.php), que lleva enviando los
 * dosieres desde jun-2026 con la misma cuenta: ride@balimotoadventures.com.
 * No se ha reescrito a proposito — es codigo probado en produccion.
 *
 * Este fichero no se sirve nunca en publico (ver api/.htaccess).
 */

/**
 * Envia un email HTML. Devuelve [bool ok, string respuesta del servidor].
 *
 * La guarda function_exists permite sustituirlo por un doble al probar el webhook
 * sin abrir un socket SMTP de verdad. En produccion nadie lo define antes.
 */
if (!function_exists('sr_smtp_send')):
function sr_smtp_send($cfg, $to, $subject, $html, $replyTo = '') {
    $host   = $cfg['smtp_host'] ?? 'smtp.hostinger.com';
    $port   = (int)($cfg['smtp_port'] ?? 465);
    $secure = $cfg['smtp_secure'] ?? 'ssl';
    $user   = $cfg['smtp_user'] ?? '';
    $pass   = $cfg['smtp_pass'] ?? '';
    $fromE  = $cfg['from_email'] ?? $user;
    $fromN  = $cfg['from_name'] ?? 'Sumba Rental Motorbike';
    $helo   = $cfg['smtp_helo'] ?? substr(strrchr($fromE, '@') ?: '@localhost', 1);

    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $fp = @stream_socket_client($remote, $errno, $errstr, 20);
    if (!$fp) return [false, "connect: $errstr"];
    stream_set_timeout($fp, 20);

    $read = function () use ($fp) {
        $d = '';
        while ($line = fgets($fp, 515)) {
            $d .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') break;
        }
        return $d;
    };
    $cmd = function ($c) use ($fp, $read) { fwrite($fp, $c . "\r\n"); return $read(); };

    $read();                               // saludo 220
    $cmd('EHLO ' . $helo);
    $cmd('AUTH LOGIN');
    $cmd(base64_encode($user));
    $a = $cmd(base64_encode($pass));
    if (strpos($a, '235') === false) { fclose($fp); return [false, 'auth: ' . trim($a)]; }

    $cmd('MAIL FROM:<' . $fromE . '>');
    $r = $cmd('RCPT TO:<' . $to . '>');
    if (strpos($r, '250') === false && strpos($r, '251') === false) { fclose($fp); return [false, 'rcpt: ' . trim($r)]; }
    $cmd('DATA');

    $headers  = 'From: ' . mb_encode_mimeheader($fromN) . ' <' . $fromE . ">\r\n";
    $headers .= 'To: <' . $to . ">\r\n";
    if ($replyTo) $headers .= 'Reply-To: <' . $replyTo . ">\r\n";
    $headers .= 'Subject: ' . mb_encode_mimeheader($subject) . "\r\n";
    $headers .= 'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $helo . ">\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: 8bit\r\n";
    $headers .= 'Date: ' . date('r') . "\r\n";

    $body = preg_replace('/^\./m', '..', $html);          // dot-stuffing
    fwrite($fp, $headers . "\r\n" . $body . "\r\n.\r\n");
    $final = $read();
    $cmd('QUIT');
    fclose($fp);
    return [strpos($final, '250') !== false, trim($final)];
}
endif;
