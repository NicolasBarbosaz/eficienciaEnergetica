'use client';

import { AlertCircle, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAlerta } from '@/api/hooks/useAlertas';
import type { Alerta } from '@/api/tipos';
import { CardRecomendacoes } from '@/components/painel/CardRecomendacoes';
import { TooltipRecharts } from '@/components/graficos/TooltipRecharts';
import { formatKw, formatRs } from '@/lib/format';
import { estiloSituacao } from '@/lib/regras';
import { estiloDoNivel } from './AlertasTela';

const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function rotuloMesLongo(mesStr: string): string {
  const [ano, mes] = mesStr.split('-');
  const nome = NOMES_MES[Number(mes) - 1] ?? mes;
  return `${nome} de ${ano}`;
}

export function AlertaTela({ id }: { id: string }) {
  const consulta = useAlerta(id);

  if (consulta.isPending) {
    return <div className="text-tinta-3">Carregando alerta…</div>;
  }
  if (consulta.isError || !consulta.data) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-multa-borda bg-multa-fundo p-4 text-multa-texto"
      >
        <AlertCircle aria-hidden className="h-5 w-5" />
        <div>
          <p>API indisponível para carregar este alerta.</p>
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

  if (consulta.data.status === 'nao_encontrado') {
    return (
      <div className="mx-auto max-w-[640px] space-y-4">
        <Link
          href="/alertas"
          className="inline-flex items-center gap-1 text-sm text-tinta-2 hover:text-tinta"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar para alertas
        </Link>
        <section className="rounded-xl border border-borda bg-superficie p-6 text-center">
          <AlertCircle aria-hidden className="mx-auto h-6 w-6 text-tinta-3" />
          <p className="mt-2 font-medium text-tinta">Alerta não encontrado</p>
          <p className="mt-1 text-sm text-tinta-3">
            Ele pode ter sumido com um envio novo de medição.
          </p>
        </section>
      </div>
    );
  }

  const alerta = consulta.data.dados;
  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <Link
        href="/alertas"
        className="inline-flex items-center gap-1 text-sm text-tinta-2 hover:text-tinta"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Voltar para alertas
      </Link>

      <Cabecalho alerta={alerta} />

      {alerta.tipo === 'risco_proximo_mes' ? (
        <DetalheRisco alerta={alerta} />
      ) : (
        <DetalheMulta alerta={alerta} />
      )}
    </div>
  );
}

function Cabecalho({ alerta }: { alerta: Alerta }) {
  const estilo = estiloDoNivel(alerta.nivel);
  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo.classes.chip}`}
        >
          <estilo.Icone aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-tinta-3">{estilo.rotulo}</p>
          <h1 className="text-xl font-semibold text-tinta">{alerta.titulo}</h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-tinta-2">{alerta.mensagem}</p>
    </section>
  );
}

function DetalheRisco({ alerta }: { alerta: Alerta }) {
  const d = alerta.detalhe;
  if (!d?.previsao) return null;
  const previsao = d.previsao;

  return (
    <div className="space-y-4">
      {previsao.meses_historico.length > 0 && (
        <section className="rounded-xl border border-borda bg-superficie p-6">
          <h2 className="text-base font-semibold">Mesmo mês em anos anteriores</h2>
          <p className="mt-1 text-sm text-tinta-3">
            Limite de multa no contrato atual: {formatKw(d.limite_kw)}.
          </p>
          <div className="mt-4 h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={previsao.meses_historico.map((h) => ({
                  rotulo: h.mes.slice(0, 4),
                  pico_kw: h.pico_kw,
                  situacao: h.situacao,
                }))}
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="rotulo"
                  tick={{ fill: 'var(--tinta-3)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--eixo)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--tinta-3)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--eixo)' }}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip cursor={{ fill: 'var(--menu-ativo)' }} content={<TooltipHistorico />} />
                <ReferenceLine
                  y={d.limite_kw}
                  stroke="var(--multa-linha)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Limite ${formatKw(d.limite_kw)}`,
                    position: 'right',
                    fill: 'var(--multa-texto)',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="pico_kw" radius={[4, 4, 0, 0]}>
                  {previsao.meses_historico.map((h) => (
                    <Cell key={h.mes} fill={estiloSituacao[h.situacao].vars.preenchimento} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-borda bg-superficie p-6">
        <h2 className="text-base font-semibold">Pico típico previsto</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-tinta">
          {formatKw(previsao.pico_tipico_kw)}
        </p>
        <p className="mt-1 text-sm text-tinta-3">
          Faixa: {formatKw(previsao.pico_tipico_min_kw)} a {formatKw(previsao.pico_tipico_max_kw)}
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-md border border-divisoria bg-menu px-4 py-3 text-sm text-tinta-2">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            O modelo prevê a demanda típica; o risco de multa vem do histórico do mesmo mês.
          </span>
        </div>
      </section>

      {d.recomendacoes && d.recomendacoes.length > 0 && (
        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">O que fazer</h2>
          <CardRecomendacoes recomendacoes={d.recomendacoes} />
        </div>
      )}

      <div>
        <Link
          href="/painel"
          className="inline-flex items-center justify-center rounded-md bg-tinta px-4 py-2 text-sm font-semibold text-pagina hover:opacity-90"
        >
          Ver no painel
        </Link>
      </div>
    </div>
  );
}

function DetalheMulta({ alerta }: { alerta: Alerta }) {
  const d = alerta.detalhe;
  if (!d) return null;
  const pico = d.pico_kw;
  const excedente = pico !== undefined ? pico - d.limite_kw : null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-borda bg-superficie p-6">
        <h2 className="text-base font-semibold">{rotuloMesLongo(alerta.mes)}</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-[auto_1fr]">
          <dt className="text-tinta-3">Pico</dt>
          <dd className="tabular-nums text-tinta">
            {pico !== undefined ? formatKw(pico) : '—'}
          </dd>
          <dt className="text-tinta-3">Limite</dt>
          <dd className="tabular-nums">{formatKw(d.limite_kw)}</dd>
          <dt className="text-tinta-3">Excedente</dt>
          <dd className="tabular-nums text-multa-texto">
            {excedente !== null ? formatKw(excedente) : '—'}
          </dd>
          {d.ultrapassagem_rs !== undefined && (
            <>
              <dt className="text-tinta-3">Ultrapassagem</dt>
              <dd className="tabular-nums text-multa-texto">
                {formatRs(d.ultrapassagem_rs)}
              </dd>
            </>
          )}
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/contrato-ideal"
          className="inline-flex items-center justify-center rounded-md bg-tinta px-4 py-2 text-sm font-semibold text-pagina hover:opacity-90"
        >
          Simular contrato
        </Link>
        <Link
          href="/historico"
          className="inline-flex items-center justify-center rounded-md border border-borda bg-superficie px-4 py-2 text-sm font-medium text-tinta hover:bg-menu"
        >
          Ver histórico
        </Link>
      </div>
    </div>
  );
}

type TooltipPayload = {
  payload?: { rotulo: string; pico_kw: number; situacao: keyof typeof estiloSituacao };
};

function TooltipHistorico({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload;
  return (
    <TooltipRecharts
      titulo={p.rotulo}
      linhas={[
        { rotulo: 'Pico', valor: formatKw(p.pico_kw) },
        { rotulo: 'Situação', valor: estiloSituacao[p.situacao].rotulo },
      ]}
    />
  );
}

