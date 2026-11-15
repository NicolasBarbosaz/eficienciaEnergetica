import { expect, test } from 'vitest';
import { formatKw, formatRs, rotuloMes } from './format';

test('formatKw em pt-BR com uma casa decimal', () => {
  expect(formatKw(79.25)).toBe('79,3 kW');
});

test('formatRs em pt-BR', () => {
  expect(formatRs(3402.96)).toBe('R$ 3.402,96');
});

test('rotuloMes a partir de AAAA-MM', () => {
  expect(rotuloMes('2017-12')).toBe('dez/17');
});
