/**
 * Auditoría local de env vs catálogo.
 * Uso: npm run env:audit
 * No imprime valores — solo presencia / prefijos / severidad.
 */
import { ENV_CATALOG, ENV_RESIDUAL_WARN } from '../lib/env-catalog';
import { collectStaticEnvProblems } from '../lib/runtime-env';

const isProd = process.env.VERCEL_ENV === 'production' || process.argv.includes('--prod');

console.log(`\n[env:audit] mode=${isProd ? 'production-rules' : 'dev/preview'}\n`);

for (const entry of ENV_CATALOG) {
  const raw = (process.env[entry.key] || '').trim();
  const present = Boolean(raw);
  let mark = present ? 'OK ' : 'MISS';
  let note = entry.purpose;

  if (present && entry.expectPrefix && !raw.startsWith(entry.expectPrefix)) {
    mark = 'BAD ';
    note = `prefijo esperado ${entry.expectPrefix} — ${entry.purpose}`;
  }
  if (present && entry.forbidValues?.some((v) => raw.toLowerCase() === v.toLowerCase())) {
    mark = 'BAN ';
    note = `valor prohibido en Production — ${entry.purpose}`;
  }

  const req = entry.requiredInProduction ? 'REQ' : 'opt';
  console.log(`${mark} [${entry.severity.padEnd(5)}] [${req}] ${entry.key}`);
  console.log(`     ${note}`);
  console.log(`     usedBy: ${entry.usedBy.join(', ')}`);
}

console.log('\nResiduales:');
for (const key of ENV_RESIDUAL_WARN) {
  console.log(`  ${process.env[key] ? 'present' : 'absent'}  ${key}`);
}

const problems = collectStaticEnvProblems(isProd);
if (problems.length) {
  console.log('\nProblemas (production rules):');
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nSin problemas fatales bajo las reglas actuales.');
}
