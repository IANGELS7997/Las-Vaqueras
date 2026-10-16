# GUIA-AJUSTE15

Esta es la guía 15. La siguiente implementación se llama `GUIA-AJUSTE16`. El número sigue el de `GUIA-AJUSTE14` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta del mapa, el cobro y el ticket del cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- En admin, Cocina tiene un switch por sucursal. Apagar cierra el turno, apaga la impresión automática y saca la computadora de cocina, para que deje de consultar el servidor.
- Prender solo quita el bloqueo. No abre el turno. En el local entran con su clave y pulsan Iniciar turno.
- Mientras está apagada, el login de esa sucursal dice que la cocina está apagada desde administración.
- El correo de ese cierre es el de turno cerrado. No sale la alerta de caída. Los pedidos ya pagados no se cancelan.
- Centro, Norte y Sur siguen viéndose Activa, Inactiva, o Turno abierto sin señal.

## Repos de este ajuste

- `ADMIN-IANGEL`: switch de Cocina y la acción que llama a Las Vaqueras.
- `Las-Vaqueras-main`: cierre del turno, sesión invalidada y login bloqueado mientras la sucursal está apagada.
