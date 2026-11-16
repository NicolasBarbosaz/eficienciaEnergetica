'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PicoMensal } from '@/api/tipos';
import { formatData, formatHora, formatKw, formatRs, rotuloMes } from '@/lib/format';
import { estiloSituacao } from '@/lib/regras';
import { TooltipRecharts } from './TooltipRecharts';

type Props = {
  picos: PicoMensal[];
  contratadaKw: number;
  limiteKw: number;
};

export function PicosMensais({ picos, contratadaKw, limiteKw }: Props) {
  const [modo, setModo] = useState<'grafico' | 'tabela'>('grafico');

  return (
    <section
      className="rounded-xl border border-borda bg-superficie p-6"
      aria-labelledby="titulo-picos"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-picos" className="text-lg font-semibold">
            Pico de demanda por mês
          </h2>
          <p className="text-sm text-tinta-3">
            Contratada {formatKw(contratadaKw)} · limite de multa {formatKw(limiteKw)}
          </p>
        </div>
        <Segmentado
          opcoes={[
            { valor: 'grafico', rotulo: 'Gráfico' },
            { valor: 'tabela', rotulo: 'Tabela' },
          ]}
          valor={modo}
          onChange={setModo}
        />
      </header>

      {modo === 'grafico' ? (
        <Grafico picos={picos} contratadaKw={contratadaKw} limiteKw={limiteKw} />
      ) : (
        <Tabela picos={picos} />
      )}
    </section>
  );
}

function Grafico({ picos, contratadaKw, limiteKw }: Props) {
  const maxima = Math.max(
    limiteKw * 1.15,
    ...picos.filter((p) => p.pico_kw !== null).map((p) => p.pico_kw!),
  );
  return (
    <div
      role="img"
      aria-label={`Pico de demanda em ${picos.length} meses. Maior pico: ${formatKw(
        Math.max(0, ...picos.map((p) => p.pico_kw ?? 0)),
      )}.`}
    >
      <div className="h-80 w-full min-w-[640px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={picos} margin={{ top: 16, right: 56, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--divisoria)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="rotulo"
              tick={{ fill: 'var(--tinta-3)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--eixo)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--tinta-3)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--eixo)' }}
              tickLine={false}
              domain={[0, Math.ceil(maxima / 10) * 10]}
              width={48}
              tickFormatter={(v) => `${v} kW`}
            />
            <Tooltip cursor={{ fill: 'var(--menu-ativo)' }} content={<TooltipPicos />} />
            <ReferenceLine
              y={contratadaKw}
              stroke="var(--amber-linha)"
              strokeDasharray="4 4"
              label={{
                position: 'right',
                value: `Contratada ${formatKw(contratadaKw)}`,
                fill: 'var(--amber-texto)',
                fontSize: 11,
              }}
            />
            <ReferenceLine
              y={limiteKw}
              stroke="var(--multa-linha)"
              strokeDasharray="4 4"
              label={{
                position: 'right',
                value: `Limite ${formatKw(limiteKw)}`,
                fill: 'var(--multa-texto)',
                fontSize: 11,
              }}
            />
            <Bar dataKey="pico_kw" radius={[4, 4, 0, 0]}>
              {picos.map((p) => (
                <Cell
                  key={p.mes}
                  fill={estiloSituacao[p.situacao].vars.preenchimento}
                  stroke={
                    p.situacao === 'sem_dados'
                      ? 'var(--borda)'
                      : estiloSituacao[p.situacao].vars.linha ?? 'transparent'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type TooltipPayload = {
  payload?: PicoMensal;
  value?: number;
};

function TooltipPicos({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  if (!p) return null;

  if (p.situacao === 'sem_dados' || p.pico_kw === null) {
    return <TooltipRecharts titulo={rotuloMes(p.mes)} linhas={[{ rotulo: '', valor: 'Sem dados' }]} />;
  }

  const quando =
    p.pico_em !== null ? `${formatData(p.pico_em)} às ${formatHora(p.pico_em)}` : '—';
  return (
    <TooltipRecharts
      titulo={rotuloMes(p.mes)}
      linhas={[
        { rotulo: 'Pico', valor: formatKw(p.pico_kw) },
        { rotulo: 'Quando', valor: quando },
        { rotulo: 'Situação', valor: estiloSituacao[p.situacao].rotulo },
        {
          rotulo: 'Faturada',
          valor: p.faturada_rs !== null ? formatRs(p.faturada_rs) : '—',
        },
        {
          rotulo: 'Ultrapassagem',
          valor: p.ultrapassagem_rs !== null ? formatRs(p.ultrapassagem_rs) : '—',
        },
      ]}
    />
  );
}

function Tabela({ picos }: { picos: PicoMensal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-borda text-left text-xs uppercase text-tinta-3">
            <th className="px-2 py-2 font-medium">Mês</th>
            <th className="px-2 py-2 font-medium">Pico</th>
            <th className="px-2 py-2 font-medium">Quando</th>
            <th className="px-2 py-2 font-medium">Situação</th>
            <th className="px-2 py-2 text-right font-medium">Faturada</th>
            <th className="px-2 py-2 text-right font-medium">Ultrapassagem</th>
          </tr>
        </thead>
        <tbody>
          {picos.map((p) => (
            <tr key={p.mes} className="border-b border-divisoria">
              <td className="px-2 py-2">{rotuloMes(p.mes)}</td>
              <td className="px-2 py-2 tabular-nums">
                {p.pico_kw !== null ? formatKw(p.pico_kw) : '—'}
              </td>
              <td className="px-2 py-2 text-tinta-3">
                {p.pico_em ? `${formatData(p.pico_em)} ${formatHora(p.pico_em)}` : '—'}
              </td>
              <td className="px-2 py-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${estiloSituacao[p.situacao].classes.chip}`}>
                  {estiloSituacao[p.situacao].rotulo}
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {p.faturada_rs !== null ? formatRs(p.faturada_rs) : '—'}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {p.ultrapassagem_rs !== null ? formatRs(p.ultrapassagem_rs) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-md border border-borda bg-superficie p-0.5">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="radio"
            type="button"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className={`rounded-sm px-3 py-1 text-xs font-medium ${
              ativo ? 'bg-menu-ativo text-tinta' : 'text-tinta-2 hover:bg-menu'
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
