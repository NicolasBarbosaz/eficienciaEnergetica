import { expect, test } from 'vitest';

import { estiloRisco, estiloSituacao, limiteMulta } from './regras';

test('limiteMulta(80) = 84', () => {
  expect(limiteMulta(80)).toBe(84);
});

test('limiteMulta(85) = 89.25', () => {
  expect(limiteMulta(85)).toBe(89.25);
});

test('estiloSituacao cobre dentro, acima_contratado, multa e sem_dados', () => {
  expect(Object.keys(estiloSituacao).sort()).toEqual([
    'acima_contratado',
    'dentro',
    'multa',
    'sem_dados',
  ]);
});

test('estiloRisco cobre baixo, medio e alto', () => {
  expect(Object.keys(estiloRisco).sort()).toEqual(['alto', 'baixo', 'medio']);
});
