# Arte Impreso — Brechas y decisiones abiertas

_Decisiones de producto/arquitectura y su contexto. El backlog operativo (todas las tareas, priorizadas y con fase/fecha) vive en la planilla `arteimpreso-backlog.xlsx` — este documento explica el "por qué" detrás de las decisiones grandes, no todo el detalle tarea por tarea._

## 1. Pagos y cobros — decisión tomada: esquema simple, sin split automático

**Decisión (2026-08-25):** por ahora el sistema **no** hace un reparto automático del pago en el momento del cobro. El comprador paga a una cuenta de Arte Impreso (cobrador único), y desde esos fondos se les paga después a los proveedores de impresión y a los artistas. Se van a soportar varios mecanismos de liquidación en paralelo, incorporados de forma incremental: manual (como hoy funciona para el artista), transferencias automáticas por cada operación, y liquidaciones periódicas en lote.

Esto simplifica bastante el problema frente al split automático que se había explorado inicialmente (ver `esquemas-pago-split.md`, que queda como referencia de la investigación de pasarelas y como base para cuando se quiera automatizar la liquidación). El modelo de "cobrador único" seguía siendo la base recomendada de esa investigación, así que la decisión es consistente — lo que se descarta por ahora es la parte de repartir automáticamente en el momento del pago.

**Lo que esto todavía requiere (ver backlog para el detalle):**

- Conectar una pasarela real (Mercado Pago u otra) para reemplazar el pago simulado actual.
- Generalizar `ArtistPayout` a un `Payout` que sirva también para el proveedor de impresión, con un método de liquidación (manual / automático por operación / periódico) y su estado.
- Guardar CBU/alias/CUIT de artistas y proveedores para poder pagarles.
- Definir con un contador el modelo de facturación de un cobrador único (sigue siendo válida la nota de `esquemas-pago-split.md` sobre "cuenta de venta y líquido producto" vs. mandato, y la exposición fiscal de que la plataforma concentre las retenciones/percepciones).

## 2. Deployment automático — decisión tomada: prioridad para la primera semana

**Decisión (2026-08-25):** antes de sumar funcionalidad nueva, la prioridad inmediata es poder desplegar el sistema de forma automática para tener una demo pública disponible. El proyecto ya tiene Docker Compose armado, así que el camino más rápido es: elegir un hosting (VPS propio o un PaaS que soporte contenedores), armar un pipeline de CI/CD que construya y despliegue automáticamente en cada cambio, sacar los secretos hardcodeados del `docker-compose.yml` (`JWT_SECRET: dev-secret-change-in-production` no puede quedar así en un entorno expuesto públicamente), y poner dominio + HTTPS.

Queda como decisión abierta **cuál** hosting/PaaS usar — no lo elegí unilateralmente porque depende de presupuesto y de cuánto querés administrar vos mismo vs. delegarlo. El backlog trae una tarea puntual para definirlo en los primeros días.

## 3. Subida y protección de imágenes — decisión tomada: alcance definido

**Decisión (2026-08-25):** las obras van a poder subirse como archivo (hoy es solo una URL externa). Reglas definidas:

- El artista tiene que subir la imagen en, como mínimo, 300 DPI para el formato de impresión más grande que quiera ofrecer para esa obra — hay que calcular el DPI real a partir del tamaño físico (`PrintFormat.widthCm`/`heightCm`) y los píxeles del archivo, y rechazar la subida (o el formato) si no alcanza.
- La imagen original en alta resolución **nunca** se muestra ni se sirve públicamente. En el catálogo y la ficha de obra solo se muestran versiones derivadas: con marca de agua visible y/o resolución reducida, pensadas para que no sirvan para imprimir un cuadro por fuera del sistema.
- El original de alta resolución solo lo usa el propio sistema puertas adentro, para mandarlo al proveedor de impresión al producir un pedido — nunca queda expuesto por una URL pública, ni siquiera "no listada".

Esto es un cambio de infraestructura, no solo de UI: hace falta almacenamiento persistente para los archivos (hoy el volumen `uploads` de Docker Compose existe pero no se usa, y además un volumen local no sobrevive bien a un esquema de deployment con múltiples instancias/redeploys — conviene ir directo a almacenamiento tipo S3) y un paso de procesamiento que genere las versiones protegidas al subir la imagen.

## 4. Integración real con proveedores de impresión

Hoy la "integración API" es un placeholder que no llama a ningún proveedor real, y la selección de proveedor es una sola regla (mayor prioridad activo), sin fallback si un proveedor falla, sin considerar qué formatos maneja cada proveedor, ni zona de cobertura. Tampoco hay webhooks entrantes: todo el estado de envío/entrega lo carga el admin a mano, incluso para proveedores API. Sigue sin resolverse — queda para la etapa hacia acceso general, no es bloqueante para el demo ni para el beta de artistas.

## 5. Notificaciones

No hay emails ni ningún otro canal de notificación (confirmación de compra, cambio de estado del pedido, aviso de cobro al artista, etc.). Cobra algo de urgencia para el beta de artistas (avisarles cuando se suman o cuando venden), sin ser bloqueante del todo.

## 6. Comisión de plataforma configurable

Hoy `platformFeePct` es un valor global (15% por defecto) copiado a cada pedido. No es configurable por artista ni por categoría de obra. Sin urgencia por ahora.

## 7. Condición de carrera en el control de stock

El chequeo de `printLimit` es "leer y luego actuar" en tres lugares distintos (agregar al carrito, cambiar cantidad, pagar), sin reserva transaccional. En teoría, dos compras simultáneas de la última impresión disponible podrían pasar ambas la validación. Vale la pena resolverlo antes de manejar pagos reales, no antes del demo.

## 8. Roles combinados y onboarding

Un usuario es comprador **o** artista, no ambos con la misma cuenta. Tampoco hay ningún dato de cobro cargado en `ArtistProfile` (CBU/alias/cuenta) — se agrega como parte del punto 1, junto con el dato equivalente para el proveedor de impresión.

## 9. Seguridad y cuentas

No hay flujo de recuperación de contraseña ("olvidé mi contraseña"), ni verificación de email al registrarse, ni rate limiting en endpoints públicos. La recuperación de contraseña pasa a ser importante antes de invitar artistas reales al beta (si alguien pierde el acceso, hoy no hay forma de recuperarlo).

## 10. Legal y fiscal

No hay términos y condiciones, política de privacidad, ni un acuerdo formal con los artistas (cesión de derechos de reproducción para imprimir, política de comisión y de límite de impresiones, qué pasa con las imágenes si el artista se da de baja) ni con los proveedores (SLA). Conviene tener al menos una versión mínima antes de invitar artistas reales, y la definición completa del esquema impositivo (punto 1) antes de manejar pagos reales.

## 11. Calidad e ingeniería

No hay tests automáticos ni CI que los corra. Antes de manejar plata real conviene tener al menos tests del cálculo de montos (checkout, comisión, payouts) y de la validación de stock.
