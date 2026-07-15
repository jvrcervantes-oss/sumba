# Refresco Cornerstone — SumbaRental — 2026-07-15

Flujo: `CEO/flujos/cornerstone.md`. Verificación de vigencia, no auditoría de código ni rediseño.

## Cornerstone content identificado
- **Página de precios/reserva**: `index.html` (home con Fleet/pricing + flujo `#book`/`#book/review`)
- **FAQ**: bloque `FAQPage` JSON-LD en `index.html` + página dedicada `sumba-motorbike-rental-cost.html`
- **Precio de la flota**: `src/data.js` (fuente del número en kIDR) + `checkout.php` (cargo real Stripe)

## Precio verificado
200.000 IDR/día (moto BH-G3) coincide en **todas** las fuentes revisadas — sin discrepancia:
- `src/data.js` → `price: 200` (kIDR/día)
- `checkout.php:13` → `PRICE_IDR = 20000000` (200.000 × 100, formato Stripe 2-decimal IDR)
- `index.html` → FAQ ("200,000 IDR per day"), Product JSON-LD (`"price": "200000"`), meta `og:image:alt` / `priceRange` ("Rp 200k/day")
- `sumba-motorbike-rental-cost.html` → título, meta description, og:description ("200,000 IDR per day")

Conclusión: precio vigente, coincide con la referencia conocida del estudio (200k IDR/día). **No se ha tocado nada.**

## Timestamp "Última actualización" — FINDING
- Existe un timestamp visible en el **footer del home** (`index.html`, componente `Footer`): *"© 2026 Bali Best Motorcycle · Sumba Rental · Last updated: June 2026"* — texto hardcodeado, no ligado a ninguna fecha real (JSON-LD `dateModified` del propio `index.html` marca `2026-06-29`, y el footer sigue diciendo solo "June 2026" en genérico).
- **El footer con ese timestamp NO se renderiza en la página de reserva** (`route === "booking"`, pantallas `#book` / `#book/review`): el componente `App` solo monta `<Footer>` dentro del fragmento `route === "home"`; `BookingFlow` no lo incluye (`index.html` líneas ~4150-4180).
- Es decir: el timestamp de vigencia **sí existe en el home** (donde vive el precio/Fleet) pero **falta en el paso de reserva/checkout** propiamente dicho, que es la página donde el playbook pide comprobarlo explícitamente.

## Qué NO se ha hecho (a propósito)
- No se ha tocado ningún precio, dato de FAQ, ni el texto del footer.
- No se ha añadido timestamp a `BookingFlow` — es una decisión de contenido/diseño, no un dato caducado; se deja como finding para que Desarrollo/CEO decida si se añade.

## Resultado
**Sin cambios de contenido necesarios — precio verificado vigente (200k IDR/día, consistente en todas las fuentes).** Único finding: timestamp "Last updated" presente en home pero ausente en el flujo de reserva/checkout — no crítico (no hay dato caducado), se reporta para decidir si se replica ahí.
