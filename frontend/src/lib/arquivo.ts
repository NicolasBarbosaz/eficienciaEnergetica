export type Unidade = 'kw' | 'kwh';

/**
 * Decide a `unidade` que vai no formulário da importação a partir do cabeçalho
 * do CSV. O formato padrão tem `valor_eletricidade_original` (em kWh); o da
 * distribuidora não (vem em kW).
 *
 * Tolera o BOM que o Excel grava no começo (`﻿`).
 */
export function unidadeDoArquivo(primeiraLinha: string): Unidade {
  const limpa = primeiraLinha.replace(/^﻿/, '').toLowerCase();
  return limpa.includes('valor_eletricidade_original') ? 'kwh' : 'kw';
}
