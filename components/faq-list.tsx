'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FaqCategory, FaqLink } from '@/lib/faq';

function FaqAnchor({ link }: { link: FaqLink }) {
  const className = 'text-brand-400 underline-offset-2 hover:underline';
  if (link.href.startsWith('/')) {
    return (
      <Link href={link.href} className={className}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

export function FaqList({ categories }: { categories: FaqCategory[] }) {
  const [open, setOpen] = useState('');

  useEffect(() => {
    const apply = () => {
      const id = window.location.hash.replace(/^#/, '');
      if (!id) return;
      const match = categories.some((category) => category.items.some((item) => item.id === id));
      if (match) setOpen(id);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [categories]);

  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="space-y-6">
      {categories.map((category) => (
        <section key={category.id} id={category.id} className="scroll-mt-[calc(var(--lv-header-h,6rem)+12px)]">
          <h2 className="mb-1 text-sm font-bold text-brand-400">{category.title}</h2>
          {category.items.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              id={item.id}
              className="scroll-mt-[calc(var(--lv-header-h,6rem)+12px)] border-border/60"
            >
              <AccordionTrigger className="py-4 text-left text-base font-semibold text-white hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-base leading-relaxed text-white/80">{item.answer}</p>
                {item.links && item.links.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-base">
                    {item.links.map((link) => (
                      <li key={`${item.id}-${link.href}-${link.label}`}>
                        <FaqAnchor link={link} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </section>
      ))}
    </Accordion>
  );
}
