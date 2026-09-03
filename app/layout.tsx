import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/lib/cart-context';
import { OrdersProvider } from '@/lib/orders-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Las Vaqueras | Papas, Boneless y Hamburguesas a Domicilio',
  description:
    'Pide tus Papas Vaqueras, Boneless, Hamburguesas y Tortas a domicilio en Chihuahua. Entrega rápida y pago en línea.',
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
          <OrdersProvider>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </OrdersProvider>
        </CartProvider>
      </body>
    </html>
  );
}
