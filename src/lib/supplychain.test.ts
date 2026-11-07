import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression test for tinyhustlers/hq#646: the security check must pass on its own,
// without time-boxed exceptions for these build-tool advisories.
const root = resolve(__dirname, '../..');
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string }>;
};
const osvConfig = readFileSync(resolve(root, 'osv-scanner.toml'), 'utf8');

function parse(v: string): number[] {
  return v.split('-')[0].split('.').map((n) => Number(n));
}
function lessThan(a: string, b: string): boolean {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  }
  return false;
}
function installed(name: string): string[] {
  return Object.entries(lock.packages)
    .filter(([path]) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`))
    .map(([, p]) => p.version ?? '');
}

// Affected ranges from the advisories (as reported by npm audit).
const advisories = [
  { id: 'GHSA-g3hv-75wg-m249', pkg: 'minimatch', from: '7.0.0', fixed: '11.0.1' },
  { id: 'GHSA-3g3m-2fjr-6pw4', pkg: 'glob', from: '9.0.0', fixed: '14.0.2' },
];

describe('supply chain (hq#646)', () => {
  for (const a of advisories) {
    it(`no ${a.pkg} version affected by ${a.id} is installed`, () => {
      const affected = installed(a.pkg).filter((v) => !lessThan(v, a.from) && lessThan(v, a.fixed));
      expect(affected).toEqual([]);
    });
    it(`${a.id} is not ignored in osv-scanner.toml`, () => {
      expect(osvConfig).not.toContain(a.id);
    });
  }
  it('version compare works', () => {
    expect(lessThan('10.2.6', '11.0.1')).toBe(true);
    expect(lessThan('11.0.5', '11.0.1')).toBe(false);
    expect(lessThan('14.0.1', '14.0.2')).toBe(true);
  });
});
