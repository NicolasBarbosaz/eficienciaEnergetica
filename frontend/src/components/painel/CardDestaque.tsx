'use client';

import { TrendingDown } from 'lucide-react';
import Link from 'next/link';

import type { AnaliseResumo } from '@/api/tipos';
import { formatKw, formatRs } from '@/lib/format';

export function CardDestaque({ resumo }: { resumo: AnaliseResumo }) {
  const rec = resumo.contrato_recomendado;
  const trocar = rec.contratada_kw !== resumo.contratada_kw && rec.economia_rs > 0;

  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm text-tinta-3">
            Ultrapassagem no período ({resumo.meses_com_dados}{' '}
            {resumo.meses_com_dados === 1 ? 'mês' : 'meses'} com dados)
          </p>
          <p className="mt-1 font-semibold leading-none tracking-tight text-multa-texto text-5xl">
            {formatRs(resumo.ultrapassagem_total_rs)}
          </p>
          <p className="mt-3 text-sm text-tinta-2">
            Regra da ANEEL com a tarifa cadastrada ({formatRs(resumo.tarifa_rs_kw)}/kW); sem impostos.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-multa-borda bg-multa-fundo px-3 py-1 text-sm text-multa-texto">
            <span>
              Multa em <strong>{resumo.meses_com_multa}</strong> de {resumo.meses_com_dados} meses
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-divisoria bg-menu p-4 text-sm md:max-w-xs">
          <div className="flex items-center gap-2 text-tinta-3">
            <TrendingDown aria-hidden className="h-4 w-4" />
            <span>Contrato</span>
          </div>
          {trocar ? (
            <>
              <p className="mt-2">
                Recomendado:{' '}
                <strong className="text-base text-tinta">{formatKw(rec.contratada_kw)}</strong>{' '}
                <span className="text-tinta-3">(hoje: {formatKw(resumo.contratada_kw)})</span>
              </p>
              <p className="mt-1">
                Economia estimada no período:{' '}
                <strong className="text-economia">{formatRs(rec.economia_rs)}</strong>
              </p>
              {rec.meses_com_multa > 0 && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-multa-borda bg-multa-fundo px-3 py-1 text-xs text-multa-texto">
                  <span>
                    Terá multa em <strong>{rec.meses_com_multa}</strong> {rec.meses_com_multa === 1 ? 'mês' : 'meses'} ({formatRs(rec.ultrapassagem_rs)})
                  </span>
                </div>
              )}
              <Link
                href="/contrato-ideal"
                className="mt-3 inline-flex items-center rounded-md border border-borda bg-superficie px-3 py-1.5 text-sm font-medium text-tinta hover:bg-menu-ativo"
              >
                Simular contrato
              </Link>
            </>
          ) : (
            <p className="mt-2 text-tinta">
              Seu contrato já está no ponto de menor custo.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
