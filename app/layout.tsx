import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/lib/cart-context';
import { FulfillmentProvider } from '@/lib/fulfillment-context';
import { OrdersProvider } from '@/lib/orders-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Las Vaqueras | Papas, Boneless y Hamburguesas a Domicilio',
  description:
    'Pide tus Papas Vaqueras, Boneless, Hamburguesas y Tortas a domicilio en Chihuahua. Entrega rápida y pago en línea.',
  manifest: '/manifest.webmanifest',
  themeColor: '#f97316',
  icons: {
    icon: '/logo-vaqueras.png',
    apple: '/logo-vaqueras.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Las Vaqueras',
    statusBarStyle: 'black-translucent',
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
