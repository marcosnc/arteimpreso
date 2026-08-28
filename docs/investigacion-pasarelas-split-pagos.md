# Investigación: opciones de pasarela/split de pagos para Arte Impreso

_Hecha el 2026-08-13, en apoyo a la decisión abierta #1 (`brechas-y-decisiones-abiertas.md`). Fuentes con menor confianza están marcadas explícitamente._

## 1. Mercado Pago — "Split de Pagos 1:1" (antes "Marketplace")

- Producto vigente, documentado para Argentina en `mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/`.
- **Mecanismo real**: es literalmente **1:1** — un pago tiene **un `collector_id`** (el vendedor que recibe el dinero) **más un `application_fee`/`marketplace_fee`** (la comisión que se queda la plataforma). No existe en un único pago la posibilidad de definir varios `collector_id` a la vez. Confirmado por la API reference de creación de pagos (`collector_id`, `application_fee` como campos del pago) y por la doc de integración (flujo OAuth: cada vendedor se vincula individualmente y obtiene su propio `access_token`/`collector_id`).
- **Consecuencia directa para Arte Impreso**: como necesitamos repartir entre **tres** partes (artista + proveedor + plataforma), un solo cobro de Checkout Pro/API con split nativo de MP **no alcanza**. Habría que: (a) hacer 2 pagos separados por pedido (uno por artista, uno por proveedor, cada uno con su `marketplace_fee`), lo cual complica la UX de "un solo monto total" del lado del comprador, o (b) cobrar todo a nombre de la plataforma sin split nativo y después transferir por API a artista y proveedor (ver sección 2).
- **Requisitos para dar de alta cobradores**: cuenta de Mercado Pago propia con **KYC nivel 6**, autorización vía **OAuth** de cada vendedor hacia la app de la plataforma. No se detalla explícitamente exigencia de CUIT en la doc de split payments, pero las cuentas verificadas de MP Argentina en general piden CUIT/CUIL.
- **Costos** (fuente secundaria, no oficial — verificar en `mercadopago.com.ar/ayuda/comision-recibir-pagos_220`, que bloqueó el fetch automático con 403): débito con acreditación diferida (18 días hábiles) ~1,69% + IVA; débito inmediato ~2,5–3%; crédito diferido (14 días) ~3,49% + IVA; crédito inmediato hasta ~6,49% + IVA; transferencias/dinero en cuenta entre cuentas MP, gratis.

## 2. Transferencias salientes automáticas por API (cobrar todo y repartir después)

- Marco regulatorio: BCRA **Transferencias 3.0** habilita interoperabilidad CVU↔CBU entre cualquier proveedor de cuentas (bancos y billeteras). Fuente: `bcra.gob.ar` (Transferencias 3.0).
- Proveedores con API de transferencias salientes a CBU/CVU/alias para empresas encontrados: **Bind** (PSP, "Transferencias on line Wallet"), **Paycloud** (transferencias individuales y masivas a CBU/CVU/Alias), **VALO API Banking** (transferencias inmediatas vía API, con acta de autorización). Ninguno publica comisión en la página pública — hay que pedir cotización.
- No se confirmó públicamente una API de "payouts masivos" documentada de Mercado Pago para transferir a terceros (más allá del uso normal de cuenta). Ualá Bis empresas no se pudo confirmar con fuente sólida en esta pasada — pendiente de investigar más si se quiere considerar.

## 3. Stripe Connect

- Argentina **no aparece** en la lista de países soportados por Stripe (`stripe.com/global`). Esto implica que artistas/proveedores en Argentina no pueden darse de alta como "connected accounts" con payout a cuenta bancaria local. Stripe Connect no es viable como solución primaria para este marketplace en 2026.

## 4. dLocal y otros players regionales

- **dLocal** tiene un producto explícito "**dLocal for Platforms**" que permite "accept, send, and split funds between multiple users" — sí es un producto de marketplace/split. dLocal opera en Argentina (tiene página de docs específica `docs.dlocal.com/docs/argentina`), pero no se confirmó si "For Platforms" está habilitado puntualmente para Argentina ni su costo — requiere contacto comercial.
- No se encontró evidencia pública de un producto de "split payments/marketplace" en PayU, Ebanx, ni Decidir/Payway ni Modo — parecen ser pasarelas de cobro único (no multi-parte). No se puede afirmar que no exista, solo que no apareció en la búsqueda.

## Conclusión preliminar

Ninguna opción argentina ofrece un split automático nativo de un único cobro entre **tres** partes en una sola llamada API. El camino más realista es: **Mercado Pago Checkout API/Pro cobra el monto total a la plataforma**, y la plataforma **dispara transferencias automáticas por API** (vía Bind/Paycloud/VALO o similar) a artista y proveedor según sus CBU/CVU, disparadas por eventos de negocio (pago confirmado / producción confirmada / entrega confirmada), replicando lo que hoy es manual (`ArtistPayout`) pero automatizado. Esto evita la limitación 1:1 de MP y da control sobre el momento de cada pago (relevante para el riesgo de cancelaciones/devoluciones ya identificado en la brecha #1).
