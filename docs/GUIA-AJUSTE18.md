# GUIA-AJUSTE18

Esta es la guía 18. La siguiente implementación se llama `GUIA-AJUSTE19`. El número sigue el de `GUIA-AJUSTE17`.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo el aviso interno de un problema. El cobro, el efectivo, el ticket, el viaje y la cocina se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de Las Vaqueras. El flujo de avisos se publica junto con el cambio.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Un problema en la pantalla de pago, o un pago que no cierra, manda un correo en español.
- El asunto dice la falla. Si la tarjeta no cobró, el asunto empieza con «Urgente».
- El cuerpo dice qué pasó, si esa persona puede pedir, y los datos que ya escribió: nombre, apellido, teléfono, correo, sucursal, domicilio o recoger, dirección o hora, y el carrito.
- Si un dato todavía no está escrito, el correo lo dice. El número de la tarjeta no viaja.
- Visitas, carritos que solo se actualizan, clics sueltos y el ruido conocido siguen sin correo.

## Qué decir en el local

Para el dueño: si alguien no puede pagar, el correo dice quién es y qué se le trabó. No hay que adivinarlo. La tienda no se apaga por este aviso.

Para cocina y caja: la pantalla no cambia.

Para el cliente: no recibe este correo. Sigue pidiendo igual.

## Repos de este ajuste

- `Las-Vaqueras-main`: el aviso lleva los datos del cliente.
- Flujo n8n `Las Vaqueras: avisos dev`: el correo se escribe en español.
