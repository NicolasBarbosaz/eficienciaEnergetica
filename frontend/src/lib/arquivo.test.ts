import { expect, test } from 'vitest';

import { unidadeDoArquivo } from './arquivo';

test('cabeçalho padrão vira kwh', () => {
  expect(unidadeDoArquivo('timestamp,valor_eletricidade_original')).toBe('kwh');
});

test('cabeçalho padrão com BOM do Excel vira kwh', () => {
  expect(unidadeDoArquivo('﻿timestamp,valor_eletricidade_original')).toBe('kwh');
});

test('cabeçalho da distribuidora vira kw', () => {
  expect(unidadeDoArquivo('Data;Hora;Demanda ativa (kW)')).toBe('kw');
});

test('qualquer coisa fora do padrão vira kw', () => {
  expect(unidadeDoArquivo('qualquer;coisa;outra')).toBe('kw');
});
