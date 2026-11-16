'use client';

import { AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

import { useContratoIdeal } from '@/api/hooks/useAnalise';
import type { ContratoIdeal, PontoContrato } from '@/api/tipos';
import { EconomiaContrato } from '@/components/graficos/EconomiaContrato';
import { formatKw, formatRs, rotuloMes } from '@/lib/format';
import { estiloSituacao } from '@/lib/regras';

export function ContratoIdealTela() {
  const consulta = useContratoIdeal();

  if (consulta.isPending) {
    return <div className="text-tinta-3">Calculando contrato ideal…</div>;
  }
  if (consulta.isError || !consulta.data) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-multa-borda bg-multa-fundo p-4 text-multa-texto"
      >
        <AlertCircle aria-hidden className="h-5 w-5" />
        <div>
          <p>API indisponível para carregar o contrato ideal.</p>
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

  return <Conteudo dados={consulta.data} />;
}

function Conteudo({ dados }: { dados: ContratoIdeal }) {
  const { atual, otimo, recomendado, sem_multa: semMulta, curva, mes_a_mes: mesAMes } = dados;
  const [simuladoKw, setSimuladoKw] = useState(atual.contratada_kw);

  const minKw = Math.min(...curva.map((p) => p.contratada_kw));
  const maxKw = Math.max(...curva.map((p) => p.contratada_kw));
  const simulado = acharNaCurva(curva, simuladoKw) ?? atual;

  const totalAtual = mesAMes.reduce((s, m) => s + (m.atual.custo_rs ?? 0), 0);
  const totalRecomendado = mesAMes.reduce((s, m) => s + (m.recomendado.custo_rs ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Contrato ideal</h1>
        <p className="mt-1 text-sm text-tinta-3">
          Simulação com tarifa de {formatRs(dados.tarifa_rs_kw)}/kW, margem de{' '}
          {formatKw(dados.margem_kw)} e {dados.meses_analisados} meses com dados.
        </p>
      </header>

      <Comparativo atual={atual} recomendado={recomendado} />

      <div className="grid gap-4 md:grid-cols-2">
        <CardPorQue otimo={otimo} recomendado={recomendado} />
        <CardSemMulta semMulta={semMulta} atual={atual} />
      </div>

      <section className="rounded-xl border border-borda bg-superficie p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Simulador</h2>
            <p className="text-sm text-tinta-3">
              Arraste para simular um valor de contrato entre {formatKw(minKw)} e{' '}
              {formatKw(maxKw)}, ou clique no gráfico.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Atalho rotulo={`Atual · ${formatKw(atual.contratada_kw)}`} ativo={simuladoKw === atual.contratada_kw} onClick={() => setSimuladoKw(atual.contratada_kw)} />
            <Atalho rotulo={`Ótimo · ${formatKw(otimo.contratada_kw)}`} ativo={simuladoKw === otimo.contratada_kw} onClick={() => setSimuladoKw(otimo.contratada_kw)} />
            <Atalho rotulo={`Recomendado · ${formatKw(recomendado.contratada_kw)}`} ativo={simuladoKw === recomendado.contratada_kw} onClick={() => setSimuladoKw(recomendado.contratada_kw)} />
            {semMulta && (
              <Atalho
                rotulo={`Sem multa · ${formatKw(semMulta.contratada_kw)}`}
                ativo={simuladoKw === semMulta.contratada_kw}
                onClick={() => setSimuladoKw(semMulta.contratada_kw)}
              />
            )}
          </div>
        </header>

        <div className="mb-4 flex items-center gap-4">
          <label htmlFor="slider-kw" className="sr-only">
            Valor de contrato simulado (kW)
          </label>
          <input
            id="slider-kw"
            type="range"
            min={minKw}
            max={maxKw}
            step={1}
            value={simuladoKw}
            onChange={(e) => setSimuladoKw(Number(e.target.value))}
            className="w-full accent-tinta"
          />
          <span className="w-24 shrink-0 text-right text-base font-semibold tabular-nums">
            {formatKw(simuladoKw)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Indicador rotulo="Custo no período" valor={formatRs(simulado.custo_rs)} />
          <Indicador
            rotulo="Economia contra o atual"
            valor={formatRs(simulado.economia_rs)}
            destaque={simulado.economia_rs > 0 ? 'economia' : simulado.economia_rs < 0 ? 'multa' : undefined}
          />
          <Indicador
            rotulo="Meses com multa"
            valor={`${simulado.meses_com_multa}`}
            destaque={simulado.meses_com_multa > 0 ? 'multa' : 'economia'}
          />
          <Indicador
            rotulo="Folga no pior mês"
            valor={formatKw(simulado.folga_pior_mes_kw)}
            destaque={simulado.folga_pior_mes_kw >= 0 ? 'economia' : 'multa'}
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <EconomiaContrato
            curva={curva}
            atualKw={atual.contratada_kw}
            otimoKw={otimo.contratada_kw}
            recomendadoKw={recomendado.contratada_kw}
            semMultaKw={semMulta?.contratada_kw}
            simuladoKw={simuladoKw}
            onSimular={setSimuladoKw}
          />
        </div>
      </section>

      <TabelaMesAMes
        mesAMes={mesAMes}
        atualKw={atual.contratada_kw}
        recomendadoKw={recomendado.contratada_kw}
        totalAtual={totalAtual}
        totalRecomendado={totalRecomendado}
      />

      <Premissas />
    </div>
  );
}

function Comparativo({ atual, recomendado }: { atual: PontoContrato; recomendado: PontoContrato }) {
  const mesmoContrato = atual.contratada_kw === recomendado.contratada_kw;
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <CardContrato
        titulo={`Hoje · ${formatKw(atual.contratada_kw)}`}
        ponto={atual}
        variante="neutro"
      />
      <CardContrato
        titulo={
          mesmoContrato
            ? `Recomendado · ${formatKw(recomendado.contratada_kw)} (mesmo valor)`
            : `Recomendado · ${formatKw(recomendado.contratada_kw)}`
        }
        ponto={recomendado}
        variante="positivo"
      />
    </section>
  );
}

function CardContrato({
  titulo,
  ponto,
  variante,
}: {
  titulo: string;
  ponto: PontoContrato;
  variante: 'neutro' | 'positivo';
}) {
  const borda = variante === 'positivo' ? 'border-economia' : 'border-borda';
  return (
    <div className={`rounded-xl border bg-superficie p-6 ${borda}`}>
      <p className="text-xs uppercase tracking-wide text-tinta-3">{titulo}</p>
      <p className="mt-2 text-3xl font-semibold leading-tight tabular-nums text-tinta">
        {formatRs(ponto.custo_rs)}
      </p>
      <dl className="mt-3 space-y-0.5 text-sm text-tinta-2">
        <div className="flex justify-between gap-4">
          <dt className="text-tinta-3">Ultrapassagem</dt>
          <dd className="tabular-nums">{formatRs(ponto.ultrapassagem_rs)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tinta-3">Meses com multa</dt>
          <dd className="tabular-nums">{ponto.meses_com_multa}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tinta-3">Folga mínima</dt>
          <dd className="tabular-nums">
            {ponto.folga_minima_kw !== null ? formatKw(ponto.folga_minima_kw) : '—'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function CardPorQue({ otimo, recomendado }: { otimo: PontoContrato; recomendado: PontoContrato }) {
  const mesmo = otimo.contratada_kw === recomendado.contratada_kw;
  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <h2 className="text-base font-semibold">
        {mesmo
          ? 'O contrato de menor custo já tem folga'
          : `Por que ${formatKw(recomendado.contratada_kw)} e não ${formatKw(otimo.contratada_kw)}?`}
      </h2>
      {mesmo ? (
        <p className="mt-2 text-sm text-tinta-2">
          O ótimo matemático também passa na folga mínima exigida — então a recomendação é o
          próprio ótimo.
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <LinhaPorQue
            rotulo={`Ótimo · ${formatKw(otimo.contratada_kw)}`}
            custo={otimo.custo_rs}
            folgaMinima={otimo.folga_minima_kw}
          />
          <LinhaPorQue
            rotulo={`Recomendado · ${formatKw(recomendado.contratada_kw)}`}
            custo={recomendado.custo_rs}
            folgaMinima={recomendado.folga_minima_kw}
          />
          <p className="mt-2 text-sm text-tinta-3">
            Diferença de custo:{' '}
            <strong className="text-tinta">
              {formatRs(Math.abs(recomendado.custo_rs - otimo.custo_rs))}
            </strong>
            . A recomendação prefere um valor com mais folga para absorver o pico do mês ruim.
          </p>
        </div>
      )}
    </section>
  );
}

function LinhaPorQue({
  rotulo,
  custo,
  folgaMinima,
}: {
  rotulo: string;
  custo: number;
  folgaMinima: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-tinta-2">
      <span>{rotulo}</span>
      <span className="tabular-nums">
        {formatRs(custo)}{' '}
        <span className="text-tinta-3">
          · folga {folgaMinima !== null ? formatKw(folgaMinima) : '—'}
        </span>
      </span>
    </div>
  );
}

function CardSemMulta({
  semMulta,
  atual,
}: {
  semMulta: PontoContrato | null;
  atual: PontoContrato;
}) {
  if (!semMulta) {
    return (
      <section className="rounded-xl border border-borda bg-superficie p-6">
        <h2 className="text-base font-semibold">Para zerar as multas</h2>
        <p className="mt-2 text-sm text-tinta-2">
          Nenhum contrato da faixa zera as multas. O custo de uma margem assim seria muito alto.
        </p>
      </section>
    );
  }
  const custoAMais = semMulta.custo_rs - atual.custo_rs;
  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <h2 className="text-base font-semibold">Para zerar as multas</h2>
      <p className="mt-2 text-sm text-tinta-2">
        <strong className="text-tinta">{formatKw(semMulta.contratada_kw)}</strong>,{' '}
        <strong>{formatRs(Math.abs(custoAMais))}</strong>{' '}
        {custoAMais >= 0 ? 'a mais' : 'a menos'} no período, com{' '}
        {semMulta.folga_minima_kw !== null
          ? `folga mínima de ${formatKw(semMulta.folga_minima_kw)}`
          : 'folga mínima garantida'}
        .
      </p>
    </section>
  );
}

function TabelaMesAMes({
  mesAMes,
  atualKw,
  recomendadoKw,
  totalAtual,
  totalRecomendado,
}: {
  mesAMes: ContratoIdeal['mes_a_mes'];
  atualKw: number;
  recomendadoKw: number;
  totalAtual: number;
  totalRecomendado: number;
}) {
  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Mês a mês · atual × recomendado</h2>
        <p className="text-sm text-tinta-3">
          {formatKw(atualKw)} contra {formatKw(recomendadoKw)}.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-3">
              <th className="px-2 py-2 font-medium">Mês</th>
              <th className="px-2 py-2 font-medium">Pico</th>
              <th className="px-2 py-2 font-medium">Situação atual</th>
              <th className="px-2 py-2 text-right font-medium">Custo atual</th>
              <th className="px-2 py-2 font-medium">Situação recomendado</th>
              <th className="px-2 py-2 text-right font-medium">Custo recomendado</th>
              <th className="px-2 py-2 text-right font-medium">Economia</th>
            </tr>
          </thead>
          <tbody>
            {mesAMes.map((m) => {
              const economia =
                m.atual.custo_rs !== null && m.recomendado.custo_rs !== null
                  ? m.atual.custo_rs - m.recomendado.custo_rs
                  : null;
              return (
                <tr key={m.mes} className="border-b border-divisoria">
                  <td className="px-2 py-2">{rotuloMes(m.mes)}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {m.pico_kw !== null ? formatKw(m.pico_kw) : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <Chip situacao={m.atual.situacao} />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {m.atual.custo_rs !== null ? formatRs(m.atual.custo_rs) : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <Chip situacao={m.recomendado.situacao} />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {m.recomendado.custo_rs !== null ? formatRs(m.recomendado.custo_rs) : '—'}
                  </td>
                  <td
                    className={[
                      'px-2 py-2 text-right tabular-nums',
                      economia !== null && economia > 0
                        ? 'text-dentro-texto'
                        : economia !== null && economia < 0
                          ? 'text-multa-texto'
                          : 'text-tinta-3',
                    ].join(' ')}
                  >
                    {economia !== null ? formatRs(economia) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-2 py-2">Total</td>
              <td className="px-2 py-2 text-tinta-3">—</td>
              <td className="px-2 py-2 text-tinta-3">—</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatRs(totalAtual)}</td>
              <td className="px-2 py-2 text-tinta-3">—</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatRs(totalRecomendado)}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatRs(totalAtual - totalRecomendado)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Chip({ situacao }: { situacao: ContratoIdeal['mes_a_mes'][number]['atual']['situacao'] }) {
  const estilo = estiloSituacao[situacao];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${estilo.classes.chip}`}>
      {estilo.rotulo}
    </span>
  );
}

function Premissas() {
  return (
    <section
      className="rounded-xl border border-divisoria bg-menu p-5 text-sm text-tinta-2"
      aria-labelledby="titulo-premissas"
    >
      <div className="flex items-center gap-2 text-tinta">
        <Info aria-hidden className="h-4 w-4" />
        <h2 id="titulo-premissas" className="font-semibold">
          Premissas
        </h2>
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Tolerância de 5% (regra da ANEEL).</li>
        <li>Tarifa cadastrada em Configurações.</li>
        <li>Período e meses sem dados conforme a memória de massa enviada.</li>
        <li>Valores sem impostos.</li>
        <li>Outras penalidades da fatura ficam fora da conta.</li>
      </ul>
    </section>
  );
}

function Indicador({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: 'economia' | 'multa';
}) {
  const cor =
    destaque === 'economia'
      ? 'text-dentro-texto'
      : destaque === 'multa'
        ? 'text-multa-texto'
        : 'text-tinta';
  return (
    <div className="rounded-md border border-divisoria bg-menu px-4 py-3">
      <p className="text-xs text-tinta-3">{rotulo}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}

function Atalho({
  rotulo,
  ativo,
  onClick,
}: {
  rotulo: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={[
        'rounded-full border px-3 py-1 text-xs font-medium',
        ativo
          ? 'border-tinta bg-menu-ativo text-tinta'
          : 'border-borda bg-superficie text-tinta-2 hover:bg-menu',
      ].join(' ')}
    >
      {rotulo}
    </button>
  );
}

function acharNaCurva(curva: PontoContrato[], kw: number): PontoContrato | null {
  let melhor: PontoContrato | null = null;
  let menorDiff = Infinity;
  for (const p of curva) {
    const d = Math.abs(p.contratada_kw - kw);
    if (d < menorDiff) {
      menorDiff = d;
      melhor = p;
    }
  }
  return melhor;
}
