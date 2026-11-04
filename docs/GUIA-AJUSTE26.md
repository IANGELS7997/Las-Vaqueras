# GUIA-AJUSTE26

Esta es la guía 26. La siguiente implementación se llama `GUIA-AJUSTE27`. El número sigue al 25 y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. El cobro, el reparto de dinero, el ticket de pago y el workflow de pago en n8n se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de Las Vaqueras. El panel y la función `iangel-ops` no cambian.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- En cocina, un pedido activo de Gestionar pedido tiene un campo de 4 dígitos y el botón Enviar clave. Si ya hay clave, el botón dice Reenviar clave.
- Recoger, IANGEL y Uber no muestran ese campo. Cada cocina solo puede enviar la clave de un pedido de su sucursal.
- El cliente recibe el mismo correo de clave de entrega. Angel recibe un aviso aparte en iangels7997@gmail.com, con el folio, la sucursal, el cliente y la clave.
- Ese aviso también sale cuando la clave se envía desde Pin a cliente. Los dos caminos guardan la clave y mandan los dos correos juntos.
- Si la clave se guardó y un correo no sale, cocina ve cuál falló. La clave no se borra.

## Qué decir en el local

Para el dueño: en un pedido que la sucursal gestiona, cocina escribe 4 dígitos y el cliente los recibe por correo. La misma clave queda en la tarjeta.
