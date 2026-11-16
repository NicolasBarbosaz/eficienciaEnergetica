'use client';

import { CalendarRange, Clock, Settings2 } from 'lucide-react';
import Link from 'next/link';

import type { Recomendacao } from '@/api/tipos';

const ICONES = {
  contrato: Settings2,
  horario: Clock,
  sazonal: CalendarRange,
} as const;

export function CardRecomendacoes({ recomendacoes }: { recomendacoes: Recomendacao[] }) {
  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Recomendações</h2>
        <p className="text-sm text-tinta-3">
          Sugestões a partir da análise das medições.
        </p>
      </header>
      <ul className="space-y-3">
        {recomendacoes.map((r, i) => {
          const Icone = ICONES[r.tipo];
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-divisoria bg-menu p-4"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-borda bg-superficie text-tinta-2">
                <Icone aria-hidden className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium text-tinta">{r.titulo}</p>
                <p className="mt-1 text-sm text-tinta-2">{r.detalhe}</p>
              </div>
              {r.acao && (
                <Link
                  href={r.acao.rota}
                  className="shrink-0 rounded-md border border-borda bg-superficie px-3 py-1.5 text-sm font-medium text-tinta hover:bg-menu-ativo"
                >
                  {r.acao.rotulo}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
