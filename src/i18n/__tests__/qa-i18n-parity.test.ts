/* eslint-env jest, node */
import * as fs from 'fs';
import * as path from 'path';
import en from '../en.json';
import ur from '../ur.json';

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      collectFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('i18n EN / UR key parity & usage check', () => {
  const enKeys = new Set(Object.keys(en));
  const urKeys = new Set(Object.keys(ur));

  it('en.json and ur.json have matching key sets', () => {
    const missingInUr = [...enKeys].filter((k) => !urKeys.has(k));
    const missingInEn = [...urKeys].filter((k) => !enKeys.has(k));
    expect(missingInUr).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('every static t("...") key used in app/ and src/ exists in en.json and ur.json', () => {
    const root = path.resolve(__dirname, '../../..');
    const files = [...collectFiles(path.join(root, 'app')), ...collectFiles(path.join(root, 'src'))];
    const usedKeys = new Set<string>();
    const re = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*[,)]/g;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        usedKeys.add(m[1]);
      }
    }

    const missingFromEn = [...usedKeys].filter((k) => !enKeys.has(k));
    const missingFromUr = [...usedKeys].filter((k) => !urKeys.has(k));
    expect(missingFromEn).toEqual([]);
    expect(missingFromUr).toEqual([]);
  });
});

