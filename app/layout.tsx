import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/lib/cart-context';
import { FulfillmentProvider } from '@/lib/fulfillment-context';
import { OrdersProvider } from '@/lib/orders-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://pureiangel.com';
const SITE_TITLE = 'Las Vaqueras | Papas, Boneless y Hamburguesas a Domicilio';
const SITE_DESCRIPTION =
  'Pide tus Papas Vaqueras, Boneless, Hamburguesas y Tortas a domicilio en Chihuahua. Entrega rápida y pago en línea.';
const SHARE_IMAGE = '/hero/hero-1.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: 'Las Vaqueras',
    locale: 'es_MX',
    images: [
      {
        url: SHARE_IMAGE,
        width: 717,
        height: 1024,
        alt: 'Las Vaqueras — papas, boneless y hamburguesas a domicilio en Chihuahua',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <CartProvider>
          <FulfillmentProvider>
            <OrdersProvider>
              <div className="flex min-h-screen flex-col">
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </div>
            </OrdersProvider>
          </FulfillmentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
