'use client';

import { Info, Sparkles } from 'lucide-react';
import Link from 'next/link';

import type { PrevisaoProximoMes } from '@/api/tipos';
import { formatKw } from '@/lib/format';
import { estiloRisco, estiloSituacao } from '@/lib/regras';

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

const TOOLTIP_IA =
  'Modelo LightGBM treinado com dados reais de um prédio (BDG2). Prevê bem a demanda típica (erro médio de 2,8 kW, 6%, na próxima hora), mas não antecipa picos súbitos: por isso o risco de multa vem do histórico do mesmo mês.';
const TOOLTIP_BASELINE = 'Previsão simples: modelo indisponível.';

function rotuloMesLongo(mesStr: string): string {
  const [ano, mes] = mesStr.split('-');
  const nome = NOMES_MES[Number(mes) - 1] ?? mes;
  return `${nome} de ${ano}`;
}

function rotuloAnoDeMes(mesStr: string): string {
  const [ano] = mesStr.split('-');
  return ano;
}

export function CardPrevisao({ previsao }: { previsao: PrevisaoProximoMes }) {
  const risco = estiloRisco[previsao.risco];
  const baseline = previsao.modelo === 'baseline';

  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              Previsão para {rotuloMesLongo(previsao.mes)}
            </h2>
            <span
              tabIndex={0}
              aria-label="Previsão por IA"
              title={baseline ? TOOLTIP_BASELINE : TOOLTIP_IA}
              className="group inline-flex items-center gap-1 rounded-full border border-borda bg-menu px-2 py-0.5 text-xs text-tinta-2"
            >
              <Sparkles aria-hidden className="h-3 w-3" />
              {baseline ? 'Previsão simples' : 'Previsão por IA'}
            </span>
          </div>
          <p className="mt-1 text-sm text-tinta-3">
            Pico típico previsto:{' '}
            <strong className="text-tinta-2">
              {formatKw(previsao.pico_tipico_min_kw)} a {formatKw(previsao.pico_tipico_max_kw)}
            </strong>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${risco.classes.chip}`}
        >
          <risco.Icone aria-hidden className="h-4 w-4" />
          {risco.rotulo}
        </span>
      </header>

      <p className="mt-4 text-sm text-tinta-2">{previsao.aviso_sazonal}</p>

      {previsao.meses_historico.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-tinta-3">
            Mesmo mês em anos anteriores
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {previsao.meses_historico.map((h) => (
              <li
                key={h.mes}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${estiloSituacao[h.situacao].classes.chip}`}
              >
                <span>{rotuloAnoDeMes(h.mes)}</span>
                <span className="text-tinta-3">·</span>
                <strong>{formatKw(h.pico_kw)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-md border border-divisoria bg-menu px-4 py-3 text-sm text-tinta-2">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          O modelo prevê a demanda típica; o risco de multa vem do histórico do mesmo mês.
        </span>
      </div>

      <div className="mt-4">
        <Link href="/contrato-ideal" className="text-sm font-medium text-tinta underline">
          Simular contrato →
        </Link>
      </div>
    </section>
  );
}
