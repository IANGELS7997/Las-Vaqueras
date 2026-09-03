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
        'Los tiempos de entrega estimados son aproximados y pueden variar según el volumen de pedidos, tráfico y condiciones climáticas. El área de entrega está limitada a la ciudad de Chihuahua y zonas aledañas.',
    },
    {
      title: '3. Precios y pagos',
      content:
        'Los precios mostrados en la plataforma incluyen un recargo por servicio en línea. Los cargos adicionales incluyen una comisión por servicio y pago (4%) y una tarifa de entrega fija. Todos los precios están expresados en pesos mexicanos (MXN).',
    },
    {
      title: '4. Cancelaciones y reembolsos',
      content:
        'Los pedidos pueden cancelarse antes de que su estado cambie a "En Cocina". Una vez que el pedido entra en preparación, no es posible cancelarlo. Los reembolsos, cuando apliquen, se procesarán al método de pago original dentro de 3-5 días hábiles.',
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
