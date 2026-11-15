import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const plex = IBM_Plex_Sans({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Antevê',
  description: 'Veja o pico antes da multa.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-pagina text-tinta">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
