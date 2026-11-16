'use client';

import { AlertCircle } from 'lucide-react';

import { useAnaliseResumo, usePicosMensais } from '@/api/hooks/useAnalise';
import type { AnaliseResumo, PicoMensal } from '@/api/tipos';
import { formatData, formatHora, formatKw, formatRs, rotuloMes } from '@/lib/format';
import { estiloSituacao } from '@/lib/regras';

export function HistoricoTela() {
  const resumo = useAnaliseResumo();
  const picos = usePicosMensais();

  if (resumo.isPending || picos.isPending) {
    return <div className="text-tinta-3">Carregando histórico…</div>;
  }
  if (resumo.isError || picos.isError || !resumo.data || !picos.data) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-multa-borda bg-multa-fundo p-4 text-multa-texto"
      >
        <AlertCircle aria-hidden className="h-5 w-5" />
        <div>
          <p>API indisponível para carregar o histórico.</p>
          <button
            type="button"
            onClick={() => {
              resumo.refetch();
              picos.refetch();
            }}
            className="mt-2 inline-flex items-center rounded-md border border-multa-borda bg-superficie px-3 py-1.5 text-xs font-medium text-multa-texto hover:bg-multa-fundo"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  return <Conteudo resumo={resumo.data} picos={picos.data} />;
}

function Conteudo({ resumo, picos }: { resumo: AnaliseResumo; picos: PicoMensal[] }) {
  const totalFaturada = picos.reduce((s, p) => s + (p.faturada_rs ?? 0), 0);
  const totalUltrapassagem = picos.reduce((s, p) => s + (p.ultrapassagem_rs ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="mt-1 text-sm text-tinta-3">
          {resumo.meses_com_dados} de {resumo.meses_no_arquivo} meses com dados · contratada{' '}
          {formatKw(resumo.contratada_kw)} · limite {formatKw(resumo.limite_multa_kw)} · tarifa{' '}
          {formatRs(resumo.tarifa_rs_kw)}/kW.
        </p>
      </header>

      <section className="rounded-xl border border-borda bg-superficie p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Histórico mês a mês com pico, situação, demanda faturada e ultrapassagem.
            </caption>
            <thead>
              <tr className="border-b border-borda text-left text-xs uppercase text-tinta-3">
                <th className="px-2 py-2 font-medium">Mês</th>
                <th className="px-2 py-2 font-medium">Pico</th>
                <th className="px-2 py-2 font-medium">Quando</th>
                <th className="px-2 py-2 font-medium">Situação</th>
                <th className="px-2 py-2 text-right font-medium">Demanda faturada</th>
                <th className="px-2 py-2 text-right font-medium">Ultrapassagem</th>
              </tr>
            </thead>
            <tbody>
              {picos.map((p) => (
                <Linha key={p.mes} pico={p} />
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 text-tinta-3">—</td>
                <td className="px-2 py-2 text-tinta-3">—</td>
                <td className="px-2 py-2 text-tinta-3">
                  {resumo.meses_com_multa} com multa
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatRs(totalFaturada)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-multa-texto">
                  {formatRs(totalUltrapassagem)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function Linha({ pico }: { pico: PicoMensal }) {
  const semDados = pico.situacao === 'sem_dados' || pico.pico_kw === null;
  const estilo = estiloSituacao[pico.situacao];
  return (
    <tr className="border-b border-divisoria">
      <td className="px-2 py-2">{rotuloMes(pico.mes)}</td>
      <td className="px-2 py-2 tabular-nums">
        {pico.pico_kw !== null ? formatKw(pico.pico_kw) : <span className="text-tinta-3">—</span>}
      </td>
      <td className="px-2 py-2 text-tinta-3">
        {pico.pico_em ? `${formatData(pico.pico_em)} ${formatHora(pico.pico_em)}` : '—'}
      </td>
      <td className="px-2 py-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${estilo.classes.chip}`}
        >
          <estilo.Icone aria-hidden className="h-3 w-3" />
          {estilo.rotulo}
        </span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {pico.faturada_rs !== null ? (
          formatRs(pico.faturada_rs)
        ) : (
          <span className="text-tinta-3">—</span>
        )}
      </td>
      <td
        className={[
          'px-2 py-2 text-right tabular-nums',
          !semDados && (pico.ultrapassagem_rs ?? 0) > 0 ? 'text-multa-texto' : '',
        ].join(' ')}
      >
        {pico.ultrapassagem_rs !== null && pico.ultrapassagem_rs > 0
          ? formatRs(pico.ultrapassagem_rs)
          : semDados
            ? '—'
            : formatRs(0)}
      </td>
    </tr>
  );
}
