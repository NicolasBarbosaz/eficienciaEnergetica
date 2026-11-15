const _MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const _nfKw = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const _nfRs = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function _semEspacoFino(texto: string): string {
  // Intl pode usar espaço estreito sem quebra (U+202F) ou nbsp (U+00A0)
  // entre "R$" e o número; troca por espaço comum.
  return texto.replace(/[  ]/g, ' ');
}

export function formatKw(valor: number): string {
  return `${_nfKw.format(valor)} kW`;
}

export function formatRs(valor: number): string {
  return _semEspacoFino(_nfRs.format(valor));
}

/** 'AAAA-MM' -> 'dez/17' */
export function rotuloMes(aaaaMm: string): string {
  const [ano, mes] = aaaaMm.split('-');
  return `${_MES_ABREV[Number(mes) - 1]}/${ano.slice(-2)}`;
}

/** ISO datetime -> 'DD/MM/AAAA' */
export function formatData(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** ISO datetime -> 'HHhMM' (ou 'HHh' se MM==00) */
export function formatHora(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}
