# Arte Impreso — Entidades y modelo de datos

_Basado en el schema de Prisma actual (`apps/server/prisma/schema.prisma`). Refleja lo que YA existe en la base, no una propuesta._

## Personas y roles

**User**: cuenta única con `role` = `BUYER`, `ARTIST` o `ADMIN`. Un usuario `ARTIST` tiene además un `ArtistProfile` (nombre público, bio). Un usuario `BUYER` tiene un `Cart` propio y puede tener varias `Address`.

No hay roles combinados (un usuario no puede ser comprador y artista a la vez con la misma cuenta) ni jerarquía de permisos más fina que esas tres categorías.

## Catálogo

**Artwork** (obra): pertenece a un `ArtistProfile`. Tiene título, descripción, `imageUrl` (hoy es una URL externa — no hay subida de archivos propia), `isPublished` (visible o no en el catálogo), `printLimit` (tope de impresiones vendibles; `null` = ilimitado) y `printsSold` (contador que se incrementa en cada venta confirmada).

**PrintFormat** (formato de impresión): catálogo global de formatos (ej. "A4", "50x70cm") con medidas y `baseCostCents` (costo base de referencia, no necesariamente lo que se le termina pagando al proveedor por un pedido puntual — ver brechas).

**ArtworkFormatPrice**: es la tabla que une obra + formato con un precio (`priceCents`) y disponibilidad (`isAvailable`). Cada artista fija el precio de venta de cada obra en cada formato que quiera ofrecer.

## Compra

**Cart / CartItem**: un carrito por comprador, con ítems (obra + formato + cantidad). Al pasar por checkout, el carrito se vacía.

**Address**: direcciones del comprador, reutilizables entre pedidos.

**Order**: el pedido. Guarda `orderNumber`, `status` (ver más abajo), montos (`subtotalCents`, `shippingCents`, `totalCents`), `platformFeePct` (comisión de plataforma copiada al pedido, 15% por defecto), y campos de tracking (`trackingCode`, `trackingUrl`) que hoy carga el admin a mano.

**OrderItem**: línea de pedido — obra, formato, cantidad, precio unitario congelado al momento de la compra, y `artistId` (para poder calcular después cuánto le corresponde a cada artista, incluso en pedidos con obras de varios artistas).

**Payment**: uno por pedido. `status` (`PENDING`/`COMPLETED`/`FAILED`/`REFUNDED`), monto, y un campo `stripePaymentId` ya previsto (aunque hoy no hay integración real con Stripe).

Estados de `Order`: `PENDING_PAYMENT → PAID → IN_PRODUCTION → SHIPPED → DELIVERED`, con `CANCELLED` como salida alternativa (existe en el enum pero sin flujo que lo dispare todavía).

## Producción y logística

**PrintProvider**: proveedor de impresión. Tiene `integrationType` (`API` o `MANUAL`), `apiBaseUrl` / `apiKeyEncrypted` (para el caso API), `isActive` y `priority` (mayor prioridad = se prefiere). **No tiene ningún campo de costo ni de condiciones comerciales** — ver brechas.

**Fulfillment**: uno por pedido, vincula el pedido con el proveedor elegido. Guarda `externalOrderId` (si es API), y fechas `submittedAt` / `shippedAt` / `deliveredAt`.

**FulfillmentTask**: para proveedores manuales, se crean automáticamente 3 tareas fijas por pedido ("Enviar archivos al proveedor", "Confirmar producción", "Coordinar envío") con estado propio (`PENDING`/`IN_PROGRESS`/`COMPLETED`/`FAILED`) y un `assignedTo` libre (texto, no una relación a un usuario admin específico).

## Cobros

**ArtistPayout**: lo que se le debe pagar a un artista por un pedido puntual. `amountCents` = (100 − `platformFeePct`)% del total de las líneas de ese artista en el pedido. Se crea recién cuando el pedido se marca `DELIVERED`, en estado `PENDING`, y el admin lo pasa a `PAID` manualmente. Es 1:1 por (artista, pedido).

**No existe ningún equivalente para el proveedor de impresión.** Hoy nada en el modelo registra cuánto se le debe pagar al proveedor por producir un pedido — es el hueco más relevante de cara al pedido de "split automático de pago" (ver `brechas-y-decisiones-abiertas.md`).

## Reglas de negocio ya codificadas (no solo en la base, sino en la lógica)

- El límite de impresiones (`printLimit`) se valida en tres lugares por separado (agregar al carrito, modificar cantidad, y checkout/pago) comparando `printLimit − printsSold`. No hay una reserva de stock transaccional: es "revisar y luego actuar", así que en teoría dos compras simultáneas del último stock podrían pisarse.
- La comisión de plataforma se fija en el pedido al crearlo (`platformFeePct`, default 15%) — hoy es global, no varía por artista ni por categoría.
- El proveedor se elige con una sola regla: el proveedor `isActive` con mayor `priority`. No hay reparto de carga, fallback si falla, ni matching por tipo de formato o zona.

## Cambios de modelo de datos que ya se decidieron (pendientes de implementar)

Estos cambios están decididos como parte del punto 1 y 3 de `brechas-y-decisiones-abiertas.md`; se documentan acá para que el diseño de la base los tenga en cuenta, aunque el detalle de implementación se termine de definir al construirlos:

- **Generalizar `ArtistPayout` a un `Payout`** que sirva tanto para artista como para proveedor de impresión (agregando de qué tipo de beneficiario se trata), con un campo de **método de liquidación** (manual / transferencia automática por operación / periódica en lote) y su propio estado, en vez de asumir un único mecanismo.
- **Datos de cobro**: agregar CBU/alias/CUIT (o el dato que corresponda según el mecanismo de pago elegido) tanto en `ArtistProfile` como en `PrintProvider`, para poder liquidarles.
- **Costo del proveedor por pedido**: hoy no hay ningún campo que registre cuánto se le debe pagar al proveedor por producir un pedido puntual — hace falta antes de poder calcular su `Payout`.
- **Imágenes**: `Artwork.imageUrl` (hoy una URL externa) pasa a necesitar múltiples versiones del archivo: el original en alta resolución (privado, nunca servido públicamente), una versión con marca de agua y/o baja resolución (la que se muestra en el catálogo), y metadata de validación (dimensiones en píxeles, DPI calculado contra cada `PrintFormat` habilitado para esa obra, resultado de si pasa el mínimo de 300 DPI).

