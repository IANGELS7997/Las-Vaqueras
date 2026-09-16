# Contrato IANGEL ↔ Las Vaqueras ↔ n8n

PWA rider: `https://app.pureiangel.com` (repo `IANGELS7997/APP-PUREIANGEL`).
Pedidos: `https://lasvaqueras.com.mx`. Cocina: `https://cocina.lasvaqueras.com.mx`.
Solo Las Vaqueras por ahora.

## Auth

IANGEL llama a `https://lasvaqueras.com.mx/api/iangel/*`.

- Login: `POST /api/iangel/login` `{ password }` → `{ token }`.
- Header: `Authorization: Bearer <token>` o `X-Iangel-Key: <IANGEL_API_SECRET>`.
- CORS: `IANGEL_APP_ORIGIN` (default `https://app.pureiangel.com`).

Env (nombres, nunca valores en git):

- `IANGEL_API_SECRET`
- `IANGEL_RIDER_PASSWORD`
- `IANGEL_APP_ORIGIN`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Endpoints rider

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/iangel/me` | Activo/inactivo, turno |
| PATCH | `/api/iangel/me` | `{ rider_active }` — solo el rider. Default ACTIVO. Nunca auto-inactivar. |
| POST | `/api/iangel/ping` | GPS. Si Activo y sin ping, NO apagar; push “Sigues ACTIVO”. |
| GET | `/api/iangel/queue` | Cola 1 a 1 |
| POST | `/api/iangel/orders/:id/action` | accept, pickup (+pin+geocerca tienda), arrive (≤150 m), start_wait, pause_wait, deliver, unclaimed, unsafe_skip_wait, incident, rate_customer |
| GET/POST | `/api/iangel/orders/:id/chat` | Mismo hilo + atajos |
| GET | `/api/iangel/earnings` | Ganancias del día = $50 × viajes |

Next.js **nunca** llama `createDelivery`. Quotes sí (`/api/delivery-quote`, checkout).

## n8n (SKVvYOhKSnPj1ggY) — NO publicar

Código listo en `orders.n8n_payload` y metadata Stripe:

- `provider`: `pickup` \| `self` \| `uber` \| `wait_self`
- `dispatch_status`: `awaiting_n8n` \| `self_iangel` \| `pickup_store` \| `cook_hold` \| `needs_n8n_uber`
- quote id/fee, lat/lng, phones, items, `leave_at_door`

IF futuro (cuando el dueño diga “activa n8n”):

- `uber` → nodo Create Uber Direct
- `self` / `pickup` / `wait_self` → no crear delivery

El nodo Create Uber Direct permanece **desactivado**.

## Reglas de negocio

- Pin tienda: 28.657575, -106.108617. Haversine.
- `MAX_DELIVERY_M=5000`. `SELF_MAX_M=4000`.
- Turno IANGEL America/Chihuahua: 12:00:00 inclusive → 21:00:00 exclusive.
- 20:59:59 + activo + libre + ≤4 km → $50. 21:00:00 → no $50 ni espera.
- INACTIVO: solo Uber quote (≤5 km). Sin $50 ni espera.
- Ocupado (máx 1 bolsa): espera $50 35–45 min (`cook_hold`) **o** Express.
- Quotes y asignación: 4 minutos. Al pagar se revalida.
- Cliente no paga segundo envío en incidente. Culpa rider → `needs_n8n_uber` (sin createDelivery hasta n8n).
