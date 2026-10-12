# GUIA-AJUSTE11

Esta es la guía 11. La siguiente implementación se llama `GUIA-AJUSTE12`. El número sigue el de `GUIA-AJUSTE10` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta del mapa, el cobro y el ticket del cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Abrir turno ya no suena como pedido nuevo. El clic solo autoriza el audio del navegador, en silencio.
- Cerrar turno corta el aviso si todavía estaba sonando, y no dispara otro.
- Un pedido que ya estaba en la lista al abrir el turno no suena. Si la impresión automática está prendida y la comanda no se había visto, sí puede imprimirse.
- El sonido queda para cada pedido nuevo, ya con el turno abierto, y para el botón Probar alerta.
- El 15% de la comida cobrada no se toca. Uber Direct sigue en 90% de la carta. Los pedidos ya cobrados no se recalculan.

## Repos de este ajuste

- `Las-Vaqueras-main`: silencio al abrir y cerrar el turno de cocina.
