# Arte Impreso — Esquemas de pago/cobro con reparto automático (artista + proveedor + comisión)

_Síntesis de la investigación en `investigacion-pasarelas-split-pagos.md` (pasarelas) y de la investigación impositiva de la misma fecha. Fuentes al final. Los puntos impositivos/legales son orientativos — antes de implementar hay que validarlos con un contador y, en algún punto, un abogado (custodia de fondos de terceros es zona regulada por el BCRA)._

> **Decisión tomada (2026-08-25):** por ahora se descarta el reparto automático *en el momento del pago*. Se adopta igualmente el modelo de **cobrador único** del Esquema 1 (Arte Impreso cobra todo), pero la liquidación a artistas y proveedores se hace después, con varios mecanismos posibles a construir de forma incremental: manual primero, automática por operación y periódica en lote más adelante. Este documento queda como referencia de la investigación de pasarelas y de las implicancias fiscales de ser cobrador único, que siguen aplicando aunque el split ya no sea automático ni inmediato. El detalle operativo de esta decisión está en `brechas-y-decisiones-abiertas.md`, punto 1.

## Punto de partida: no existe un "split de 3 partes" en un solo cobro, en Argentina

Mercado Pago tiene un producto real de split ("Split de Pagos 1:1"), pero como dice el nombre es **1 a 1**: cada pago tiene un solo `collector_id` (quien cobra) más un `application_fee` (la comisión de la plataforma). No se puede definir un pago con tres destinatarios de una sola vez. Stripe Connect directamente no soporta Argentina como país de cobradores. dLocal tiene un producto ("dLocal for Platforms") que sí promete split multi-parte, pero no pude confirmar si está habilitado para Argentina ni su costo sin hablar con ventas.

Esto no bloquea el objetivo — significa que "reparto automático" en Argentina hoy se arma combinando **un cobro único** con **transferencias salientes automáticas por API** (usando la interoperabilidad de cuentas del BCRA, "Transferencias 3.0"), en vez de depender de una función nativa de split de 3 partes.

## Esquema 1 — Cobro único + liquidación automática diferida por eventos (recomendado para empezar)

**Cómo funciona:** Mercado Pago (u otra pasarela local) cobra el total al comprador, con **Arte Impreso como único collector**. Internamente, el sistema ya sabe (por `OrderItem`) cuánto le corresponde a cada artista, y necesitaría saber (hoy no lo sabe — ver brecha) cuánto le corresponde al proveedor. En vez de transferir todo en el momento del pago, el sistema dispara transferencias automáticas por API (a través de la cuenta empresa de Mercado Pago, o de un proveedor de transferencias como Bind/Paycloud/VALO) hacia la CBU/CVU/alias de cada parte, **según eventos de negocio**: por ejemplo, al proveedor cuando confirma producción, al artista cuando se confirma la entrega — igual que hoy funciona el `ArtistPayout` manual, pero disparado por API en vez de por un click del admin.

**Costo financiero:** la comisión de Mercado Pago sobre el cobro (según medio de pago: débito diferido ~1,7%+IVA, débito inmediato ~2,5-3%, crédito diferido ~3,5%+IVA, crédito inmediato hasta ~6,5%+IVA — cifras de fuente secundaria, conviene confirmarlas en la página oficial antes de decidir) **una sola vez** por pedido, más el costo de cada transferencia saliente (Bind/Paycloud/VALO no publican precio, hay que cotizar).

**Costo impositivo:** como la plataforma es el único "collector" ante el PSP, las retenciones que aplican los procesadores de pago (percepción de IVA por venta habitual en plataformas digitales, retención de Ingresos Brutos vía SIRCUPA en billeteras/CVU) recaen sobre **el CUIT de la plataforma**, no sobre artista ni proveedor — eso simplifica bastante la carga fiscal para ellos, algo atractivo si querés que sea fácil sumar artistas. A cambio, la plataforma tiene que facturar el total al comprador y "liquidar" a cada parte (modelo de "cuenta de venta y líquido producto" o mandato con representación — hay dos maneras válidas de armar esto en Argentina y hay que elegir una con un contador). Además, como la plataforma sostiene brevemente el dinero de terceros antes de transferirlo, conviene chequear con un abogado si eso la hace encuadrar como "agregador de pagos" sujeto a registro ante el BCRA (no es automático, depende del diseño exacto).

