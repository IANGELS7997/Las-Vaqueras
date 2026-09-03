import { Shield } from 'lucide-react';
import { RESTAURANT_INFO } from '@/lib/restaurant';

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: '1. Responsable del tratamiento de datos',
      content: `Las Vaqueras, con domicilio en ${RESTAURANT_INFO.address}, es responsable del tratamiento de sus datos personales en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).`,
    },
    {
      title: '2. Datos personales recabados',
      content:
        'Recabamos los siguientes datos personales: nombre completo, número de teléfono, dirección de entrega y referencias de ubicación. Estos datos son utilizados únicamente para procesar y entregar sus pedidos.',
    },
    {
      title: '3. Finalidades del tratamiento',
      content:
        'Sus datos personales serán utilizados para: (a) procesar y gestionar pedidos, (b) coordinar la entrega a domicilio, (c) contactarle en caso de incidencias con su pedido, y (d) mantener un registro de transacciones.',
    },
    {
      title: '4. Conservación de datos',
      content:
        'Sus datos personales se conservarán durante el tiempo necesario para cumplir con las finalidades descritas y, en su caso, durante el periodo que requieran obligaciones legales o fiscales.',
    },
    {
      title: '5. Derechos ARCO',
      content:
        'Usted tiene derecho a acceder, rectificar, cancelar u oponerse al tratamiento de sus datos personales (derechos ARCO). Para ejercer estos derechos, puede contactarnos a través de nuestro teléfono: ' +
        RESTAURANT_INFO.phone +
        '.',
    },
    {
      title: '6. No transferencia de datos',
      content:
        'No transferimos sus datos personales a terceros, salvo cuando sea necesario para la entrega del pedido (empresa de mensajería) o por requerimiento legal.',
    },
    {
      title: '7. Cambios al aviso de privacidad',
      content:
        'Nos reservamos el derecho de actualizar este aviso de privacidad en cualquier momento. Le recomendamos revisarlo periódicamente.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15">
          <Shield className="h-6 w-6 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Aviso de Privacidad</h1>
          <p className="text-sm text-muted-foreground">Las Vaqueras · LFPDPPP</p>
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
          <p className="mt-1">
            Para dudas o sugerencias: {RESTAURANT_INFO.phone} · {RESTAURANT_INFO.address}
          </p>
        </div>
      </div>
    </div>
  );
}
