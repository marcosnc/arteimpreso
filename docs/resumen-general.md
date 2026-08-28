# Arte Impreso — Resumen general

_Última actualización: 2026-08-25_

## Qué es

Plataforma que conecta artistas con compradores para vender **impresiones** de sus obras. El comprador elige obra + formato, arma un carrito, paga, y el sistema gestiona la impresión (vía un proveedor externo) y el envío. Al confirmarse la entrega, el sistema le liquida al artista su parte del pago y se queda con una comisión.

## Estado real del proyecto (importante)

Esto **no es una idea en blanco**: ya existe un MVP funcional en este repo (`arteimpreso`), con:

- Postgres 16 + Prisma como ORM
- API en Node.js + Express + TypeScript
- Cliente web en React + Vite + TypeScript
- `docker compose up --build` levanta todo (web en :5173, API en :3001, Postgres en :5433)
- Cuentas demo cargadas por seed (admin, artista, comprador)

El flujo de punta a punta (catálogo → carrito → checkout → pago → producción → envío → entrega → cobro del artista) **ya está armado y funciona**, pero varias partes están simuladas o son placeholders pensados para reemplazarse después. Este resumen documenta el estado real (no el ideal) para que sirva de base a la planificación.

## Cómo están organizados estos documentos

Los archivos viven únicamente en esta carpeta (`docs/`), versionados junto al código.

| Documento | Contenido |
|---|---|
| [`resumen-general.md`](./resumen-general.md) (este) | Visión general, estado del proyecto, índice |
| [`entidades-modelo-datos.md`](./entidades-modelo-datos.md) | Entidades del dominio, con qué campos y reglas de negocio ya están modeladas en la base de datos |
| [`flujo-de-negocio.md`](./flujo-de-negocio.md) | El flujo completo paso a paso, por actor (comprador, artista, admin), marcando qué es real y qué es simulado/placeholder hoy |
| [`brechas-y-decisiones-abiertas.md`](./brechas-y-decisiones-abiertas.md) | Diferencias entre el prompt original y lo construido, y las decisiones de producto/arquitectura pendientes, priorizadas |
| [`esquemas-pago-split.md`](./esquemas-pago-split.md) | Investigación de esquemas de pago/cobro para Argentina (referencia — la decisión vigente es más simple, ver más abajo) |
| [`investigacion-pasarelas-split-pagos.md`](./investigacion-pasarelas-split-pagos.md) | Detalle de la investigación de pasarelas/APIs que sostiene el documento anterior, con fuentes |
| [`arteimpreso-backlog.xlsx`](./arteimpreso-backlog.xlsx) | Backlog completo de tareas con prioridad, fase y estado, más el cronograma por fase — es la fuente de verdad para hacer seguimiento del avance |

En la raíz del repo, `CLAUDE.md` es un puntero corto pensado para cuando trabajemos directamente sobre el código con un agente — enlaza a estos mismos documentos en vez de duplicar el contenido.

## Plan vigente (2026-08-25): demo → beta con artistas → acceso general

- **Pagos y cobros**: se simplificó respecto de la idea original de reparto automático. El comprador paga a una cuenta única de Arte Impreso, y desde ahí se liquida después a proveedores y artistas por varios mecanismos posibles (manual, automático por operación, periódico), construidos de forma incremental. Detalle en `brechas-y-decisiones-abiertas.md`, punto 1.
- **Deployment automático**: prioridad de la primera semana, para tener una demo pública disponible fácilmente.
- **Imágenes**: los artistas van a poder subir sus obras como archivo (mínimo 300 DPI para el formato más grande que ofrezcan); en el sitio nunca se muestra el original, solo versiones con marca de agua/baja resolución, para que no sirvan para imprimir por fuera del sistema.

Con eso se armó un cronograma de tres etapas: **demo pública** (objetivo 2026-09-01), **beta con artistas de confianza** que puedan sumar sus obras (objetivo 2026-09-15), y **ajustes hacia el acceso general** sin fecha fija, iterando según lo que se vea en el beta. El detalle tarea por tarea, con prioridad, fase y estado, está en `arteimpreso-backlog.xlsx`.

## Próximo paso

Ir marcando el avance en `arteimpreso-backlog.xlsx` a medida que se completan tareas. Los ítems de la Fase 2 marcados "si alcanza" son los primeros a mover a Fase 3 si el 15/09 se complica.
