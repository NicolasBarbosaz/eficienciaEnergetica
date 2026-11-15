'use client';

import { AlertTriangle, BarChart3, FileText, LayoutGrid, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAlertas } from '@/api/hooks/useAlertas';
import { BotaoTema } from '@/components/ui/BotaoTema';

const itens = [
  { href: '/painel', rotulo: 'Painel', Icone: LayoutGrid },
  { href: '/historico', rotulo: 'Histórico', Icone: FileText },
  { href: '/contrato-ideal', rotulo: 'Contrato ideal', Icone: BarChart3 },
  { href: '/alertas', rotulo: 'Alertas e relatórios', Icone: AlertTriangle },
  { href: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
] as const;

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const alertas = useAlertas();
  const contadorAlertas = alertas.data?.length ?? 0;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-borda bg-menu p-4 md:w-60 md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-tinta text-pagina" aria-hidden>
            <span className="text-sm font-semibold">A</span>
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">Antevê</div>
            <div className="text-xs text-tinta-3 leading-tight">Veja o pico antes da multa.</div>
          </div>
        </div>
        <nav aria-label="Principal" className="flex flex-row flex-wrap gap-1 md:flex-col">
          {itens.map(({ href, rotulo, Icone }) => {
            const ativo = pathname === href || pathname.startsWith(href + '/');
            const mostraContador = href === '/alertas' && contadorAlertas > 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={[
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  ativo ? 'bg-menu-ativo text-tinta' : 'text-tinta-2 hover:bg-menu-ativo hover:text-tinta',
                ].join(' ')}
              >
                <Icone aria-hidden className="h-4 w-4" />
                <span className="flex-1">{rotulo}</span>
                {mostraContador && (
                  <span
                    aria-label={`${contadorAlertas} alertas`}
                    className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-multa-preenchimento px-1.5 text-xs font-semibold text-white"
                  >
                    {contadorAlertas}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-borda bg-superficie px-6 py-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold leading-tight text-tinta">Antevê</div>
            <div className="truncate text-sm text-tinta-3">Nenhum arquivo enviado</div>
          </div>
          <BotaoTema />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