**Ventaja principal:** el comprador paga una sola vez, UX simple (como hoy), y podés elegir el momento de cada pago saliente — lo que reduce el riesgo de tener que revertir transferencias ya hechas si un pedido se cancela.

## Esquema 2 — Split nativo de Mercado Pago, en dos pagos separados por pedido

**Cómo funciona:** usar el "Split de Pagos 1:1" de Mercado Pago literalmente dos veces por pedido: un pago con `collector_id` = artista y una parte de la comisión como `application_fee`, y otro pago separado con `collector_id` = proveedor y el resto de la comisión. El comprador terminaría viendo dos cargos (o dos líneas dentro del mismo checkout).

**Costo financiero:** se paga la comisión de Mercado Pago **dos veces** (una por cada pago), lo que en general encarece el total frente al Esquema 1.

**Costo impositivo:** acá cada artista y cada proveedor es directamente el "collector" de su pago, así que las retenciones (SIRCUPA, percepción de IVA si corresponde) **les caen a ellos**, no a la plataforma. La plataforma cobra solo su `application_fee` y nunca sostiene el dinero de terceros — reduce bastante su propia exposición legal/fiscal. La contra es que cada artista y cada proveedor necesita **su propia cuenta de Mercado Pago verificada** (KYC nivel 6, vinculación OAuth con la app de Arte Impreso), lo cual es fricción real de onboarding, sobre todo para artistas individuales que recién empiezan.

**Desventaja de UX:** doble cobro al comprador (dos movimientos en el resumen de tarjeta), reembolsos más complicados (hay que reembolsar cada pago por separado), y hay que pensar bien cómo se le muestra "un total" prolijo si técnicamente son dos transacciones.

## Esquema 3 — Orquestador de pagos multi-parte (ej. dLocal for Platforms u otro)

**Cómo funciona:** delegar el mecanismo de split completo a un proveedor especializado en marketplaces regionales, que en teoría permite un cobro único repartido nativamente entre varias partes, y a veces ayuda con el onboarding/KYC de los cobradores.

**Estado:** no confirmado para Argentina con esta funcionalidad exacta — requiere hablar con ventas de dLocal (u otro similar) antes de poder comparar costo real.

**Cuándo tiene sentido evaluarlo en serio:** si al crecer el volumen, la carga operativa y legal del Esquema 1 (sostener fondos de terceros, liquidaciones, compliance propio) se vuelve pesada, un orquestador "llave en mano" puede justificar un costo mayor por transacción a cambio de sacarse ese trabajo de encima. No lo pondría como punto de partida sin cotizar primero.

## Comparación rápida

| | Esquema 1 (cobro único + liquidación diferida) | Esquema 2 (dos pagos MP split 1:1) | Esquema 3 (orquestador) |
|---|---|---|---|
| UX del comprador | Un solo cobro | Dos cobros | Un solo cobro (si está disponible) |
| Costo de pasarela | 1 comisión por pedido | 2 comisiones por pedido | Desconocido, a cotizar |
| Quién carga con retenciones/percepciones | La plataforma | Artista y proveedor, cada uno | Depende del proveedor |
| Onboarding de artistas/proveedores | Solo necesitan CBU/CVU/alias | Necesitan cuenta MP propia verificada | A confirmar |
| Riesgo legal de custodiar fondos de terceros | Existe, a revisar con abogado | Bajo (la plata nunca pasa por la plataforma) | A confirmar |
| Control del momento de cada pago (mitigar cancelaciones) | Total (lo definís vos) | Limitado (se paga al cobrar) | A confirmar |
| Disponibilidad confirmada en Argentina | Sí | Sí | No confirmada |

## Recomendación

Para arrancar, el **Esquema 1** es el más realista: mantiene el checkout simple que ya tenés, no depende de que cada artista abra una cuenta de Mercado Pago verificada (barrera de entrada baja para sumar artistas), y te da control sobre cuándo se le paga a cada parte — algo valioso dado que hoy el pago al artista ya está pensado para ocurrir recién en la entrega, no en el momento de la compra. El costo es que la plataforma concentra la responsabilidad fiscal y probablemente necesite ayuda contable/legal para definir bien el modelo de facturación (cuenta de venta y líquido producto vs. mandato) y confirmar si aplica normativa de PSP del BCRA por sostener fondos de terceros aunque sea brevemente.

