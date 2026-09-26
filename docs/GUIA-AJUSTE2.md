# GUIA-AJUSTE2

Esta es la guía 2. La siguiente implementación se llama `GUIA-AJUSTE3`. El número sigue el de `GUIA-AJUSTE1` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta, la navegación, el cobro y el ticket del cliente se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Con Uber Direct apagado, un pedido de 0 a 4 km en turno (12:00–21:00) sigue llegando a IANGEL a $50. Si el rider va ocupado, sigue la espera de 35 a 45 min.
- Con Uber Direct activado, cualquier pedido nuevo de 0 a 4.500 m sale por Uber Direct, también si el rider está conectado. Sirve para no cortar el domicilio de Las Vaqueras cuando el rider tiene un incidente.
- Más de 4.500 m sigue sin domicilio.
- Con el botón apagado, de 4.001 a 4.500 m y fuera de turno no hay domicilio.

## Repos de este ajuste

- `Las-Vaqueras-main`: ruteo del domicilio y texto de términos.
- `APP-PUREIANGEL`: el botón Uber Direct explica qué pedidos salen por Uber.
