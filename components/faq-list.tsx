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

function FaqLinks({ links, itemId }: { links: FaqLink[]; itemId: string }) {
  return (
    <ul className="mt-2 space-y-1 text-base">
      {links.map((link) => (
        <li key={`${itemId}-${link.href}-${link.label}`}>
          <FaqAnchor link={link} />
        </li>
      ))}
    </ul>
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
                {item.blocks && item.blocks.length > 0 ? (
                  <div className="space-y-4">
                    {item.blocks.map((block) => (
                      <div key={`${item.id}-${block.title}`}>
                        <p className="text-base font-semibold text-white">{block.title}</p>
                        {block.lines.map((line) => (
                          <p key={line} className="text-base leading-relaxed text-white/80">
                            {line}
                          </p>
                        ))}
                        {block.links && block.links.length > 0 ? (
                          <FaqLinks links={block.links} itemId={`${item.id}-${block.title}`} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base leading-relaxed text-white/80">{item.answer}</p>
                )}
                {item.links && item.links.length > 0 ? <FaqLinks links={item.links} itemId={item.id} /> : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </section>
      ))}
    </Accordion>
  );
}
