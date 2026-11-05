import { BRANCHES, type Branch } from '@/lib/branches';
import { SERVICE_MAX_M } from '@/lib/iangel-constants';
import { JUMBO_PRODUCT_NAME, foodDiscountPercentLabel } from '@/lib/loyalty';
import { CATEGORIES } from '@/lib/mock-data';
import { CUSTOMER_STEPS, kitchenStatusLabel } from '@/lib/order-lifecycle';
import { PICKUP_LEAD_MINUTES, PICKUP_SLOT_MINUTES } from '@/lib/pickup-slots';
import { RESTAURANT_INFO } from '@/lib/restaurant';
import { WAIT_CLOSE_SECONDS } from '@/lib/rider-help';

export type FaqLink = { href: string; label: string };

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  links?: FaqLink[];
};

export type FaqCategory = {
  id: string;
  title: string;
  items: FaqItem[];
};

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function branchName(branch: Branch) {
  return branch.shortName.replace(/^Sucursal /, '');
}

function place(branch: Branch) {
  return `${branch.street}, ${branch.zipCode}, Chihuahua`;
}

function hoursSpoken(branch: Branch) {
  return branch.hoursLabel.replace(' - ', ' a ');
}

function closesAt(branch: Branch) {
  return branch.hoursLabel.split(' - ')[1] || branch.hoursLabel;
}

function joinSteps(steps: readonly string[]) {
  if (steps.length < 2) return steps.join('');
  return `${steps.slice(0, -1).join(', ')} y ${steps[steps.length - 1]}`;
}

