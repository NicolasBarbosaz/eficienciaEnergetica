import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from 'vitest';

/** Pega o conteúdo entre as chaves do primeiro bloco do seletor. */
function pegarBloco(css: string, seletor: string): string {
  const posSeletor = css.indexOf(seletor);
  expect(posSeletor, `seletor "${seletor}" não encontrado no globals.css`).toBeGreaterThan(-1);
  const abre = css.indexOf('{', posSeletor);
  let nivel = 1;
  let i = abre + 1;
  while (i < css.length && nivel > 0) {
    if (css[i] === '{') nivel += 1;
    else if (css[i] === '}') nivel -= 1;
    i += 1;
  }
  return css.slice(abre + 1, i - 1);
}

function extrairTokens(bloco: string): Set<string> {
  return new Set([...bloco.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
}

test('todo token em :root também existe em .dark', () => {
  const caminho = resolve(__dirname, '..', 'app', 'globals.css');
  const css = readFileSync(caminho, 'utf-8');

  const claros = extrairTokens(pegarBloco(css, ':root'));
  const escuros = extrairTokens(pegarBloco(css, '.dark'));

  const faltandoNoEscuro = [...claros].filter((t) => !escuros.has(t)).sort();
  const sobrandoNoEscuro = [...escuros].filter((t) => !claros.has(t)).sort();

  expect(faltandoNoEscuro, 'tokens no :root sem equivalente em .dark').toEqual([]);
  expect(sobrandoNoEscuro, 'tokens em .dark sem equivalente em :root').toEqual([]);
});
