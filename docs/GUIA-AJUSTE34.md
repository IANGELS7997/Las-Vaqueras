# GUIA-AJUSTE34

Esta es la guía 34. La siguiente implementación se llama `GUIA-AJUSTE35`. El número sigue al 33 y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. El cobro, el ticket y el workflow de pago en n8n se quedan como están. Solo se guarda la hora en que el ticket sí salió.
3. Al terminar: commit, merge a `main` y deploy de la tienda.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- El correo «¿Cómo estuvo tu pedido?» sale 85 minutos después del ticket, no 45 minutos después de la entrega.
- La hora se guarda en el pedido cuando Resend acepta el ticket. Si el ticket no sale, la calificación tampoco.
- Los pedidos de antes de este ajuste no tienen esa hora y no reciben el correo.
- En Hobby el cron de Vercel no corre. La base llama la ruta cada 5 minutos. Un pedido solo se marca una vez.

## Qué decir en el local

Para el dueño: el cliente recibe el correo de estrellas una hora y veinticinco minutos después de su ticket. Las ventas de ayer y las anteriores no lo reciben.