El **Esquema 2** es la alternativa a tener en el bolsillo si esa carga legal/fiscal termina siendo un problema real (por ejemplo, si un contador te dice que el modelo de facturación del Esquema 1 es más complicado de lo que vale la pena) — a cambio de más fricción de onboarding para artistas y un costo de pasarela más alto.

El **Esquema 3** conviene cotizarlo en paralelo, sin bloquear el resto del diseño, para tener un punto de comparación real de costo y ver si simplifica lo suficiente como para justificar el gasto.

## Qué falta definir para poder implementar el Esquema 1 (para la próxima conversación)

- Confirmar comisiones reales vigentes de Mercado Pago (las de este documento son de fuente secundaria) y cotizar el costo de transferencias salientes con Bind/Paycloud/VALO u otro.
- Diseñar el cambio de modelo de datos: hoy solo existe `ArtistPayout`; hace falta el equivalente para el proveedor (registrar cuánto se le debe por pedido) y guardar CBU/CVU/alias y condición fiscal de artistas y proveedores.
- Definir con un contador el modelo de facturación (cuenta de venta y líquido producto vs. mandato con representación) y confirmar si la plataforma queda alcanzada por el régimen de información de plataformas de pago (RG 4614) o por normativa de PSP del BCRA.
- Definir el momento exacto de cada transferencia saliente (¿al confirmar producción para el proveedor? ¿a la entrega para el artista, como hoy?) y qué pasa si hay que revertir un pago ya transferido por una cancelación/devolución.

## Fuentes

- [Split de pagos 1:1 — Overview (Mercado Pago AR)](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/overview)
- [Integrar checkout en Split de Pagos 1:1 (marketplace)](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)
- [Reference — Payments POST (Mercado Pago)](https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post)
- [Comisiones Mercado Pago Latam 2026 (fuente secundaria, verificar)](https://www.guiadebancos.com/ar/blog/comisiones-mercado-pago-latam-2026)
- [Transferencias 3.0 — BCRA](https://web2.bcra.gob.ar/MediosPago/Transferencias-3-0.asp)
- [Bind — Transferencias online Wallet](https://developers.bindx.com/transferencias-on-line-wallet)
- [Paycloud — API de pagos](https://paycloud.com.ar/landing/api/)
- [VALO — API Banking](https://www.valo.ar/productos-y-servicios/api-banking/)
- [Stripe — Global availability](https://stripe.com/global)
- [dLocal for Platforms](https://www.dlocal.com/our-solution/dlocal-for-platforms/)
- [RG 5554/2024 — Boletín Oficial (derogación retenciones IVA/Ganancias liquidaciones)](https://www.boletinoficial.gob.ar/detalleAviso/primera/312596/20240821)
- [RG 5319 — percepción IVA plataformas digitales (Infobae)](https://www.infobae.com/economia/2023/01/31/como-se-aplicara-el-iva-de-hasta-8-a-quienes-vendan-en-plataformas-digitales-como-mercado-libre-o-rappi/)
- [SIRCUPA / ARBA billeteras virtuales — Infobae](https://www.infobae.com/economia/2025/09/09/como-se-aplicaran-las-retenciones-de-ingresos-brutos-en-las-billeteras-virtuales-en-la-provincia-de-buenos-aires/)
- [Retenciones/percepciones plataformas 2025 — Contablix](https://contablix.ar/blog/retenciones-percepciones-mercado-libre-2025)
- [RG 4614/2019 — régimen de información de plataformas de pago — Contadores en Red](https://contadoresenred.com/regimen-de-informacion-para-plataformas-electronicas-digitales-de-procesamientos-de-pago-rg-4614-19/)
- [BCRA — Texto ordenado Proveedores de Servicios de Pago](https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-snp-psp.pdf)
- [AFIP — Facturación, situaciones especiales / cuenta de terceros](https://www.afip.gob.ar/facturacion/comprobantes/situaciones-especiales.asp)
- [Gestionpro — Cuenta de venta y líquido producto](https://www.gestionpro.com.ar/secciones/usuarios_ayuda_liquido_producto.html)
- [AFIP — Tabla oficial de categorías monotributo ago2025-ene2026 (PDF)](https://www.afip.gob.ar/monotributo/documentos/categorias/monotributo-categorias-agosto-2025-enero-2026.pdf)
- [Factura de Crédito Electrónica MiPyME, monto mínimo abril 2026 — Contadores en Red](https://contadoresenred.com/factura-de-credito-electronica-mipyme-monto-minimo-a-partir-de-abril-2026/)
