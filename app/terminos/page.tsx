import { FileText } from 'lucide-react';
import { RESTAURANT_INFO } from '@/lib/restaurant';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Aceptación de términos',
      content:
        'Al utilizar la plataforma de pedidos en línea de Las Vaqueras, usted acepta en su totalidad los presentes términos y condiciones de uso. Si no está de acuerdo, le pedimos que no utilice nuestro servicio.',
    },
    {
      title: '2. Servicio de entrega',
      content:
        'El tiempo estimado de todo pedido es de hasta 45 minutos. Te pedimos realizarlo con anticipación. En domicilio de 4.5 a 5.5 km el tiempo estimado es de hasta 1 hora y el costo de envío es mayor. Los tiempos pueden variar según el volumen de pedidos, el tráfico y el clima.',
    },
    {
      title: '3. Precios y pagos',
      content:
        'En recoger, el envío es $0. Con Uber Direct apagado, en domicilio de 0 a 4000 m y en turno IANGEL (12:00–21:00), el envío es $50. Si el rider está ocupado, el envío sigue en $50 con aviso de 35 a 45 min. De 4001 a 5500 m el envío es la cotización de Uber Direct menos el 3%, aunque el rider no tenga Uber Direct encendido. Si el rider lo enciende, de 0 a 5500 m el envío también es esa cotización. Más de 5500 m no hay domicilio; puede recoger en tienda. Todos los precios están expresados en pesos mexicanos (MXN). El pago en línea es requisito para que el pedido exista.',
    },
    {
      title: '4. Pedidos confirmados',
      content:
        'Al confirmar el pago, el pedido se envía de inmediato a preparación y se considera venta final: no admite cancelación ni devolución. El ticket se imprime en caja y la orden pasa a cocina. El uso de la plataforma implica la aceptación de esta condición. Si el restaurante no puede cumplir el pedido (por ejemplo, cierre o producto no disponible), el contacto es ' +
        RESTAURANT_INFO.email +
        ' o ' +
        RESTAURANT_INFO.phone +
        '.',
    },
    {
      title: '5. Disponibilidad de productos',
      content:
        'Los productos mostrados en la plataforma están sujetos a disponibilidad. Nos reservamos el derecho de deshabilitar productos temporal o permanentemente sin previo aviso.',
    },
    {
      title: '6. Responsabilidad',
      content:
        'Las Vaqueras no se hace responsable por retrasos causados por circunstancias fuera de nuestro control. La responsabilidad se limita al valor del pedido realizado.',
    },
    {
      title: '7. Contacto',
      content:
        'Para cualquier duda sobre estos términos, puede contactarnos en: ' +
        RESTAURANT_INFO.email +
        ', ' +
        RESTAURANT_INFO.phone +
        ' o en nuestro domicilio: ' +
        RESTAURANT_INFO.address +
        '.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15">
          <FileText className="h-6 w-6 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Términos y Condiciones</h1>
          <p className="text-sm text-muted-foreground">Las Vaqueras · Servicio de pedidos en línea</p>
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-1.5 text-sm font-bold text-brand-400">{section.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.content}</p>
          </div>
        ))}

        <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>Última actualización: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
