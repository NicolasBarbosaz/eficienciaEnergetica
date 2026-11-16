'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { useAlertas } from '@/api/hooks/useAlertas';
import type { Alerta, NivelAlerta } from '@/api/tipos';
import { estiloRisco, estiloSituacao } from '@/lib/regras';

export function AlertasTela() {
  const consulta = useAlertas();

  if (consulta.isPending) {
    return <div className="text-tinta-3">Carregando alertas…</div>;
  }
  if (consulta.isError || !consulta.data) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-multa-borda bg-multa-fundo p-4 text-multa-texto"
      >
        <AlertCircle aria-hidden className="h-5 w-5" />
        <div>
          <p>API indisponível para carregar os alertas.</p>
          <button
            type="button"
            onClick={() => consulta.refetch()}
            className="mt-2 inline-flex items-center rounded-md border border-multa-borda bg-superficie px-3 py-1.5 text-xs font-medium text-multa-texto hover:bg-multa-fundo"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  const alertas = consulta.data;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Alertas e relatórios</h1>
        <p className="mt-1 text-sm text-tinta-3">
          Risco do próximo mês e multas registradas no período.
        </p>
      </header>

      {alertas.length === 0 ? (
        <section className="rounded-xl border border-borda bg-superficie p-6 text-center text-tinta-3">
          <AlertCircle aria-hidden className="mx-auto h-6 w-6" />
          <p className="mt-2 font-medium text-tinta">Nenhum alerta</p>
          <p className="mt-1 text-sm">Sem risco previsto e sem multas no período.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {alertas.map((a) => (
            <li key={a.id}>
              <LinhaAlerta alerta={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinhaAlerta({ alerta }: { alerta: Alerta }) {
  const estilo = estiloDoNivel(alerta.nivel);
  return (
    <Link
      href={`/alertas/${alerta.id}`}
      className="flex items-start gap-4 rounded-xl border border-borda bg-superficie p-4 hover:bg-menu"
    >
      <span
        className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo.classes.chip}`}
      >
        <estilo.Icone aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-tinta">{alerta.titulo}</p>
        <p className="mt-1 text-sm text-tinta-2">{alerta.mensagem}</p>
      </div>
      <ChevronRight aria-hidden className="mt-2 h-5 w-5 shrink-0 text-tinta-3" />
    </Link>
  );
}

export function estiloDoNivel(nivel: NivelAlerta) {
  if (nivel === 'multa') return estiloSituacao.multa;
  return estiloRisco[nivel];
}
