# Arte Impreso — guía para trabajar en este repo

Plataforma que conecta artistas con compradores para vender impresiones de sus obras: catálogo → carrito → checkout → pago → producción (proveedor de impresión) → envío/entrega → cobro al artista.

## Documentación de negocio y planificación

Vive en `docs/` en este mismo repo:

- [`docs/resumen-general.md`](./docs/resumen-general.md) — visión general y estado del proyecto
- [`docs/entidades-modelo-datos.md`](./docs/entidades-modelo-datos.md) — entidades del dominio y reglas de negocio ya modeladas
- [`docs/flujo-de-negocio.md`](./docs/flujo-de-negocio.md) — flujo completo paso a paso, marcando qué es real vs. simulado/placeholder
- [`docs/brechas-y-decisiones-abiertas.md`](./docs/brechas-y-decisiones-abiertas.md) — diferencias con el prompt original y decisiones pendientes, priorizadas
- [`docs/esquemas-pago-split.md`](./docs/esquemas-pago-split.md) — esquemas concretos para el reparto automático de pagos (artista + proveedor + comisión), con costo financiero e impositivo en Argentina
- [`docs/investigacion-pasarelas-split-pagos.md`](./docs/investigacion-pasarelas-split-pagos.md) — investigación de pasarelas/APIs que sostiene el documento anterior, con fuentes

Antes de planificar o implementar un cambio de alcance (por ejemplo, pagos reales), conviene revisar esos documentos.

## Stack

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 16 (Prisma como ORM/migraciones) |
| API | Node.js + Express + TypeScript (`apps/server`) |
| Frontend | React + Vite + TypeScript (`apps/web`) |
| Contenedores | Docker Compose (`docker-compose.yml` en la raíz) |

## Estructura

```
arteimpreso/
├── docker-compose.yml
├── docs/                 # documentación de negocio y decisiones (ver arriba)
├── apps/
│   ├── server/          # API REST
│   │   ├── prisma/      # schema.prisma y migraciones
│   │   └── src/
│   │       ├── routes/      # auth, artworks, cart, orders, artist, admin, addresses
│   │       ├── services/    # fulfillment.ts: selección de proveedor, pago, entrega, payouts
│   │       ├── lib/          # auth (jwt/hash), prisma client
│   │       └── middleware/   # requireAuth, requireRole
│   └── web/              # SPA React
│       └── src/pages/    # Home, Artwork, Cart, Checkout, Orders, ArtistPage, AdminPage, Login
```

## Comandos

```bash
# Todo con Docker
docker compose up --build
# Web: http://localhost:5173  API: http://localhost:3001/api  Postgres: localhost:5433

# Desarrollo local sin Docker
cd apps/server && cp ../../.env.example .env && npm install && npx prisma migrate deploy && npm run db:seed && npm run dev
cd apps/web && npm install && npm run dev
```

Cuentas demo (seed): `admin@arteimpreso.com`, `artista@arteimpreso.com`, `comprador@arteimpreso.com` — contraseña `password123`.

## Estado actual (resumen técnico)

El flujo completo funciona de punta a punta, pero con partes clave simuladas o placeholder — ver `docs/flujo-de-negocio.md` para el detalle exacto de qué es real y qué no. En corto: el pago (`POST /orders/:id/pay`) es una simulación sin pasarela real; el envío del pedido a un proveedor tipo API (`submitViaApi` en `services/fulfillment.ts`) es un stub que no llama a nada externo; el cobro al artista se calcula automáticamente al marcar el pedido `DELIVERED` pero se liquida a mano; no existe ningún registro de pago al proveedor de impresión.

La próxima etapa de trabajo, en curso de definición, es implementar pagos reales con reparto automático (comprador paga una vez → se reparte a proveedor, artista y comisión de plataforma). El detalle de las decisiones pendientes para eso está en `docs/brechas-y-decisiones-abiertas.md` (decisión #1) y `docs/esquemas-pago-split.md` (esquemas concretos ya evaluados).
