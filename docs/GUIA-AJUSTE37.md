# GUIA-AJUSTE37

Esta es la guía 37. La siguiente implementación se llama `GUIA-AJUSTE38`. El número sigue al 36 y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Solo cambia el tiempo del correo de calificación. El texto, la página del pedido y los demás correos se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de la tienda.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- El correo «Califica tu experiencia» sale 90 minutos después del ticket.
- Sigue contando desde el ticket, no desde la entrega.
- El cron sigue revisando cada 5 minutos y manda el correo en la primera revisión después de esos 90 minutos.

## Qué decir en el local

Para el dueño: el cliente recibe el correo para calificar 90 minutos después de que salió su ticket.
