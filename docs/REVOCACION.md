# REVOCACION

Foto tomada la noche del **9 de noviembre de 2026**, hora de Chihuahua. Esta guía existe para volver a dejar Las Vaqueras **como estaba ese día** si Adrián cambia de opinión.

Hay dos archivos con el mismo nombre:

- `docs/REVOCACION.md` (este). Entra al repo. No lleva contraseñas ni claves.
- `REVOCACION`, en la raíz del proyecto, en la máquina de Angel. Está en `.gitignore`. Ahí están los valores de Production que Vercel todavía deja bajar, más las copias locales de las claves que sí estaban en esta máquina. **No se sube a GitHub.** Vercel ya no devuelve `STRIPE_SECRET_KEY` ni las contraseñas de CENTRO, NORTE y SUR. Esas hay que completarlas en ese archivo desde Stripe y desde quien las tenga anotadas, sin pegarlas en el chat.

El repo [IANGELS7997/Las-Vaqueras](https://github.com/IANGELS7997/Las-Vaqueras) no se borra. La base Supabase y el proyecto Vercel tampoco se borraron en este cierre: el sitio público y la cocina quedaron en blanco, y los cobros nuevos del sitio quedaron vacíos. La API del rider, n8n y la Express de Adrián siguen vivos.

## 1. Qué se apagó el 9 de noviembre de 2026

Quien abre `https://lasvaqueras.com.mx`, `https://www.lasvaqueras.com.mx` o `https://cocina.lasvaqueras.com.mx` recibe una hoja en blanco: título vacío, fondo blanco, sin logo, sin «estamos cerrados», sin menú y sin login de cocina. La respuesta es HTTP 200, `cache-control: no-store`, `x-robots-tag: noindex`. El HTML está en `BLANK_STORE_HTML` de [lib/revocation-gate.ts](../lib/revocation-gate.ts). El middleware lo aplica en [middleware.ts](../middleware.ts). En el host de cocina, las APIs (`/api/kitchen` y el resto) también responden vacías. En localhost el sitio y la cocina se ven normales, para poder trabajar.

Las APIs del sitio que no están en la lista de abajo responden vacías (HTTP 200, cuerpo vacío). Eso incluye `/api/checkout`, así no entra un cobro nuevo por detrás de la página.

Siguen respondiendo, a propósito:

- `/api/iangel` y todo lo que cuelga de ahí (login, cola, ruta, chat, ganancias, ping, acciones). La app `app.pureiangel.com` todavía depende de esto.
- `/api/ops` (health, cierre, cocina, PIN, ayuda, pedidos gestionados, señal).
- `/api/cron` (correo de calificación cada 5 minutos y el watchdog de cocina).
- `/api/store-status` (la consulta de horario que usa el admin).

En el dominio público, `/admin` sigue en 404. Ese 404 ya no se alcanza en `cocina.lasvaqueras.com.mx`, porque ese host entero está en blanco.

Para quitar el blanco y volver a mostrar la tienda y la cocina: borrar la llamada a `revocationDecision` en `middleware.ts` (el bloque que devuelve `blankPage`, `blankApi` o `keep`) y volver a desplegar `main`. No reescribir la tienda ni el panel a mano. El host de cocina vuelve a entrar por la regla anterior del middleware: `/` reescribe a `/admin/kitchen` o `/admin/login`, y cualquier otra ruta que no sea de cocina redirige a `/admin/kitchen`.

## 2. Commit de la foto

- Remoto: `https://github.com/IANGELS7997/Las-Vaqueras.git`.
- Producción de Vercel despliega la rama **`main`**.
- `origin/main` en el momento de la foto, antes de este cierre: `d9627e64dbab66a614ce79c78da0dd4630aa69f4`.
- Ese commit es el merge del PR **#125**, 9 nov 2026 15:25 (hora de Chihuahua), desde `ajuste/calificacion-90`. Mensaje del commit de la rama: «Send the rating email 90 minutes after the ticket.»
- La copia local de esa rama, un commit antes del merge, era `d8b4e38682aea1fe51f82e3a341f00a009f7ba35`.
- Al encender de nuevo, la tienda es ese `main` más quitar el blanco de esta guía. No se parte de un commit suelto.

## 3. Superficies

Sitio público, antes del blanco:

- `/` sucursal, domicilio o recoger.
- `/menu`
- `/checkout` y `/checkout/complete`
- `/orders/[id]` ticket y seguimiento
- `/faq`, `/privacidad`, `/terminos`, `/instalar`

Cocina (apagada la misma noche, después del sitio). Así estaba antes del blanco, y así tiene que volver:

- Host `cocina.lasvaqueras.com.mx` (`NEXT_PUBLIC_KITCHEN_HOST`, y ese mismo valor es el default en código).
- Usuarios `CENTRO`, `NORTE`, `SUR`. Cada uno solo ve su sucursal.
- Login en `/admin/login`. La contraseña de cada usuario está en `KITCHEN_PASSWORD_CENTRO`, `KITCHEN_PASSWORD_NORTE` y `KITCHEN_PASSWORD_SUR` (valores solo en el archivo `REVOCACION`).
- `KITCHEN_PASSWORD` firma la cookie `lv_kitchen`. No es la contraseña de entrada.
- Centro usa la estación `main`. Norte y Sur usan la suya.

App y admin que se quedan:

- PWA del rider: Vercel `app-pureiangel`, `https://app.pureiangel.com`. Repo `APP-PUREIANGEL`.
- Admin: repo `ADMIN-IANGEL`. Supabase **IANGEL**, ref `fcuknxeakjbpqevlwswu`, región `us-east-2`. Función `iangel-ops`: `https://fcuknxeakjbpqevlwswu.supabase.co/functions/v1/iangel-ops`.
- CORS del rider, en [lib/iangel-auth.ts](../lib/iangel-auth.ts): `https://app.pureiangel.com`, `https://app-pureiangel.vercel.app`, `https://app-pureiangel-angel-salinas-creador.vercel.app`, previews cuyo host empieza con `app-pureiangel-` y termina en `.vercel.app`, `http://localhost:3001`, `http://127.0.0.1:3001`, más lo que haya en `IANGEL_APP_ORIGIN`.
- La PWA llama `VITE_VAQUERAS_API` o, si falta, `https://lasvaqueras.com.mx`. Archivos: `APP-PUREIANGEL/src/api.ts`, `src/partners/gateway.ts`, `src/partners/vaqueras.ts`. El partner es `id: las-vaqueras`, nombre Las Vaqueras. Recogida: lat `28.657575`, lng `-106.108617`, texto «Rio de Janeiro 903, Panamericana».
- Hoy no hay un segundo restaurante en `partners`. Si se borra este host sin mover esa API, la app se queda sin login, cola, chat y ganancias.

El admin llama, con el `webhook_secret` del negocio `las-vaqueras`, a estas URLs:

- `https://lasvaqueras.com.mx/api/store-status`
- `https://lasvaqueras.com.mx/api/ops/store-closure`
- `https://lasvaqueras.com.mx/api/ops/managed-orders`
- `https://lasvaqueras.com.mx/api/ops/handoff-pin`
- `https://lasvaqueras.com.mx/api/ops/kitchen-power`
- `https://lasvaqueras.com.mx/api/ops/help-resolve`

Esas seis rutas siguen vivas: cinco cuelgan de `/api/ops` y `store-status` está en la lista que este cierre no apaga. El código está en `ADMIN-IANGEL/supabase/functions/iangel-ops/index.ts`. Cada pedido pagado se copia al panel con `businessSlug: 'las-vaqueras'`.

Sesión del cliente en el navegador: `sessionStorage` claves `lv_branch` y `lv_fulfillment`. Duran mientras no se cierre la pestaña. El carrito se queda al cambiar de modo o de sucursal.

## 4. Sucursales

| Id | Usuario cocina | Dirección | Teléfono | Coordenadas | Horario |
| --- | --- | --- | --- | --- | --- |
| centro | CENTRO | Rio de Janeiro 903, Panamericana, 31210, Chihuahua, Chih. | +52 614 413 6539 | 28.657575, -106.108617 | 12:15pm–9:15pm |
| norte | NORTE | C. Rey Hugo Capeto 17900, Villas del Rey, 31180, Chihuahua, Chih. | +52 614 483 7154 | 28.746748, -106.129587 | 1:00pm–9:30pm |
| sur | SUR | José Velázquez 2408, Villa Juárez, 31064, Chihuahua, Chih. | +52 614 610 4702 | 28.619227, -106.023901 | 1:00pm–9:15pm |

Fuente: [lib/branches.ts](../lib/branches.ts). Norte y Sur entregan mientras la sucursal está abierta (`deliveryFollowsStoreHours`). Centro no: el domicilio IANGEL usa el turno del rider.

Contacto del negocio en la web: `servicio@lasvaqueras.com.mx`. Remitente de correos: `Las Vaqueras <noreply@lasvaqueras.com.mx>`. Dominio Resend `lasvaqueras.com.mx`, id `c6d3c473-7f71-42af-80ec-82bbe7d63d17`. El panel n8n está en `n8n.pureiangel.com` (infra de la plataforma, no el sitio del restaurante).

## 5. Domicilio, precios y reparto

Carta económica = `price_base` (P). El cliente paga **P′ = redondeo al peso de P × 1.10** (`WEB_MARKUP` en [lib/pricing.ts](../lib/pricing.ts)). El cobro es la suma de esos precios, no el redondeo del total. `SERVICE_FEE_RATE = 0`. `DEVELOPER_FOOD_RATE = 0.15`. `UBER_QUOTE_DISCOUNT_RATE = 0.03` (solo sobre la cotización de Uber Direct, sale de la parte de la plataforma, no se aplica al envío IANGEL de $50). `DELIVERY_FEE = 35` es un default viejo del archivo; la tarifa que cobra el checkout es la de las reglas y de `lib/iangel-routing`, no este 35. **Al encender se restaura el commit. No se reescribe la tarifa a mano.**

Reparto de cada cobro con tarjeta:

- Angel (plataforma) = 15% de la comida cobrada, menos su parte de Stripe. El envío no entra en ese 15%.
- Adrián = esa comida menos el 15%, menos su parte de Stripe, **más el envío completo**.
- Stripe ≈ `1.16 × (0.036 × total + 3)`, repartido entre los dos según esa comida. El centavo sobrante se queda con el dueño.
- Recoger: envío $0. La misma regla sobre la comida.
- El fee de envío del rider también se transfiere a la Express de Adrián. En código: `ADRIAN_DELIVERY_FEE_ACCOUNT` en [lib/iangel-cash.ts](../lib/iangel-cash.ts), y es la misma cuenta que `STRIPE_CONNECT_OWNER_LIVE`.

Domicilio, como está en las reglas del repo y en el código de ruta:

- Primero se elige sucursal (Norte, Centro o Sur). Si el cliente comparte ubicación, se muestra la más cercana. No se elige sola.
- Distancia desde la sucursal elegida, tope **6500 m**. Más de 6500 m: sin domicilio.
- Centro, **0–4000 m**, turno **12:00–21:00** y rider activo: IANGEL, envío **$50**. En tarjeta ese envío va a Adrián. Sin Uber.
- Centro, 0–4000 m, sin rider, tienda abierta (hasta las 9:15pm): «Gestionar pedido». De 9:00 a 9:15 también es Gestionar, aunque el turno del rider ya terminó. El envío se queda en la sucursal. No entra a la app del rider.
- Rider ocupado en ese radio de Centro: sigue $50, aviso 35–45 min.
- Centro, **4001–6500 m**: «Gestionar pedido». Solo tarjeta.
- Norte y Sur, 0–6500 m: siempre «Gestionar pedido», solo tarjeta, sin rider. El envío y el resto de la comida van a Adrián. Angel se queda el 15% de la comida cobrada.
- **4501–6500 m:** aviso de hasta 1 hora. El resto de los pedidos, en checkout, hasta 45 min.
- Recoger: sin dirección, hora con margen de 30 min (intervalos de 15 min). Ticket **RECOGER EN TIENDA · hora**. Recoger en Norte y Sur puede ser efectivo o tarjeta. Recoger no pide Uber.
- Pago en línea primero. Sin pago no hay orden.
- Cerrado por horario: en `/` las cajas no inician pedido. «Ver menú» abre `/menu` en gris, sin agregar ni pagar.
- Un ticket web, el de caja/POS. La cajera pasa la orden al POS. La web no imprime cocina.
- En las pruebas de ruta hay tramos de Gestionar en **$49** (hasta 4000 m) y **$55** (desde 4001 m). Esa diferencia vive en el código del commit. No se «corrige» al restaurar.

Lealtad 1/5/10: 30% / 20% / Papas Jumbo. Se calcula en el checkout, no en n8n. Sin 2x1. Sin Twilio ni SMS. Sin Facturapi ni CFDI.

Combos en el modal: chico luego grande, arriba; ninguno preseleccionado; «Sin combo» al final. Sin mínimo de carrito.

Descriptor en el estado de cuenta del cliente: `LAS-VAQUERAS-WEB`. Prefijo de tarjeta en la Express: `LASVAQUERA`.

## 6. Dinero

Plataforma (matriz), único admin:

- Cuenta `acct_1UBgeMPukuGTlRTl`, nombre **AS EUNOIA**.
- Dashboard: email `iangels7997@gmail.com`.
- Persona: Angel Ivan Salinas Ortiz. RFC `SAOA0009154F8`. Dirección Mauricio Corredor #5116, Col. Panamericana, 31210.
- Payout de la plataforma (el 15% de la comida cobrada, menos su parte de Stripe): CLABE BBVA `012180015164387876`, titular Angel Ivan Salinas Ortiz.
- La plataforma no tiene URL de AS EUNOIA.
- Adrián no tiene login de esta cuenta, ni de n8n, ni de Vercel, ni de GitHub.

Dueño, Express:

- Cuenta `acct_1UDqrILSkdFzTSOj`.
- Carlos Adrian Lopez Garcia, persona física, representante. Email `servicio@lasvaqueras.com.mx`. Teléfono `+52 614 413 6539`. URL en el perfil: `https://www.lasvaqueras.com.mx/`. Dirección Rio de Janeiro 903, Panamericana, 31210, Chihuahua.
- Banco MercadoLibre, S.A. de C.V. CLABE `722969017600593921` (terminación **3921**, routing `722`). Es la cuenta default en MXN. Estado del banco en Stripe, el 9 nov 2026: `new`.
- `transfers`: active. `charges_enabled`: true. `payouts_enabled`: true.
- Payout **diario**, `delay_days`: **7**. `debit_negative_balances`: true. Un contracargo de una venta ya hecha puede jalar esa CLABE.
- `requirements.currently_due`: vacío. `company.tax_id_provided`: false. El 9 nov 2026 Stripe no le pedía documentos para pagar. No hace falta el RFC para soltar lo que ya se cobró. Si más adelante un payout se detiene, entonces sí hay que completar lo que Stripe pida.
- Destination en código: `STRIPE_CONNECT_OWNER_LIVE` en [lib/stripe-connect-destination.ts](../lib/stripe-connect-destination.ts).
- Env de producción: `STRIPE_CONNECT_ACCOUNT_ID_LIVE` y `NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID_LIVE` = `acct_1UDqrILSkdFzTSOj`.

Cuenta que no se usa:

- Express del desarrollador `acct_1UDRDcLzV1Sjysxx`, eliminada el 2026-09-19. Está en `STRIPE_CONNECT_DELETED_IDS`. El código la ignora aunque quede en `STRIPE_CONNECT_ACCOUNT_ID` o `NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID` (vars viejas, sin `_LIVE`).
- No reintroducir la marca Pureiangel en descriptores, branding ni perfiles de Stripe.

Saldos leídos el 9 nov 2026 por la noche, en la plataforma:

- Disponible: **$0.00 MXN**.
- Pendiente: **$103.64 MXN**. Es la parte de Angel, no la de Adrián.
- `connect_reserved`: $0.

Lo de Adrián ya salió en transfers hacia su Express (ninguno revertido en la página más reciente). Últimos, hora de Chihuahua:

- 8 nov 2026, 7:56 p.m. — $237.00 — `tr_3UZhmxPukuGTlRTl1JONAIN3`
- 8 nov 2026, 3:43 p.m. — $292.00 — `tr_3UZdrGPukuGTlRTl2EAEpckd`
- 7 nov 2026, 3:23 p.m. — $181.00 — `tr_3UZH3kPukuGTlRTl0aOAdmeW`
- 25 oct 2026, 5:33 p.m. — $512.00 — `tr_3UUauVPukuGTlRTl0zTjH7h7`

La lista de Stripe tiene más páginas (`has_more`). Esos depósitos a MercadoLibre pueden seguir hasta unos 7 días después del 8 de noviembre (alrededor del 15–16). La Express no se cierra ni se borra hasta que, en el Dashboard de esa cuenta, disponible y pendiente estén en $0 y el último payout diga pagado.

No hubo reembolsos nuevos como parte de este cierre.

## 7. Pedidos y base de datos

Supabase de Las Vaqueras:

- Nombre: `LAS-VAQUERAS.iangels7997@gmail.com's Project`
- Ref / project id: `dvlovmvyykcfpuknniem`
- URL: `https://dvlovmvyykcfpuknniem.supabase.co`
- Región `us-east-2`. Postgres 17. Organización `mkizhhcwqjvmordrdpqj`.
- `project_id` en `supabase/config.toml` es ese mismo ref.
- Esta base **no se borró** el 9 nov 2026. Sigue siendo la cola del rider.

Conteo esa noche:

- `delivered`: 24. El último, 9 nov 2026 01:54:27 UTC.
- `awaiting_payment`: 30. El último, 9 nov 2026 01:52:39 UTC. Son intentos sin pago. No se cocinan y no se cobran.
- No había pedidos en `pending`, preparando, listos ni en camino.

Tablas `public`:

`branch_stock`, `cash_platform_collections`, `customer_pending_balances`, `customers`, `iangel_rider_presence`, `iangel_riders`, `kitchen_station`, `loyalty_claims`, `loyalty_rewards`, `order_audit`, `order_experience_ratings`, `order_messages`, `order_proofs`, `order_ratings`, `orders`, `products`, `public_closure`, `push_subscriptions`, `restaurants`, `rider_help_reports`.

El pedido se inserta al crear el PaymentIntent (`awaiting_payment`). Tras el pago pasa a `pending`. La cola del rider lee `orders` con `delivery_provider` `self` o `wait_self`. La presencia del celular está en `iangel_rider_presence`, con `orders.iangel_rider_key`. `customers` es perfil, lealtad y avatar de la web. El rider no arma su cola desde ahí.

Migraciones, en este orden. No se reescriben. No se vuelven a ejecutar sobre la base que ya las tiene. Si se recrea la base, se aplican todas, de la más vieja a la más nueva:

1. `20260904035022_create_restaurants_products_orders.sql`
2. `20260904035046_revoke_rls_auto_enable_execute.sql`
3. `20260904040612_add_order_item_and_fee_columns.sql`
4. `20260908040804_orders_customer_email.sql`
5. `20260908041128_orders_awaiting_payment_status.sql`
6. `20260908044056_orders_fulfillment_pickup.sql`
7. `20260908225400_customers_and_avatars.sql`
8. `20260908231800_orders_uber_delivery.sql`
9. `20260910164100_orders_card_funding.sql`
10. `20260910171000_loyalty_claims.sql`
11. `20260910180000_loyalty_claims_order_unique.sql`
12. `20260912120000_loyalty_rewards.sql`
13. `20260912123000_loyalty_reward_codes.sql`
14. `20260921103000_kitchen_station_watchdog.sql`
15. `20260928114900_orders_enroute_email.sql`
16. `20260928143000_iangel_rider_presence.sql`
17. `20260929180000_orders_pay_method_cash.sql`
18. `20260929201000_cash_door_and_uber_off.sql`
19. `20261001120000_order_handoff_proof.sql`
20. `20261001140000_incomplete_refund_votes.sql`
21. `20261001160000_orders_branch.sql`
22. `20261001183000_cash_platform_fee.sql`
23. `20261001220000_orders_managed_delivery_provider.sql`
24. `20261005203000_branch_stock.sql`
25. `20261016053000_kitchen_admin_gate.sql`
26. `20261101220000_ajuste25_cierre_calificacion.sql`
27. `20261104160000_ajuste30_kitchen_accepted.sql`
28. `20261109120000_order_charged_split.sql`
29. `20261109160000_ajuste34_ticket_sent_at.sql`

## 8. n8n, Uber, Resend, Sentry, cron

n8n, workflow **publicado** (no se despublicó en este cierre):

- Nombre: Las Vaqueras: pago exitoso.
- Id: `SKVvYOhKSnPj1ggY`.
- URL del editor: `https://n8n.pureiangel.com/workflow/SKVvYOhKSnPj1ggY`.
- Webhook de producción: `https://n8n.pureiangel.com/webhook/lv-pago-exitoso`.
- El nodo **Create Uber Direct Delivery** está **activo** desde el 2026-09-27. Solo corre si `delivery_provider` = uber y el pedido todavía no tiene courier. Recoger e IANGEL no piden Uber. No apagarlo salvo que se pida otra vez.
- Credenciales enganchadas en n8n: Stripe, Supabase, Uber, Resend. Esas credenciales no están en este archivo.
- Remitente: `Las Vaqueras <noreply@lasvaqueras.com.mx>`.
- Pickup que usa Uber: Rio de Janeiro 903, Panamericana, 31210 Chihuahua. Tel `+52 614 413 6539`.
- El correo es el ticket más el enlace «Ver mi pedido» con `?s=` para abrir el perfil.

Stripe, webhook live, el 9 nov 2026:

- Id: `we_1UIDkbPukuGTlRTlrtkVKnCD`.
- Descripción: Las Vaqueras n8n pago exitoso.
- Estado: enabled.
- Evento: `payment_intent.succeeded`.
- URL: `https://n8n.pureiangel.com/webhook/lv-pago-exitoso`.
- El secreto de firma de ese webhook **no** está aquí. Vive en la credencial de n8n. Si se borra el endpoint y se crea otro, n8n tiene que recibir el secreto nuevo.

Uber Direct, variables (valores en el archivo `REVOCACION`):

- `UBER_DIRECT_CLIENT_ID`
- `UBER_DIRECT_CLIENT_SECRET`
- `UBER_DIRECT_CUSTOMER_ID`
- `UBER_DIRECT_WEBHOOK_SECRET` (valida `POST /api/uber/webhook`)
- `UBER_USE_SANDBOX` no puede ser `1` ni `true` en Production.

Resend: dominio verificado `lasvaqueras.com.mx`, id `c6d3c473-7f71-42af-80ec-82bbe7d63d17`. `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en el archivo de claves.

Sentry: proyecto `las-vaqueras`, organización `angel-salinas-creador`, región `https://us.sentry.io`. `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` siguen en Vercel y en el archivo de claves, pero el SDK quedó **apagado** la noche del 9 nov 2026: `enabled: false` y sin DSN en `sentry.client.config.ts`, `sentry.server.config.ts` y `sentry.edge.config.ts`. No manda errores ni replay.

Alertas que estaban prendidas y se apagaron esa noche (volver a ponerlas en `active` al encender):

- `6040982` — Send a notification for high priority issues. Email a los miembros. Era la que avisaba en producción. Último disparo 10 nov 2026 03:42 UTC.
- `6041165` — Notify Suggested Assignees. Email. Último disparo 10 nov 2026 03:43 UTC.
- `5922212` — Send a notification when pull requests are ready. No se pudo apagar por permiso (HTTP 403). No había disparado. Al volver, revisar si sigue activa.

Para encender Sentry otra vez: en los tres `sentry.*.config.ts`, volver a `dsn` desde el env y `enabled: Boolean(dsn)`, con el `beforeSend` que había en el commit `d9627e64` (el de antes del cierre). Luego activar las alertas `6040982` y `6041165`. La alerta de email del checklist de entrega (Issues → Alerts, una creada a mano) seguía pendiente antes de este cierre; estas dos de arriba son las que sí estaban mandando correo.

Cron de [vercel.json](../vercel.json): `GET /api/cron/experience-email` con horario `*/5 * * * *`. El correo de calificación sale unos 90 minutos después del ticket (PR #125).

Health desde el celular: `GET https://lasvaqueras.com.mx/api/ops/health?token=` más el valor de `OPS_HEALTH_SECRET` (solo en el archivo de claves). Si `fatal: true` o HTTP 503, no cobrar y no repartir. Esta ruta sigue viva durante el blanco.

Apple Pay y Google Pay ya estaban verificados en el dominio, sin un cobro de prueba nuevo ese día. Si el dominio se quita de Vercel y se vuelve a conectar, hay que repetir la verificación del dominio en Stripe.

Wallets y el dominio público: el archivo de asociación de Apple, si existe en el deploy, vuelve con el commit. No se recrea a mano.

## 9. Variables

Los **valores que sí se pudieron guardar** están en el archivo `REVOCACION` de la raíz (no se sube a git). Vercel marcó varias variables como Sensitive y el 9 nov 2026 ya no deja descargarlas. De esas, se rellenó con la copia local de esta máquina cuando existía. Estas **no están** en el archivo, porque Vercel no las devuelve y aquí no había copia:

- `STRIPE_SECRET_KEY` (la de producción, `sk_live_`). En la máquina solo hay una clave de prueba. No se guardó, para no encender producción con la de prueba. Hay que copiarla del Dashboard de Stripe al archivo, sin pegarla en el chat ni en git.
- `KITCHEN_PASSWORD_CENTRO`
- `KITCHEN_PASSWORD_NORTE`
- `KITCHEN_PASSWORD_SUR`
- `IANGEL_OPS_WEBHOOK_SECRET`

`SENTRY_DSN` se copió del valor público `NEXT_PUBLIC_SENTRY_DSN`, que sí bajó de Production.

El resto de los nombres de abajo sí quedó en el archivo, o es un valor público de Production.

Obligatorias o usadas en producción:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — empieza con `pk_live_`. Checkout.
- `STRIPE_SECRET_KEY` — empieza con `sk_live_`. PaymentIntents, reembolsos, Connect. No dejar una copia llamada `STRIPE_SECRET_KEY_LIVE` en el repo.
- `STRIPE_CONNECT_ACCOUNT_ID_LIVE` — `acct_1UDqrILSkdFzTSOj`.
- `NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID_LIVE` — la misma cuenta, la lee el checkout en el cliente.
- `NEXT_PUBLIC_SUPABASE_URL` — `https://dvlovmvyykcfpuknniem.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — si falta, el código usa `Las Vaqueras <noreply@lasvaqueras.com.mx>`.
- `KITCHEN_PASSWORD` — firma la sesión. No es la clave con la que entra la cocina.
- `KITCHEN_PASSWORD_CENTRO`
- `KITCHEN_PASSWORD_NORTE`
- `KITCHEN_PASSWORD_SUR`
- `NEXT_PUBLIC_KITCHEN_HOST` — `cocina.lasvaqueras.com.mx`.
- `CUSTOMER_SESSION_SECRET`
- `IANGEL_RIDER_PASSWORD` — login de la app con contraseña, en este servidor.
- `IANGEL_API_SECRET` — firma tokens y quotes. No va en la PWA.
- `IANGEL_APP_ORIGIN` — orígenes extra de CORS.
- `UBER_DIRECT_CLIENT_ID`
- `UBER_DIRECT_CLIENT_SECRET`
- `UBER_DIRECT_CUSTOMER_ID`
- `UBER_DIRECT_WEBHOOK_SECRET`
- `UBER_USE_SANDBOX` — prohibido `1` y `true` en Production.
- `OPS_HEALTH_SECRET`
- `N8N_DEV_SIGNAL_URL` — visitas, carrito, fallos y avisos del rider.
- `N8N_DEV_SIGNAL_SECRET` — solo servidor.
- `CRON_SECRET` — el watchdog de cocina. En plan Hobby el cron de ese watchdog puede estar desactivado; el de calificación sí está en `vercel.json`.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `IANGEL_OPS_URL` — si falta, se usa la URL de la función del proyecto IANGEL.
- `IANGEL_OPS_WEBHOOK_SECRET` — secreto del negocio `las-vaqueras` en el admin. Sin él, la ruta del rider sigue en orden de llegada. También autoriza el correo de calificación.

Vars viejas, no son el destination: `STRIPE_CONNECT_ACCOUNT_ID`, `NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID`. Si aparecen en Vercel, el código ya bloquea `acct_1UDRDcLzV1Sjysxx`.

La PWA (`APP-PUREIANGEL`) tiene las suyas, aparte: `VITE_VAQUERAS_API`, `VITE_SUPABASE_URL` (`https://fcuknxeakjbpqevlwswu.supabase.co`), `VITE_SUPABASE_PUBLISHABLE_KEY` del proyecto **IANGEL** (no la de Vaqueras), `VITE_SUPPORT_WHATSAPP`, `VITE_SUPPORT_PHONE`, `VITE_VAPID_PUBLIC_KEY`. Esos valores no están en el archivo `REVOCACION` de este repo.

## 10. Texto para Adrián

Enviarlo por WhatsApp y a `servicio@lasvaqueras.com.mx`. No se le mandan claves, GitHub, Vercel, n8n, contraseñas de cocina ni la CLABE de Angel. El enlace de Express se genera en el momento de enviarlo (caduca pronto) y se manda a ese correo.

> Adrián: el sitio web de Las Vaqueras se cancela. A partir de este aviso ya no entran pedidos ni cobros con tarjeta a tu nombre.
>
> Lo que ya se cobró sigue su camino: tu parte (la comida menos el 15%, más el envío completo) está en tu cuenta de Stripe y de ahí sale a tu MercadoLibre terminación 3921. El último cobro fue el 8 de noviembre. Esos depósitos pueden tardar hasta 7 días. Revisa esa cuenta hasta mediados de noviembre.
>
> Te llega un enlace de Stripe a este correo para que veas tu saldo. Cuando esté en cero y el banco haya recibido el último depósito, esa cuenta de cobros se cierra.
>
> Si quieres, antes de borrar los datos te paso una lista de los pedidos ya pagados (fecha, folio, total y lo que te correspondió). Respóndeme que sí o que no.
>
> Confírmame por escrito: aceptas que el sitio se apaga y que no habrá más cobros.

Antes de borrar la base (eso **no** se hizo el 9 nov 2026), él tiene que regresar:

- El «acepto» por escrito.
- Si quiere o no la lista de los 24 pedidos pagados.
- Que `servicio@lasvaqueras.com.mx` es el correo donde abre el enlace.

## 11. Lo que todavía no se borra

Hecho el 9 nov 2026:

- Guía escrita.
- Archivo local `REVOCACION` con las variables de Production que Vercel todavía deja bajar, más las copias locales de las que estaban marcadas Sensitive. Faltan en ese archivo: `STRIPE_SECRET_KEY` de producción, las tres contraseñas de entrada de cocina y `IANGEL_OPS_WEBHOOK_SECRET`.
- Sitio público en blanco y APIs de cobro del sitio vacías.
- Cocina en blanco, en `https://cocina.lasvaqueras.com.mx`, páginas y APIs. El panel no muestra login ni pedidos.
- Sentry apagado en el código (`enabled: false`) y alertas `6040982` y `6041165` desactivadas, para que dejen de llegar correos.
- La misma noche, para dejar de gastar uso, se pausó lo que solo sirve a Las Vaqueras. No se borró. El admin IANGEL sigue prendido.

Pausado o despublicado el 9 nov 2026 por la noche:

- Vercel `las-vaqueras`, id `prj_5zw8ZzjiuBbnRGUROxJCn9WN0APb`. Se apagan funciones, el cron de cada 5 minutos, el sitio y la cocina. Los dominios dejan de asignarse solos mientras esté en pausa. Para volver: `unpause_project` con ese id y el team `team_PNbziR6S4wcjubV06JuPuMnF`.
- Vercel `app-pureiangel`, id `prj_5K76A8dSmTyTU1fM02DkuQnkn3mr`. La app del rider (`app.pureiangel.com`) queda pausada. Para volver: el mismo unpause con ese id.
- Supabase de Las Vaqueras `dvlovmvyykcfpuknniem`. La base no se borra; queda en pausa y no cobra cómputo. Para volver: restaurar ese project id.
- n8n despublicado (no borrado): `SKVvYOhKSnPj1ggY` (pago exitoso, con Uber Direct) y `EVd5zOphcCyc34QJ` (avisos dev). El host `n8n.pureiangel.com` sigue, porque es infra de la plataforma. Para volver: republicar esos dos workflows.
- Webhook de Stripe `we_1UIDkbPukuGTlRTlrtkVKnCD` desactivado (`disabled: true`), no borrado. Para volver: `disabled: false` y el mismo URL `https://n8n.pureiangel.com/webhook/lv-pago-exitoso`.

Sigue activo, a propósito:

- Vercel `admin-iangel`, id `prj_FOjUlvxrvnvbWhfJD35DfWzA3FYa`.
- Supabase **IANGEL** `fcuknxeakjbpqevlwswu` y la función `iangel-ops`.
- La cuenta plataforma de Stripe `acct_1UBgeMPukuGTlRTl` (AS EUNOIA) y la Express de Adrián `acct_1UDqrILSkdFzTSOj`. Los depósitos del 8 de noviembre pueden seguir a MercadoLibre. No se cierra esa Express hasta que el saldo esté en cero.
- Dominio Resend `lasvaqueras.com.mx` (`c6d3c473-7f71-42af-80ec-82bbe7d63d17`). El admin manda correo desde `noreply@lasvaqueras.com.mx`. Sin el cron y sin n8n, Las Vaqueras ya no envía tickets. El dominio se queda para el admin y para poder encender después.
- El repo de GitHub. El proyecto `prototipo-like-shoes` no es de Las Vaqueras y no se tocó.
- Uber Direct no se borra como cuenta. Deja de pedirse porque n8n está despublicado y Vercel de Las Vaqueras está en pausa.

No hecho, y no se hace hasta que su Express esté en cero y él haya contestado:
- Quitar el partner Las Vaqueras de `APP-PUREIANGEL` y las seis llamadas de `iangel-ops`.
- Soltar los dominios, borrar el proyecto Vercel `las-vaqueras` y borrar la base `dvlovmvyykcfpuknniem`.
- Cerrar o borrar la Express `acct_1UDqrILSkdFzTSOj`.
- Dar de baja Resend `lasvaqueras.com.mx` y Uber Direct de esta tienda.
- Borrar el repo de GitHub. **Ese no se borra**, aunque lo demás sí se apague después: sin el repo no hay regreso.

Si el dominio `lasvaqueras.com.mx` está a nombre de Angel, se da de baja después de quitar el DNS de Vercel. Si está a nombre de Adrián, se le deja el dominio y solo se retira el DNS. El correo `servicio@` deja de funcionar cuando el dominio deje de apuntar al correo.

Antes de cualquiera de esos borrados, además del archivo `REVOCACION`:

- Dump de Supabase `dvlovmvyykcfpuknniem` (esquema y datos), fuera del repo.
- Export del workflow n8n `SKVvYOhKSnPj1ggY`.
- Copia de los DNS del dominio.
- Confirmar que el archivo `REVOCACION` abre. Antes de borrar Vercel hay que completar a mano `STRIPE_SECRET_KEY`, `KITCHEN_PASSWORD_CENTRO`, `KITCHEN_PASSWORD_NORTE`, `KITCHEN_PASSWORD_SUR` y `IANGEL_OPS_WEBHOOK_SECRET`, porque Vercel ya no las devuelve.

## 12. Volver a encender

1. Quitar la pausa de Vercel `las-vaqueras` (`prj_5zw8ZzjiuBbnRGUROxJCn9WN0APb`) y, si la app del rider debe volver, de `app-pureiangel` (`prj_5K76A8dSmTyTU1fM02DkuQnkn3mr`). Restaurar Supabase `dvlovmvyykcfpuknniem`. Volver a activar el webhook `we_1UIDkbPukuGTlRTlrtkVKnCD`. Republicar `SKVvYOhKSnPj1ggY` y `EVd5zOphcCyc34QJ`.
2. Partir de `main` con este archivo y quitar el blanco: en `middleware.ts`, dejar de llamar a `revocationDecision`. Desplegar `main`. El sitio vuelve a verse y `cocina.lasvaqueras.com.mx` vuelve al login de CENTRO, NORTE y SUR.
3. Si Vercel o Supabase se hubieran borrado: crear el proyecto Vercel `las-vaqueras` desde este repo, pegar cada línea del archivo `REVOCACION` en Production, y conectar `lasvaqueras.com.mx`, `www` y `cocina.lasvaqueras.com.mx`. Crear el proyecto Supabase (o restaurar el dump) y aplicar las migraciones de la sección 7 solo si la base está vacía.
4. `STRIPE_CONNECT_ACCOUNT_ID_LIVE` vuelve a ser `acct_1UDqrILSkdFzTSOj`. Si esa Express se cerró, solo se abre otra si Adrián acepta por escrito. No usar `acct_1UDRDcLzV1Sjysxx`.
5. El webhook `payment_intent.succeeded` vuelve a `https://n8n.pureiangel.com/webhook/lv-pago-exitoso`. Si el endpoint es nuevo, actualizar el secreto en n8n.
6. Republicar el workflow `SKVvYOhKSnPj1ggY` con el nodo Create Uber Direct activo, solo para domicilio Uber sin courier. También `EVd5zOphcCyc34QJ` si se quieren otra vez los avisos de pago que no cierra.
7. En la PWA, `partners` vuelve a incluir el adapter de Las Vaqueras con `baseUrl` `https://lasvaqueras.com.mx`. En `iangel-ops`, las seis URLs y el slug `las-vaqueras`. Publicar la PWA y la función. El admin IANGEL no se apagó.
8. Comprobar, sin un cobro real hasta que Adrián lo pida por escrito: el sitio abre en `/`, la cocina solo en su host (login, no la hoja en blanco), `GET /api/ops/health` no sale fatal, y la app del rider abre la cola sin error.
9. No commitear el archivo `REVOCACION`. No pegar sus valores en el chat ni en un PR.
