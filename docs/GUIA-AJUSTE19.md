# GUIA-AJUSTE19

Esta es la guía 19. La siguiente implementación se llama `GUIA-AJUSTE20`. El número sigue el de `GUIA-AJUSTE18` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo el aviso de un dato escrito en el checkout. Pedidos, cobro, cocina, registro, corte y el resto de avisos siguen igual.
3. Al terminar: commit, merge a `main` y deploy de la tienda, del panel y de la función de avisos.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Al salir de un campo del checkout, si el texto cambió y no está vacío, el panel lo muestra en Avisos, sección Checkout.
- El mismo momento manda un correo solo a iangels7997@gmail.com. El asunto dice el campo. El cuerpo dice el texto, la sucursal, si es entrega o recoger, el carrito, la página y la hora en Chihuahua.
- El nombre que ya viene de la cuenta, o un borrador restaurado, no avisa hasta que la persona lo cambia y sale del campo.
- El mismo texto no se repite. El mapa no cuenta. El número de tarjeta no viaja.
- Hay un tope de 24 avisos de este tipo por visita y hora.
- Si el correo no sale, el resumen de la mañana conserva ese aviso. Si sale, el resumen no lo repite.
- Estadísticas no cuentan estos avisos. El flujo de n8n de pagos que no cierran no cambia y no recibe este texto.

## Qué decir en el local

Para el dueño: cuando alguien escribe en el checkout, el aviso aparece en el panel y el correo llega solo a Angel. El cliente no recibe ese correo.

Para cocina y caja: la pantalla no cambia.

Para el cliente: sigue pidiendo igual. No ve este aviso.

## Repos de este ajuste

- `Las-Vaqueras-main`: el checkout avisa al salir de cada campo.
- `ADMIN-IANGEL`: Avisos muestra el dato y el correo sale al guardarlo.