const centro = BRANCHES.find((branch) => branch.id === 'centro') || BRANCHES[0];
const norte = BRANCHES.find((branch) => branch.id === 'norte') || BRANCHES[1];
const sur = BRANCHES.find((branch) => branch.id === 'sur') || BRANCHES[2];
const supportEmail = RESTAURANT_INFO.email;
const supportPhone = centro.phone;
const mailto = `mailto:${supportEmail}`;
const supportTel = telHref(supportPhone);
const firstOff = foodDiscountPercentLabel('first_30');
const fifthOff = foodDiscountPercentLabel('fifth_20');
const kidsName = CATEGORIES.find((category) => category.id === 'peques')?.name || 'Para los peques';
const waitMinutes = Math.round(WAIT_CLOSE_SECONDS / 60);
const readyToPickup = kitchenStatusLabel('in_transit', 'pickup');

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'como-pedir',
    title: 'Cómo pedir',
    items: [
      {
        id: 'como-pedir-sucursal',
        question: '¿Cómo hago un pedido?',
        answer:
          'Entras a lasvaqueras.com.mx, eliges sucursal y luego domicilio o recoger en tienda. El pedido existe cuando el pago queda confirmado. Si la sucursal está cerrada puedes ver el menú, sin agregar ni pagar.',
      },
      {
        id: 'como-pedir-ubicacion',
        question: '¿Tengo que compartir mi ubicación?',
        answer:
          'No. Si la compartes, te mostramos la sucursal más cercana como recomendada y tú confirmas. Si no das permiso, ves Norte, Centro y Sur y eliges una.',
      },
      {
        id: 'como-pedir-carrito',
        question: '¿Se borra mi carrito si cambio de sucursal o de modo?',
        answer: 'No. El carrito se queda mientras no cierres la pestaña.',
      },
      {
        id: 'como-pedir-minimo',
        question: '¿Hay un mínimo de compra?',
        answer: 'No. Pagas la comida más el envío.',
      },
      {
        id: 'como-pedir-cerrado',
        question: '¿Puedo pedir con la tienda cerrada?',
        answer:
          'Puedes ver el menú. Agregar y pagar se habilitan cuando esa sucursal abre. Un producto agotado aparece como agotado y no se puede pedir.',
      },
    ],
  },
  {
    id: 'sucursales',
    title: 'Sucursales y horarios',
    items: [
      {
        id: 'sucursales-cuales',
        question: '¿Cuáles son las sucursales?',
        answer: BRANCHES.map(
          (branch) =>
            `${branchName(branch)}: ${place(branch)}. Todos los días, ${hoursSpoken(branch)}. Teléfono ${branch.phone}.`
        ).join(' '),
        links: BRANCHES.map((branch) => ({
          href: telHref(branch.phone),
          label: `${branchName(branch)} ${branch.phone}`,
        })),
      },
      {
        id: 'sucursales-horario',
        question: '¿El horario de abajo es el de las tres?',
        answer: `No. Cada sucursal tiene su horario. Después de elegirla, lo ves en la cabecera. ${branchName(centro)} cierra a las ${closesAt(centro)}, ${branchName(norte)} a las ${closesAt(norte)} y ${branchName(sur)} a las ${closesAt(sur)}. Abren todos los días.`,
      },
      {
        id: 'sucursales-festivos',
        question: '¿Hay horario de días festivos?',
        answer:
          'No publicamos un calendario distinto. Si esa sucursal está cerrada, la página lo muestra y el menú se puede ver sin pedir.',
      },
    ],
  },
  {
    id: 'domicilio',
    title: 'Domicilio y recoger',
    items: [
      {
        id: 'domicilio-alcance',
        question: '¿Hasta dónde llegan?',
        answer: `Hasta ${SERVICE_MAX_M} metros en línea recta desde la sucursal que elegiste. Más lejos no hay domicilio: solo recoger en esa tienda.`,
      },
      {
        id: 'domicilio-tiempo',
        question: '¿Cuánto tarda?',
        answer: `El tiempo estimado es de hasta 45 minutos. De 4.5 a 5 km, hasta 1 hora. Puede cambiar por el volumen de pedidos, el tráfico y el clima. Si el rider de la casa va en otro pedido, el tuyo puede tardar de 35 a 45 minutos. Para recoger, eliges un horario en saltos de ${PICKUP_SLOT_MINUTES} minutos y el primero queda a partir de ${PICKUP_LEAD_MINUTES} minutos.`,
      },
      {
        id: 'domicilio-puerta',
        question: '¿Puedo pedir que lo dejen en la puerta?',
        answer: `Sí, es opcional al pedir a domicilio. El repartidor deja el pedido y no espera a que salgas. Si no lo encuentras, eso no cuenta como pedido no entregado. Si no elegiste dejarlo en la puerta y te lleva el rider de la casa, espera unos ${waitMinutes} minutos.`,
      },
    ],
  },
  {
    id: 'pago',
    title: 'Pago',
    items: [
      {
        id: 'pago-como',
        question: '¿Cómo pago?',
        answer:
          'En línea, con Apple Pay, Google Pay o tarjeta. El botón dice Apple Pay / Google Pay y también abre el formulario de tarjeta.',
      },
      {
        id: 'pago-precio',
        question: '¿El precio del menú es el que pago?',
        answer: 'Sí. El menú ya muestra el precio en pesos. El total es la comida más el envío. No hay cuota de servicio.',
      },
      {
        id: 'pago-factura',
        question: '¿Puedo facturar?',
        answer:
          'Sí. En el pedido ya cobrado y en el correo del ticket está el botón Facturación. Abre un formulario para pedirla.',
      },
    ],
  },
  {
    id: 'promociones',
    title: 'Promociones',
    items: [
      {
        id: 'promociones-pedidos',
        question: '¿Hay promociones por mis pedidos?',
        answer: `Sí, en Mi perfil, ligadas a tu teléfono. El pedido 1 tiene ${firstOff} en la comida de ese pedido. El pedido 5 tiene ${fifthOff} en la comida. En el pedido 10, al pagar, recibes un cupón de una ${JUMBO_PRODUCT_NAME} con 30 días para canjearlo. El descuento no aplica al envío. Estas tres promos no se repiten ni se reinician.`,
      },
    ],
  },
  {
    id: 'mi-pedido',
    title: 'Mi pedido',
    items: [
      {
        id: 'mi-pedido-estado',
        question: '¿Dónde veo el estado?',
        answer: `En el correo «Tu ticket», que sale de Las Vaqueras. El enlace «Ver mi pedido» abre el seguimiento. Los pasos de domicilio son: ${joinSteps(CUSTOMER_STEPS)}. En recoger, cuando está listo verás «${readyToPickup}».`,
      },
      {
        id: 'mi-pedido-perfil',
        question: '¿Cómo entro a Mi perfil?',
        answer:
          'Con el nombre, apellido y celular de tu primer pedido, desde el icono de perfil. El enlace del correo también puede abrirlo. Ahí están tus pedidos, tus promociones, facturación y, si aplica, la solicitud de revisión.',
      },
      {
        id: 'mi-pedido-calificar',
        question: '¿Puedo calificar el pedido?',
        answer: 'Sí. Cuando queda entregado puedes calificarlo del 1 al 5.',
      },
      {
        id: 'mi-pedido-instalar',
        question: '¿Puedo agregar la página al inicio del celular?',
        answer: 'Sí. Desde aquí puedes dejar el acceso en la pantalla de inicio.',
        links: [{ href: '/instalar', label: 'Agregar la app al inicio' }],
      },
    ],
  },
  {
    id: 'si-algo-sale-mal',
    title: 'Si algo sale mal',
    items: [
      {
        id: 'si-algo-sale-mal-cancelar',
        question: '¿Puedo cancelar o pedir que me devuelvan el dinero?',
        answer:
          'No. Al confirmar el pago, el pedido pasa de inmediato a preparación y es venta final: no admite cancelación ni devolución. En efectivo, al confirmar, tampoco se hacen cambios ni devoluciones.',
      },
      {
        id: 'si-algo-sale-mal-revision',
        question: '¿Y si faltó algo o llegó mal?',
        answer:
          'En Mi perfil puedes solicitar una revisión. Los motivos son: faltó un producto, llegó equivocado, llegó en mal estado, faltó un extra, u otro. Te pedimos una nota, una foto de la comida y una foto del ticket. Enviar la solicitud no significa que se apruebe. Si se acepta y pagaste con tarjeta, el total vuelve a tu tarjeta. Si se acepta y pagaste en efectivo, la comida y el envío quedan a favor en tu próxima compra.',
      },
      {
        id: 'si-algo-sale-mal-tienda',
        question: '¿Y si la tienda no puede preparar el pedido?',
        answer: `Escríbenos a ${supportEmail} o llama al ${supportPhone}.`,
        links: [
          { href: mailto, label: supportEmail },
          { href: supportTel, label: supportPhone },
        ],
      },
      {
        id: 'si-algo-sale-mal-alergenos',
        question: '¿Publican alérgenos?',
        answer: 'El menú no lista alérgenos. Si tienes una alergia, llama a la sucursal antes de pedir.',
      },
      {
        id: 'si-algo-sale-mal-ninos',
        question: '¿Hay comida para niños?',
        answer: `En el menú está la categoría «${kidsName}». El pedido lo hace un adulto.`,
      },
    ],
  },
  {
    id: 'contacto',
    title: 'Contacto y datos',
    items: [
      {
        id: 'contacto-donde',
        question: '¿Dónde los contacto?',
        answer: `Correo ${supportEmail}. El teléfono y la dirección dependen de la sucursal; están en la pregunta de sucursales. Para una duda de un pedido ya pagado, usa también el perfil. El correo noreply del ticket no es un buzón de atención.`,
        links: [
          { href: mailto, label: supportEmail },
          { href: '#sucursales-cuales', label: 'Ver sucursales' },
        ],
      },
      {
        id: 'contacto-datos',
        question: '¿Qué hacen con mis datos?',
        answer: `Usamos tu nombre, teléfono y dirección para preparar y entregar el pedido, y tu correo para enviarte el ticket. El detalle está en el Aviso de Privacidad. Para derechos ARCO escribe a ${supportEmail} o llama al ${supportPhone}.`,
        links: [
          { href: '/privacidad', label: 'Aviso de Privacidad' },
          { href: mailto, label: supportEmail },
          { href: supportTel, label: supportPhone },
        ],
      },
    ],
  },
];

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_CATEGORIES.flatMap((category) =>
      category.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      }))
    ),
  };
}
