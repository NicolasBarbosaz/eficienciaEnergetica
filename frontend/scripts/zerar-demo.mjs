#!/usr/bin/env node
import { unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const pastaDados = resolve(aqui, '..', '..', 'backend', 'data');
const alvos = ['configuracao.json', 'medicoes.csv', 'medicoes_info.json'];

let apagados = 0;
for (const nome of alvos) {
  const caminho = join(pastaDados, nome);
  try {
    await unlink(caminho);
    console.log(`Apagado: ${caminho}`);
    apagados += 1;
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log(`Ignorado (não existe): ${caminho}`);
    } else {
      throw e;
    }
  }
}
console.log(`\nDemo zerado: ${apagados} arquivo(s) apagado(s).`);
