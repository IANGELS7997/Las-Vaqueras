import { Shield } from 'lucide-react';
import { BRANCHES } from '@/lib/branches';
import { RESTAURANT_INFO } from '@/lib/restaurant';

const UPDATED = '5 de noviembre de 2026';

function branchPhones() {
  return BRANCHES.map((branch) => `${branch.shortName.replace(/^Sucursal /, '')} ${branch.phone}`).join(', ');
}

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: '1. Responsable del tratamiento de datos',
      content: `Las Vaqueras, con domicilio en ${RESTAURANT_INFO.address}, es responsable del tratamiento de sus datos personales en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).`,
    },
    {
      title: '2. Datos personales recabados',
      content:
        'Recabamos nombre completo, número de teléfono, correo electrónico, dirección de entrega y referencias de ubicación. Si comparte su ubicación desde el celular, se usa en ese momento para sugerir la sucursal más cercana y no se guarda como domicilio. Si solicita una revisión, también recabamos la nota, la foto de la comida y la foto del ticket. Si solicita factura, los datos de esa solicitud los escribe usted en el formulario de facturación.',
    },
    {
      title: '3. Finalidades del tratamiento',
      content:
        'Sus datos personales serán utilizados para: (a) procesar y gestionar pedidos, (b) coordinar la entrega a domicilio, (c) enviarle el ticket y contactarle si hay una incidencia, (d) mantener el registro de transacciones y las promociones ligadas a su teléfono, y (e) atender una solicitud de revisión o de factura cuando usted la envíe.',
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
        ' o al correo ' +
        RESTAURANT_INFO.email +
        '.',
    },
    {
      title: '6. No transferencia de datos',
      content:
        'No transferimos sus datos personales a terceros, salvo cuando sea necesario para la entrega del pedido (empresa de mensajería), el cobro con tarjeta, el envío del ticket por correo, la factura que usted solicite, o por requerimiento legal.',
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
          <p>Última actualización: {UPDATED}</p>
          <p className="mt-1">
            Correo {RESTAURANT_INFO.email}. Teléfono de la sucursal: {branchPhones()}. Domicilio de este aviso:{' '}
            {RESTAURANT_INFO.address}.
          </p>
        </div>
      </div>
    </div>
  );
}
