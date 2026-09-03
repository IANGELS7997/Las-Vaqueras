'use client';

import Link from 'next/link';
import { Flame, MapPin, Phone, Clock, Shield, FileText } from 'lucide-react';
import { RESTAURANT_INFO } from '@/lib/restaurant';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card mt-12">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-white">Las Vaqueras</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Las mejores Papas Vaqueras, Boneless y Hamburguesas a domicilio en Chihuahua.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Contacto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <span>{RESTAURANT_INFO.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-brand-500" />
                <a href={`tel:${RESTAURANT_INFO.phone}`} className="hover:text-brand-400">
                  {RESTAURANT_INFO.phone}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Horarios</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {RESTAURANT_INFO.hours.map((h) => (
                <li key={h.day} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-500" />
                    {h.day}
                  </span>
                  <span className="text-xs">{h.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Las Vaqueras. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacidad"
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand-400"
            >
              <Shield className="h-3.5 w-3.5" />
              Aviso de Privacidad
            </Link>
            <Link
              href="/terminos"
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand-400"
            >
              <FileText className="h-3.5 w-3.5" />
              Términos y Condiciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
