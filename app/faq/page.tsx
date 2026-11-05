import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleHelp } from 'lucide-react';
import { FaqList } from '@/components/faq-list';
import { FAQ_CATEGORIES, faqJsonLd } from '@/lib/faq';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes | Las Vaqueras',
  description: 'Pedidos, envío y pago de Las Vaqueras en Chihuahua.',
};

export default function FaqPage() {
  const jsonLd = JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c');

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15">
          <CircleHelp className="h-6 w-6 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Preguntas frecuentes</h1>
          <p className="text-sm text-muted-foreground">Las Vaqueras · Pedidos en Chihuahua</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <FaqList categories={FAQ_CATEGORIES} />
        <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          Las condiciones completas están en{' '}
          <Link href="/terminos" className="text-brand-400 underline-offset-2 hover:underline">
            Términos y Condiciones
          </Link>.
        </p>
      </div>
    </div>
  );
}
