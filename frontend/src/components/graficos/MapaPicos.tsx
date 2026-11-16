'use client';

import { useState } from 'react';

import type { MapaPicos as MapaPicosTipo } from '@/api/tipos';
import { formatKw } from '@/lib/format';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIAS_COMPLETOS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function corDaCelula(contagem: number, maximo: number): string {
  if (contagem === 0 || maximo === 0) return 'var(--mapa-0)';
  const razao = contagem / maximo;
  if (razao <= 0.2) return 'var(--mapa-1)';
  if (razao <= 0.4) return 'var(--mapa-2)';
  if (razao <= 0.6) return 'var(--mapa-3)';
  if (razao <= 0.8) return 'var(--mapa-4)';
  return 'var(--mapa-5)';
}

type HoverInfo = { dia: number; hora: number; contagem: number } | null;

type Props = {
  dados: MapaPicosTipo;
  pontaInicio: string;
  pontaFim: string;
};

export function MapaPicos({ dados, pontaInicio, pontaFim }: Props) {
  const [hover, setHover] = useState<HoverInfo>(null);

  const maximo = Math.max(1, ...dados.contagens.flat());
  const horasPonta = horasEntre(pontaInicio, pontaFim);

  return (
    <section
      className="rounded-xl border border-borda bg-superficie p-6"
      aria-labelledby="titulo-mapa"
    >
      <header className="mb-4">
        <h2 id="titulo-mapa" className="text-lg font-semibold">
          Horários dos picos
        </h2>
        <p className="text-sm text-tinta-3">
          {dados.total_acima.toLocaleString('pt-BR')} leituras acima de{' '}
          {formatKw(dados.limiar_kw)} no período. O bloco contornado é a janela de 3 dias
          úteis × 2 horas com mais leituras acima.
        </p>
      </header>

      <div
        className="overflow-x-auto"
        onMouseLeave={() => setHover(null)}
        aria-label="Grade de contagens de leituras acima da contratada por dia da semana e hora"
      >
        <div className="min-w-[640px]">
          {/* Cabeçalho de horas */}
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
          >
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className={[
                  'text-center text-[10px] text-tinta-3',
                  horasPonta.has(h) ? 'font-semibold text-tinta-2' : '',
                ].join(' ')}
              >
                {h}h
              </div>
            ))}
          </div>

          {/* Linhas por dia */}
          {DIAS.map((dia, d) => (
            <div
              key={d}
              className="grid gap-px"
              style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
            >
              <div className="pr-1 py-1 text-right text-xs text-tinta-3">{dia}</div>
              {Array.from({ length: 24 }, (_, h) => {
                const contagem = dados.contagens[d]?.[h] ?? 0;
                const ehMaiorBloco =
                  dados.maior_bloco !== null &&
                  d >= dados.maior_bloco.dia_inicio &&
                  d <= dados.maior_bloco.dia_fim &&
                  h >= dados.maior_bloco.hora_inicio &&
                  h <= dados.maior_bloco.hora_fim;
                const ehPonta = horasPonta.has(h);
                return (
                  <button
                    type="button"
                    key={h}
                    onMouseEnter={() => setHover({ dia: d, hora: h, contagem })}
                    onFocus={() => setHover({ dia: d, hora: h, contagem })}
                    style={{
                      backgroundColor: corDaCelula(contagem, maximo),
                      outline: ehPonta ? '1px solid var(--amber-linha)' : undefined,
                      outlineOffset: ehPonta ? '-1px' : undefined,
                    }}
                    className={[
                      'relative h-6',
                      ehMaiorBloco ? 'ring-2 ring-tinta ring-inset' : '',
                    ].join(' ')}
                    aria-label={`${DIAS_COMPLETOS[d]}, ${h}h às ${h + 1}h: ${contagem} leituras acima`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-tinta-3">
        <div aria-live="polite" className="min-h-[1.25rem]">
          {hover
            ? `${DIAS_COMPLETOS[hover.dia]}, ${hover.hora}h–${hover.hora + 1}h: ${hover.contagem.toLocaleString('pt-BR')} leituras acima de ${formatKw(dados.limiar_kw)}.`
            : 'Passe o mouse ou foque numa célula para ver o detalhe.'}
        </div>
        <Legenda />
      </div>
    </section>
  );
}

function Legenda() {
  return (
    <div className="flex items-center gap-2 text-xs text-tinta-3">
      <span>Menos</span>
      {[0, 1, 2, 3, 4, 5].map((c) => (
        <span
          key={c}
          aria-hidden
          style={{ backgroundColor: `var(--mapa-${c})` }}
          className="inline-block h-3 w-3 rounded-sm border border-borda"
        />
      ))}
      <span>Mais</span>
    </div>
  );
}

function horasEntre(inicio: string, fim: string): Set<number> {
  const resultado = new Set<number>();
  if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim)) return resultado;
  const hi = Number(inicio.slice(0, 2));
  const hf = Number(fim.slice(0, 2));
  if (hi === hf) return resultado;
  let h = hi;
  const limite = hf <= hi ? hf + 24 : hf;
  while (h < limite) {
    resultado.add(h % 24);
    h += 1;
  }
  return resultado;
}
