'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PontoContrato } from '@/api/tipos';
import { formatKw, formatRs } from '@/lib/format';
import { TooltipRecharts } from './TooltipRecharts';

type Props = {
  curva: PontoContrato[];
  atualKw: number;
  otimoKw: number;
  recomendadoKw: number;
  semMultaKw?: number;
  simuladoKw: number;
  onSimular: (kw: number) => void;
};

export function EconomiaContrato({
  curva,
  atualKw,
  otimoKw,
  recomendadoKw,
  semMultaKw,
  simuladoKw,
  onSimular,
}: Props) {
  const dados = curva.map((p) => ({
    contratada: p.contratada_kw,
    economia_rs: p.economia_rs,
    positivo: p.economia_rs > 0 ? p.economia_rs : 0,
    negativo: p.economia_rs < 0 ? p.economia_rs : 0,
  }));

  type Click = { activeLabel?: string | number };
  function tratarClique(e?: Click) {
    const n = Number(e?.activeLabel);
    if (Number.isFinite(n)) onSimular(n);
  }

  return (
    <div
      className="h-64 w-full min-w-[640px]"
      role="img"
      aria-label="Economia estimada por valor de contrato"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={dados}
          margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
          onClick={tratarClique}
        >
          <CartesianGrid stroke="var(--divisoria)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="contratada"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: 'var(--tinta-3)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--eixo)' }}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            tick={{ fill: 'var(--tinta-3)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--eixo)' }}
            tickLine={false}
            width={72}
            tickFormatter={(v) => (Number.isFinite(v) ? formatRs(Number(v)) : '')}
          />
          <Tooltip cursor={{ stroke: 'var(--tinta-3)' }} content={<TooltipEconomia />} />
          <Area
            type="monotone"
            dataKey="positivo"
            stroke="none"
            fill="var(--economia)"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="negativo"
            stroke="none"
            fill="var(--multa-preenchimento)"
            fillOpacity={0.25}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="economia_rs"
            stroke="var(--tinta-2)"
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceLine y={0} stroke="var(--eixo)" />

          <ReferenceLine
            x={atualKw}
            stroke="var(--tinta-3)"
            strokeDasharray="2 3"
            label={{ value: 'atual', position: 'top', fill: 'var(--tinta-3)', fontSize: 11 }}
          />
          <ReferenceLine
            x={otimoKw}
            stroke="var(--economia)"
            strokeDasharray="2 3"
            label={{ value: 'ótimo', position: 'top', fill: 'var(--economia)', fontSize: 11 }}
          />
          <ReferenceLine
            x={recomendadoKw}
            stroke="var(--dentro-texto)"
            strokeDasharray="2 3"
            label={{
              value: 'recomendado',
              position: 'top',
              fill: 'var(--dentro-texto)',
              fontSize: 11,
            }}
          />
          {semMultaKw !== undefined && (
            <ReferenceLine
              x={semMultaKw}
              stroke="var(--tinta-3)"
              strokeDasharray="1 3"
              label={{
                value: 'sem multa',
                position: 'top',
                fill: 'var(--tinta-3)',
                fontSize: 11,
              }}
            />
          )}
          <ReferenceLine x={simuladoKw} stroke="var(--tinta)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

type TooltipPayload = { payload?: { contratada: number; economia_rs: number } };

function TooltipEconomia({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload;
  const positivo = p.economia_rs >= 0;
  return (
    <TooltipRecharts
      titulo={formatKw(p.contratada)}
      linhas={[
        {
          rotulo: positivo ? 'Economia' : 'Custa a mais',
          valor: formatRs(Math.abs(p.economia_rs)),
        },
      ]}
    />
  );
}
