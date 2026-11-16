'use client';

import { AlertCircle, FileText, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

import { useEnviarArquivo, useImportarExemplo } from '@/api/hooks/useMedicoes';
import { unidadeDoArquivo } from '@/lib/arquivo';

type Props = {
  nomePredio: string;
  demandaKw: number;
};

export function EnvioArquivo({ nomePredio, demandaKw }: Props) {
  const [arraste, setArraste] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviar = useEnviarArquivo();
  const exemplo = useImportarExemplo();

  const erro = enviar.error?.mensagem ?? exemplo.error?.mensagem ?? null;
  const ocupado = enviar.isPending || exemplo.isPending;

  async function iniciarEnvio(arquivo: File) {
    try {
      const primeiraLinha = (await arquivo.slice(0, 1024).text()).split(/\r?\n/)[0] ?? '';
      const unidade = unidadeDoArquivo(primeiraLinha);
      enviar.reset();
      exemplo.reset();
      await enviar.mutateAsync({ arquivo, nomePredio, demandaKw, unidade });
    } catch {
      // erro já sai por enviar.error
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArraste(false);
    const arquivo = e.dataTransfer.files?.[0];
    if (arquivo) void iniciarEnvio(arquivo);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!arraste) setArraste(true);
  }

  function onDragLeave() {
    setArraste(false);
  }

  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <header>
        <h2 className="text-lg font-semibold">Envie a memória de massa</h2>
        <p className="mt-1 text-sm text-tinta-3">
          Arraste o arquivo da distribuidora ou clique para escolher. Aceita <code>.csv</code>.
        </p>
      </header>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !ocupado && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !ocupado) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-disabled={ocupado || undefined}
        aria-label="Área de envio de arquivo CSV"
        className={[
          'mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          arraste ? 'border-tinta bg-menu-ativo' : 'border-borda hover:bg-menu',
          ocupado ? 'cursor-wait opacity-70' : 'cursor-pointer',
        ].join(' ')}
      >
        <Upload aria-hidden className="h-6 w-6 text-tinta-2" />
        <div className="text-sm text-tinta">
          <strong>Arraste o CSV</strong> ou <strong>clique para escolher</strong>
        </div>
        <div className="text-xs text-tinta-3">
          CSV da distribuidora (<code>Data;Hora;kW</code>) ou no formato padrão
          (<code>timestamp,valor_eletricidade_original</code>).
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void iniciarEnvio(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-sm text-tinta-3">
          Sem o arquivo? Use um exemplo real do BDG2 (2016–2017) para explorar o painel.
        </div>
        <button
          type="button"
          onClick={() => {
            enviar.reset();
            exemplo.reset();
            exemplo.mutate();
          }}
          disabled={ocupado}
          className="shrink-0 rounded-md border border-borda bg-superficie px-4 py-2 text-sm font-medium text-tinta hover:bg-menu disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText aria-hidden className="mr-2 inline h-4 w-4 align-text-bottom" />
          Usar arquivo de exemplo
        </button>
      </div>

      {ocupado && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-menu-ativo">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-tinta" />
          </div>
          <p className="mt-2 text-sm text-tinta-3">Lendo o arquivo…</p>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-md border border-multa-borda bg-multa-fundo px-4 py-3 text-sm text-multa-texto"
        >
          <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p>{erro}</p>
            <button
              type="button"
              onClick={() => {
                enviar.reset();
                exemplo.reset();
              }}
              className="mt-2 inline-flex items-center rounded-md border border-multa-borda bg-superficie px-3 py-1.5 text-xs font-medium text-multa-texto hover:bg-multa-fundo"
            >
              Tentar outro arquivo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
