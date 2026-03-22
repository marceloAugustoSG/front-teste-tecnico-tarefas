import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outFile = resolve(root, 'src/environments/environment.generated.ts');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = parseEnvFile(resolve(root, '.env'));

function trimBase(s) {
  return String(s).replace(/\/$/, '');
}

let apiUrl = 'http://localhost:8080';
if (process.env.NG_APP_API_URL !== undefined) {
  apiUrl = trimBase(process.env.NG_APP_API_URL);
} else if (process.env.API_URL !== undefined) {
  apiUrl = trimBase(process.env.API_URL);
} else if (Object.prototype.hasOwnProperty.call(fileEnv, 'NG_APP_API_URL')) {
  apiUrl = trimBase(fileEnv.NG_APP_API_URL ?? '');
} else if (Object.prototype.hasOwnProperty.call(fileEnv, 'API_URL')) {
  apiUrl = trimBase(fileEnv.API_URL ?? '');
}

const content = `/* Gerado por scripts/generate-environment.mjs — não editar */
export const environment = {
  apiUrl: ${JSON.stringify(apiUrl)},
} as const;
`;

writeFileSync(outFile, content, 'utf8');
console.log('[env] environment.generated.ts → apiUrl:', apiUrl);
