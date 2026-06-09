# Auditoría SumbaRental — 09 jun 2026

## Backup de referencia
`Backups/index_20260609_1531.html`

---

## Correcciones aplicadas automáticamente

### 1. TweaksPanel de desarrollo eliminado de producción (CRÍTICO)
**Qué era:** Panel de diseño de la herramienta Omelette/edit-mode, ~450 líneas de JS parseadas y ejecutadas en cada visita. El componente `<TweaksPanel>` estaba montado en el árbol React con `window.parent.postMessage({ type: '__edit_mode_available' }, '*')` activo — enviaba mensajes a cualquier iframe padre.
**Eliminado:** bloque tweaks-panel (~404 líneas), constantes `TONES/FONTS/ACCENTS/TWEAK_DEFAULTS`, hook `useTweaks`, `useEffect` de tweaks, `<TweaksPanel>` del render.
**También eliminado:** `<style id="__om-edit-overrides"></style>` residual del editor.

### 2. React: modo development → production
`react.development.js` / `react-dom.development.js` → `react.production.min.js` / `react-dom.production.min.js`.
El build de desarrollo incluye advertencias y verificaciones que pesan ~3x más y ralentizan el TTI.

### 3. SEO completo añadido al `<head>`
- `<title>` mejorado con keyword: "Sumba Rental Motorbike – Airport Delivery | Sumba, Indonesia"
- `<meta name="description">` con keyword "Lede Kalumbang Airport (TMC)"
- `<link rel="canonical">` apuntando a `https://sumba.balibestmotorcycle.com/`
- Open Graph completo: `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:locale`
- Twitter Card: `summary_large_image`

### 4. Fuentes no usadas eliminadas del `<head>`
`Archivo` y `Space Grotesk` se cargaban desde Google Fonts pero solo existían como opciones del TweaksPanel (ya eliminado). Con tweaks removidos, nadie las activa. Ahorro: 2 requests de red innecesarios.

### 5. Layout hero hardcodeado
`layout={t.heroLayout}` → `layout="split"`. El tweak default era "split", ahora fijo sin dependencia del sistema de tweaks.

---

## Qué NO se tocó (requiere permiso o decisión humana)

| Item | Razón |
|---|---|
| `data.js` — datos de flota, reviews, i18n | Datos reales de cliente |
| `checkout.php` — flujo Stripe | Funcional, bien escrito, no tocar sin pruebas en live |
| Número WhatsApp +62 881-0379-78255 | No modificar sin confirmar |
| `private/sumba-config.php` | Credenciales — nunca tocar |
| Push a producción / Hostinger | Acción irreversible, requiere confirmación |
| `media/fotos/` (carpeta duplicada) | Podría contener fotos originales del cliente; borrar solo si confirmas |

---

## Recomendaciones pendientes (priorizadas)

### Alta prioridad
1. **Comprimir imágenes** — `SumbaRentalbike2.png` (2.8 MB) y `SumbaRentalBike.png` (1.8 MB) son enormes. Convertir a WebP o comprimir con squoosh/tinypng. Impacto directo en Core Web Vitals.
2. **Favicon** — No existe ningún `<link rel="icon">`. Los navegadores muestran una pestaña sin ícono y Google puede mostrarla en SERPs.
3. **Verificar sitemap.xml en Google Search Console** — Pendiente desde checklist de producción.

### Media prioridad
4. **`media/fotos/`** — Carpeta duplicada con las mismas imágenes que `assets/images/`. Limpiar una vez confirmado que no se usan directamente en producción.
5. **`tweaks-panel.jsx`** — Archivo suelto en la raíz del proyecto, no importado en ningún lado. Mover a `/referencias/` o eliminar.
6. **Schema.org LocalBusiness en index.html** — Ya está en los 3 posts SEO pero falta en la home. Añadir para señal de negocio local.

### Baja prioridad
7. **`@import` de Google Fonts en styles.css** — Funciona pero no es lo más rápido. Si se quiere optimizar, mover a `<link>` preload en el head.
8. **`setInterval(settle, 400)`** — Loop de 400ms que termina animaciones cuando la pestaña está oculta. Funcional pero agresivo; considerar `requestAnimationFrame` o visibilitychange solo.

---

## Resultado
- Archivo pasó de **1.991 líneas** → **1.529 líneas** (-462 líneas, -23%)
- Se eliminaron ~450 líneas de código de herramienta de diseño que se ejecutaban en cada visita
- SEO básico ahora completo (era completamente ausente)
- React en modo producción (mejora de rendimiento de carga)
