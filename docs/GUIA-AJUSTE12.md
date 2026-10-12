# GUIA-AJUSTE12

Esta es la guía 12. La siguiente implementación se llama `GUIA-AJUSTE13`. El número sigue el de `GUIA-AJUSTE11` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta del mapa, el cobro y el ticket del cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- El domicilio se mide en línea recta desde la sucursal elegida hasta el pin del mapa. El metro no se redondea: 2900.0 m entra en el tramo y 2900.1 m pasa al siguiente.
- De 0 a 2900 m el envío es $39, de 2901 a 4000 m es $49 y de 4001 a 5000 m es $55. Desde 5001 m no hay envío y el cliente solo puede recoger en tienda.
- Esos tres precios los gestiona la sucursal y se pagan solo con tarjeta. Norte y Sur los usan mientras la sucursal está abierta.
- En Centro, si iAngel está en servicio y es antes de las 21:00, de 0 a 4000 m sigue en $50. De 4001 a 5000 m son $55 aunque iAngel esté conectado.
- En Centro, si iAngel está apagado, o ya pasaron las 21:00 y la tienda sigue abierta, se usa la escala de $39, $49 y $55 hasta el cierre.
- El 15% de la comida cobrada no se toca. Los pedidos ya cobrados no se recalculan. La app del rider sigue cobrando $50 en puerta.

## Repos de este ajuste

- `Las-Vaqueras-main`: tarifas y radio de domicilio.
