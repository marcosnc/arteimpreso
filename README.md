# ArteImpreso

Plataforma que conecta artistas con compradores para vender impresiones de obras de arte. Incluye catálogo, carrito, checkout, seguimiento de pedidos, gestión de proveedores de impresión y panel para artistas y administradores.

## Stack

| Capa | Tecnología |
|------|------------|
| Base de datos | PostgreSQL 16 |
| API | Node.js + Express + TypeScript + Prisma |
| Frontend | React + Vite + TypeScript |
| Contenedores | Docker Compose |

## Inicio rápido con Docker

```bash
cd arteimpreso
docker compose up --build
```

Servicios disponibles:

- **Web:** http://localhost:5173
- **API:** http://localhost:3001/api
- **Postgres:** localhost:5432

### Cuentas de demo (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@arteimpreso.com | password123 |
| Artista | artista@arteimpreso.com | password123 |
| Comprador | comprador@arteimpreso.com | password123 |

## Desarrollo local (sin Docker)

### Requisitos

- Node.js 22+
- PostgreSQL 16

### 1. Base de datos

```bash
createdb arteimpreso
# o usar Docker solo para Postgres:
docker compose up postgres -d
```

### 2. Servidor

```bash
cd apps/server
cp ../../.env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### 3. Cliente web

```bash
cd apps/web
npm install
npm run dev
```

## Flujo del negocio

1. **Comprador** explora obras, elige formato y agrega al carrito.
2. En **checkout** ingresa dirección y confirma el pago (simulado en desarrollo).
3. El sistema **selecciona un proveedor** (por prioridad) y:
   - Si es **API**: envía el pedido automáticamente.
   - Si es **manual**: crea tareas de seguimiento para el admin.
4. Al marcar el pedido como **entregado**, se generan los **cobros al artista** (total menos comisión de plataforma, 15% por defecto).
5. El **artista** gestiona sus obras en **Mi estudio → Obras** (crear, editar, publicar/ocultar y eliminar sin ventas), y consulta ventas y cobros pendientes/pagados.
6. El **admin** gestiona proveedores, pedidos, tareas manuales y liquida cobros a artistas.

## Estructura del proyecto

```
arteimpreso/
├── docker-compose.yml
├── apps/
│   ├── server/          # API REST
│   │   ├── prisma/      # Schema y migraciones
│   │   └── src/
│   │       ├── routes/  # auth, artworks, cart, orders, artist, admin
│   │       └── services/fulfillment.ts
│   └── web/             # SPA React
│       └── src/pages/
```

## API principal

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/artworks` | Catálogo público |
| GET | `/api/artworks/formats/all` | Formatos de impresión disponibles |
| GET | `/api/artworks/artist/mine` | Obras del artista autenticado |
| POST | `/api/artworks` | Crear obra (artista) |
| PATCH | `/api/artworks/:id` | Editar obra (artista, dueño) |
| DELETE | `/api/artworks/:id` | Eliminar obra sin ventas (artista) |
| GET/POST | `/api/cart` | Carrito |
| POST | `/api/orders/checkout` | Crear pedido |
| POST | `/api/orders/:id/pay` | Confirmar pago |
| GET | `/api/orders/:id/tracking` | Seguimiento |
| GET | `/api/artist/sales` | Ventas (artista) |
| GET | `/api/artist/payouts` | Cobros (artista) |
| GET | `/api/admin/providers` | Proveedores (admin) |
| GET | `/api/admin/tasks` | Tareas manuales (admin) |

## Próximos pasos sugeridos

- Integración real con Stripe para pagos
- Subida de imágenes (S3 / almacenamiento local) — hoy las obras usan URL externa
- Webhooks de proveedores de impresión
- Notificaciones por email
