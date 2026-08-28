# Arte Impreso — Flujo de negocio (estado actual)

_Marca explícitamente qué está funcionando de verdad y qué es simulado o placeholder hoy._

## 1. Comprador: descubrir y comprar

1. Explora el catálogo público (`GET /api/artworks`) — solo ve obras `isPublished`, con sus formatos disponibles y precio por formato, y cuántas impresiones quedan si la obra tiene límite.
2. Agrega al carrito una obra + formato + cantidad. Se valida stock (`printLimit`) y que el formato esté disponible para esa obra.
3. Puede tener varias obras y formatos distintos en el mismo carrito (según lo pedido originalmente).
4. Pasa a checkout: elige una dirección existente o carga una nueva. Se crea el `Order` con sus `OrderItem` (precio congelado) y un `Payment` en `PENDING`. El carrito se vacía.
5. Confirma el pago (`POST /orders/:id/pay`). **Esto hoy es una simulación**: no hay ninguna pasarela real conectada, el "pago" se da por exitoso directamente en el backend.

## 2. Qué pasa automáticamente al confirmarse el pago (real, ya funciona)

Todo esto ocurre en el mismo request de "pagar", de forma síncrona:

1. Se revalida stock por `printLimit` y, si alcanza, se incrementa `printsSold` de cada obra.
2. El `Payment` pasa a `COMPLETED` y el `Order` a `PAID`.
3. Se elige un proveedor de impresión (el activo con mayor prioridad) y se crea el `Fulfillment`.
4. Si el proveedor es tipo **API**: se llama a una función que hoy es un placeholder (`submitViaApi` solo hace un `console.log` y devuelve un ID fake) — no hay integración real con ningún proveedor externo todavía.
5. Si el proveedor es tipo **MANUAL**: se crean 3 tareas fijas de seguimiento para el admin.
6. En ambos casos el pedido pasa a `IN_PRODUCTION`.

## 3. Seguimiento de envío y entrega (manual hoy, incluso para proveedores "API")

- No hay webhooks entrantes de proveedores ni de la pasarela de pago.
- El **admin** es quien marca a mano, desde su panel, cuándo un pedido pasa a `SHIPPED` (opcionalmente cargando `trackingCode`/`trackingUrl`) y cuándo pasa a `DELIVERED` — no importa si el proveedor era API o manual.
- El comprador puede consultar el estado y una línea de tiempo (`GET /orders/:id/tracking`) armada a partir de esas fechas.

## 4. Cobro al artista (hoy: manual y recién al entregar)

1. Cuando el admin marca el pedido `DELIVERED`, el sistema calcula automáticamente cuánto le corresponde a cada artista involucrado en ese pedido: `(100 − platformFeePct)%` de sus líneas, y crea un `ArtistPayout` en estado `PENDING` por cada uno.
2. El admin, desde su panel, lista los payouts pendientes y los marca `PAID` a mano — no hay ninguna transferencia real automatizada.
3. El proveedor de impresión **no cobra nada dentro del sistema**: no hay ningún registro de cuánto se le debe ni un flujo para pagarle. Ese pago hoy queda completamente fuera del sistema.

## 5. Artista: gestión

- Alta/edición/baja de obras (solo puede eliminar una obra si no tiene ventas registradas), fijar precio por formato, publicar/ocultar, y definir si limita la cantidad de impresiones o no.
- Panel de ventas (`GET /artist/sales`): todas las líneas de pedido donde es el artista, con el total vendido.
- Panel de cobros (`GET /artist/payouts`): sus `ArtistPayout`, con totales pendiente/pagado.

## 6. Admin: gestión

- ABM de proveedores de impresión (nombre, tipo API/manual, prioridad, activo/inactivo, credenciales de API).
- ABM de formatos de impresión.
- Lista y actualización de estado de todos los pedidos.
- Cola de tareas manuales de fulfillment (marcar en progreso/completada, asignar a alguien por texto libre).
- Liquidación de cobros a artistas (marcar como pagado).

## Resumen: qué es real vs. simulado/placeholder hoy

| Paso | Estado |
|---|---|
| Catálogo, carrito, checkout | Real |
| Pago | **Simulado** (sin pasarela) |
| Selección de proveedor | Real, pero con una única regla simple (mayor prioridad activo) |
| Envío del pedido al proveedor vía API | **Placeholder** (no llama a ningún proveedor real) |
| Tareas manuales para proveedor manual | Real |
| Actualización de envío/entrega | Manual (sin webhooks) |
| Cálculo del cobro al artista | Real (automático al marcar entregado) |
| Pago real al artista | **Manual** (el admin lo marca como pagado, sin transferencia real) |
| Pago al proveedor de impresión | **No existe** en el sistema |
| Notificaciones (email, etc.) | No existen |
