import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  extractOpenApiPaths,
  extractOpenApiPathsAndMethods,
  extractExportedMethods,
  openApiPathToSegments,
  resolveRouteDir,
  lintSpec,
  lintUndeclaredRoutes,
  parseCoverageRoot,
} from '../../scripts/doc-lint-openapi';

describe('extractOpenApiPaths', () => {
  const spec = `openapi: 3.0.0
info:
  title: Test
paths:
  /acquire/upload:
    post:
      operationId: x
  /acquire/upload/{id}/correction:
    post:
      operationId: y
  /admin/.../{...slug}:
    get:
      operationId: z
servers:
  - url: http://localhost/api
components:
  schemas:
    Foo:
      type: object
`;

  test('extracts only the path keys from the paths block', () => {
    expect(extractOpenApiPaths(spec)).toEqual([
      '/acquire/upload',
      '/acquire/upload/{id}/correction',
      '/admin/.../{...slug}',
    ]);
  });

  test('returns an empty array when there is no paths block', () => {
    expect(extractOpenApiPaths('openapi: 3.0.0\ninfo:\n  title: x\n')).toEqual([]);
  });
});

describe('extractOpenApiPathsAndMethods', () => {
  const spec = `paths:
  /acquire/upload:
    post:
      operationId: a
  /library/recordings/{id}:
    patch:
      operationId: b
    delete:
      operationId: c
  /playlists/{id}/reorder:
    put:
      operationId: d
  /acquire/upload/{id}:
    get:
      operationId: e
`;

  test('extracts methods per path in document order', () => {
    const map = extractOpenApiPathsAndMethods(spec);
    expect([...map.keys()]).toEqual([
      '/acquire/upload',
      '/library/recordings/{id}',
      '/playlists/{id}/reorder',
      '/acquire/upload/{id}',
    ]);
    expect(map.get('/acquire/upload')).toEqual(['POST']);
    expect(map.get('/library/recordings/{id}')).toEqual(['PATCH', 'DELETE']);
    expect(map.get('/playlists/{id}/reorder')).toEqual(['PUT']);
    expect(map.get('/acquire/upload/{id}')).toEqual(['GET']);
  });

  test('treats a path key with no methods as an empty list', () => {
    const map = extractOpenApiPathsAndMethods('paths:\n  /orphan:\n    summary: only meta\n');
    expect(map.get('/orphan')).toEqual([]);
  });
});

describe('extractExportedMethods', () => {
  test('detects async function, plain function, and const handlers', () => {
    const src = `
export async function GET() { return new Response(); }
export function POST() { return new Response(); }
export const PATCH = async () => new Response();
// helper that must NOT match
function DELETE() {}
`;
    expect([...extractExportedMethods(src)].sort()).toEqual(['GET', 'PATCH', 'POST']);
  });

  test('detects the NextAuth re-export form (export { handler as GET })', () => {
    const src = 'export { handler as GET, handler as POST };\n';
    expect([...extractExportedMethods(src)].sort()).toEqual(['GET', 'POST']);
  });

  test('returns an empty set for a file with no handlers', () => {
    expect([...extractExportedMethods('export const config = {};')]).toEqual([]);
  });
});

describe('parseCoverageRoot', () => {
  test('parses SPEC:root1,root2', () => {
    expect(
      parseCoverageRoot('--coverage-root=docs/openapi/audio-platform.yaml:auth,orders')
    ).toEqual({ spec: 'docs/openapi/audio-platform.yaml', roots: ['auth', 'orders'] });
  });

  test('survives a Windows drive-letter colon in the spec path', () => {
    expect(parseCoverageRoot('--coverage-root=C:/x.yaml:auth')).toEqual({
      spec: 'C:/x.yaml',
      roots: ['auth'],
    });
  });

  test('rejects non-flags and malformed values', () => {
    expect(parseCoverageRoot('--no-reverse')).toBeNull();
    expect(parseCoverageRoot('--coverage-root=justaspec')).toBeNull();
    expect(parseCoverageRoot('--coverage-root=spec:')).toBeNull();
  });
});

describe('openApiPathToSegments', () => {
  test('splits into segments and tolerates an /api prefix', () => {
    expect(openApiPathToSegments('/acquire/upload/{id}/correction')).toEqual([
      'acquire',
      'upload',
      '{id}',
      'correction',
    ]);
    expect(openApiPathToSegments('/api/library/recordings')).toEqual([
      'library',
      'recordings',
    ]);
  });
});

describe('resolveRouteDir', () => {
  let root: string;
  const mk = (rel: string) => {
    const dir = path.join(root, rel);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'route.ts'), 'export {}');
    return dir;
  };

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'doc-lint-'));
    mk('acquire/upload');
    mk('acquire/upload/[uploadId]/correction'); // note: renamed from [id]
    mk('acquire/upload/[uploadId]');
    mk('admin/content/[...slug]');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('resolves a literal path to its route dir', () => {
    expect(resolveRouteDir(root, ['acquire', 'upload'])).toBe(
      path.join(root, 'acquire', 'upload')
    );
  });

  test('maps {id} to any single bracket segment name (rename-tolerant)', () => {
    expect(resolveRouteDir(root, ['acquire', 'upload', '{id}'])).toBe(
      path.join(root, 'acquire', 'upload', '[uploadId]')
    );
    expect(
      resolveRouteDir(root, ['acquire', 'upload', '{id}', 'correction'])
    ).toBe(path.join(root, 'acquire', 'upload', '[uploadId]', 'correction'));
  });

  test('maps {...slug} to a catch-all bracket segment', () => {
    expect(resolveRouteDir(root, ['admin', 'content', '{...slug}'])).toBe(
      path.join(root, 'admin', 'content', '[...slug]')
    );
  });

  test('returns null when the route does not exist', () => {
    expect(resolveRouteDir(root, ['acquire', 'nope'])).toBeNull();
    expect(resolveRouteDir(root, ['acquire', 'upload', '{id}', 'missing'])).toBeNull();
  });
});

