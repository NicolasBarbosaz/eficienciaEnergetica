'use client';

import type { ReactNode } from 'react';

/**
 * Tooltip customizado para Recharts. Serve para substituir o padrão (fundo branco
 * fixo) e acompanhar o tema (seção 7.3).
 */
export function TooltipRecharts({
  titulo,
  linhas,
}: {
  titulo?: string;
  linhas: { rotulo: ReactNode; valor: ReactNode }[];
}) {
  return (
    <div className="rounded-md border border-borda bg-superficie px-3 py-2 text-xs text-tinta shadow-sm">
      {titulo && <div className="mb-1 font-semibold">{titulo}</div>}
      <dl className="space-y-0.5">
        {linhas.map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4">
            <dt className="text-tinta-3">{l.rotulo}</dt>
            <dd className="font-medium tabular-nums">{l.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