describe('lintSpec method verification', () => {
  let apiRoot: string;
  const mkRoute = (rel: string, handlers: string) => {
    const dir = path.join(apiRoot, rel);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'route.ts'), handlers);
    return dir;
  };

  beforeAll(() => {
    apiRoot = mkdtempSync(path.join(tmpdir(), 'doc-lint-methods-'));
    mkRoute('upload', 'export async function POST() { return new Response(); }\n');
    mkRoute('recordings', 'export async function GET() { return new Response(); }\n');
    mkRoute('recordings/[id]', 'export async function PATCH() {}\nexport async function DELETE() {}\n');
    mkRoute('upload/[id]/correction', 'export async function POST() { return new Response(); }\n');
    mkRoute('queue', 'export async function GET() {}\nexport async function POST() {}\n');
    mkRoute('orphan', 'export {}');
  });

  afterAll(() => {
    rmSync(apiRoot, { recursive: true, force: true });
  });

  const spec = (paths: string) => `openapi: 3.0.0\npaths:\n${paths}`;

  test('passes when every documented method is exported', async () => {
    const s = path.join(apiRoot, 'good.yaml');
    writeFileSync(
      s,
      spec(`  /upload:\n    post:\n  /recordings/{id}:\n    patch:\n    delete:\n`)
    );
    const { errors, warnings } = await lintSpec(s, apiRoot);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test('fails when a documented method is not exported', async () => {
    const s = path.join(apiRoot, 'missing.yaml');
    writeFileSync(
      s,
      spec(`  /recordings:\n    get:\n    post:\n`)
    );
    const { errors, warnings } = await lintSpec(s, apiRoot);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('/recordings');
    expect(errors[0]).toContain('POST');
    expect(errors[0]).toContain('only exports GET');
    expect(warnings).toEqual([]);
  });

  test('fails for a documented method when the route exports nothing', async () => {
    const s = path.join(apiRoot, 'empty.yaml');
    writeFileSync(s, spec(`  /orphan:\n    delete:\n`));
    const { errors } = await lintSpec(s, apiRoot);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('no HTTP method handlers');
  });

  test('warns when the route exports a method the spec does not document', async () => {
    const s = path.join(apiRoot, 'extra.yaml');
    writeFileSync(s, spec(`  /queue:\n    get:\n`));
    const { errors, warnings } = await lintSpec(s, apiRoot);
    expect(errors).toEqual([]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('/queue');
    expect(warnings[0]).toContain('exports POST');
    expect(warnings[0]).toContain('only documents GET');
  });
});

describe('lintUndeclaredRoutes (reverse direction)', () => {
  let apiRoot: string;

  beforeAll(() => {
    apiRoot = mkdtempSync(path.join(tmpdir(), 'doc-lint-reverse-'));
    // Fully covered subtree: acquire/upload + acquire/upload/[uploadId]/correction
    const upload = path.join(apiRoot, 'acquire', 'upload');
    mkdirSync(upload, { recursive: true });
    writeFileSync(path.join(upload, 'route.ts'), 'export async function POST() {}\n');
    const correction = path.join(apiRoot, 'acquire', 'upload', '[uploadId]', 'correction');
    mkdirSync(correction, { recursive: true });
    writeFileSync(path.join(correction, 'route.ts'), 'export async function POST() {}\n');
    // Undocumented route under the same coverage root
    const moderation = path.join(apiRoot, 'acquire', 'moderation', 'stats');
    mkdirSync(moderation, { recursive: true });
    writeFileSync(path.join(moderation, 'route.ts'), 'export async function GET() {}\n');
  });

  afterAll(() => {
    rmSync(apiRoot, { recursive: true, force: true });
  });

  test('flags only routes missing from the spec under coverage roots', async () => {
    const problems = await lintUndeclaredRoutes(
      'audio.yaml',
      ['/acquire/upload', '/acquire/upload/{id}/correction'],
      ['acquire'],
      apiRoot
    );
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain('acquire/moderation/stats');
    expect(problems[0]).toContain('not documented');
  });

  test('tolerates param renames between route and spec', async () => {
    // route is [uploadId], spec documents {id} — must count as covered
    const problems = await lintUndeclaredRoutes(
      'audio.yaml',
      ['/acquire/upload/{id}/correction'],
      ['acquire'],
      apiRoot
    );
    expect(problems.length).toBe(2); // both upload routes uncovered in this template-only run
    const correctionFlagged = problems.some((p) => p.includes('correction'));
    expect(correctionFlagged).toBe(false);
  });

  test('no problems when everything under the roots is documented', async () => {
    const problems = await lintUndeclaredRoutes(
      'audio.yaml',
      [
        '/acquire/upload',
        '/acquire/upload/{id}/correction',
        '/acquire/moderation/stats',
      ],
      ['acquire'],
      apiRoot
    );
    expect(problems).toEqual([]);
  });
});
