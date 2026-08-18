/**
 * Digital Pandharpur — OpenAPI ↔ app/api doc-lint
 *
 * Keeps the OpenAPI docs synchronized with the real route surface in both
 * directions:
 *
 *   1. Forward (hard errors): every documented path must resolve to a route.ts,
 *      and every documented HTTP method (GET/POST/PUT/PATCH/DELETE/HEAD/
 *      OPTIONS) on that path must be exported by the file — not just that the
 *      path exists.
 *   2. Reverse (warnings by default): every route under a spec's "coverage
 *      roots" must be documented. Coverage roots are the app/api subtrees a
 *      spec claims to document; pass --strict-undeclared to escalate these
 *      warnings into exit-1 errors so new endpoints can't ship undocumented.
 *
 *   bun run scripts/doc-lint-openapi.ts [spec.yaml ...] [flags]
 *
 * Flags:
 *   --strict-undeclared            treat reverse-direction misses as errors
 *   --no-reverse                   skip the reverse-direction check entirely
 *   --coverage-root=SPEC:r1,r2     add coverage roots for a spec (repeatable)
 *
 * Defaults to docs/openapi/audio-platform.yaml and docs/openapi/openapi.yaml.
 * Path templates map to the App Router layout:
 *
 *   /acquire/upload/{id}/correction  →  app/api/acquire/upload/[id]/correction/route.ts
 *   /admin/.../{...slug}             →  app/api/admin/.../[...slug]/route.ts
 *
 * Dynamic segments accept any bracket name (e.g. `[id]` vs `[uploadId]`) so a
 * param rename in code does not false-positive.
 */

import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

/**
 * Per-spec coverage roots: app/api subtrees that the spec claims to document.
 * Routes under a root that are missing from the spec are reported by the
 * reverse-direction check (warning unless --strict-undeclared).
 */
const DEFAULT_SPECS: { path: string; coverageRoots: string[] }[] = [
  {
    path: 'docs/openapi/audio-platform.yaml',
    coverageRoots: [
      'acquire',
      'library',
      'playlists',
      'admin/audio',
      'admin/models',
      'admin/discovery',
    ],
  },
  { path: 'docs/openapi/openapi.yaml', coverageRoots: [] },
];

// ─── Pure helpers (unit-tested) ─────────────────────────────────────────────

/**
 * Extract OpenAPI path keys and the HTTP methods documented under each from a
 * spec's `paths:` block. Path keys are the only 2-space-indented lines that
 * start with `/`; methods are the 4-space-indented `get:`/`post:`/… keys that
 * follow. A line-based scan is sufficient and keeps the script dependency-free.
 */
export function extractOpenApiPathsAndMethods(specText: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let inPaths = false;
  let currentPath: string | null = null;

  for (const rawLine of specText.split('\n')) {
    const line = rawLine.trimEnd();

    if (!inPaths) {
      if (/^paths:\s*$/.test(line)) inPaths = true;
      continue;
    }

    // A non-indented key ends the paths block.
    if (/^[^\s]/.test(line)) break;

    const pathMatch = line.match(/^  (\/\S+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      map.set(currentPath, []);
      continue;
    }

    const methodMatch = line.match(/^    (get|post|put|patch|delete|head|options):\s*$/);
    if (methodMatch && currentPath) {
      map.get(currentPath)!.push(methodMatch[1].toUpperCase());
    }
  }

  return map;
}

/** Path keys only, in document order. */
export function extractOpenApiPaths(specText: string): string[] {
  return [...extractOpenApiPathsAndMethods(specText).keys()];
}

/**
 * Map an OpenAPI path template to segments under `app/api`:
 * `/acquire/upload/{id}/correction` → `['acquire', 'upload', '{id}', 'correction']`.
 * A leading `/api` prefix (as some specs write it) is tolerated.
 */
export function openApiPathToSegments(openApiPath: string): string[] {
  return openApiPath.replace(/^\/api\//, '/').split('/').filter(Boolean);
}

/**
 * Resolve a Next.js App Router route directory for the given segments, or
 * null if no route.ts exists. Dynamic segments (`{id}` / `{...slug}`) match
 * any single/catch-all bracket directory name so param renames don't break.
 */
export function resolveRouteDir(base: string, segments: string[]): string | null {
  let current = base;
  for (const segment of segments) {
    const next = findChildDir(current, segment);
    if (!next) return null;
    current = next;
  }
  return existsSync(path.join(current, 'route.ts')) ? current : null;
}

function findChildDir(dir: string, segment: string): string | null {
  const catchAll = segment.match(/^\{\.\.\.(.+)\}$/);
  const param = segment.match(/^\{(.+)\}$/);

  if (!catchAll && !param) {
    // Literal segment
    const literal = path.join(dir, segment);
    return existsSync(literal) ? literal : null;
  }

  // Dynamic segment — accept any matching bracket directory name.
  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return null;
  }
  const pattern = catchAll ? /^\[\.\.\..+\]$/ : /^\[[^\[\]]+\]$/;
  const name = entries.find((entry) => pattern.test(entry));
  return name ? path.join(dir, name) : null;
}

/**
 * Which HTTP method handlers a route.ts source exports, e.g. `export async
 * function GET(...)`, `export function POST(...)`, `export const PATCH = …`,
 * or the NextAuth-style `export { handler as GET, handler as POST }`.
 */
export function extractExportedMethods(routeSource: string): Set<string> {
  const methods = new Set<string>();
  for (const method of HTTP_METHODS) {
    const re = new RegExp(
      `\\bexport\\s+(?:async\\s+)?function\\s+${method}\\b` +
        `|\\bexport\\s+const\\s+${method}\\s*=` +
        `|\\bexport\\s*\\{[^}]*\\b${method}\\b`
    );
    if (re.test(routeSource)) methods.add(method);
  }
  return methods;
}

/** Read a route.ts and return the HTTP methods it exports. */
export async function readExportedMethods(routeDir: string): Promise<Set<string>> {
  const source = await readFile(path.join(routeDir, 'route.ts'), 'utf-8');
  return extractExportedMethods(source);
}

/** Recursively collect every directory under `dir` that contains a route.ts. */
export function collectRouteDirs(dir: string): string[] {
  const found: string[] = [];
  let entries: { isDirectory(): boolean; name: string }[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  if (existsSync(path.join(dir, 'route.ts'))) found.push(dir);
  for (const entry of entries) {
    if (entry.isDirectory()) {
      found.push(...collectRouteDirs(path.join(dir, entry.name)));
    }
  }
  return found;
}

// ─── Linting ────────────────────────────────────────────────────────────────

export interface LintResult {
  errors: string[];
  warnings: string[];
}

export async function lintSpec(
  specPath: string,
  apiRoot: string = 'app/api'
): Promise<LintResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let text: string;
  try {
    text = await readFile(specPath, 'utf-8');
  } catch {
    return { errors: [`${specPath}: cannot read file`], warnings };
  }

  const pathMethods = extractOpenApiPathsAndMethods(text);
  if (pathMethods.size === 0) {
    return { errors: [`${specPath}: no paths found under \`paths:\``], warnings };
  }

  for (const [openApiPath, methods] of pathMethods) {
    const segments = openApiPathToSegments(openApiPath);
    const dir = resolveRouteDir(apiRoot, segments);
    if (!dir) {
      errors.push(
        `${specPath}: ${openApiPath} → no route under ${apiRoot}/${segments.join('/')}/route.ts`
      );
      continue;
    }

    if (methods.length === 0) {
      warnings.push(
        `${specPath}: ${openApiPath} → path key documents no HTTP methods (get/post/put/patch/delete/head/options)`
      );
      continue;
    }

    const exported = await readExportedMethods(dir);
    const missing = methods.filter((method) => !exported.has(method));
    if (missing.length > 0) {
      const exportedList =
        exported.size > 0 ? [...exported].join(', ') : 'no HTTP method handlers';
      errors.push(
        `${specPath}: ${openApiPath} → documented ${missing.join('/')} but route.ts only exports ${exportedList}`
      );
    }

    // Method-level reverse check: handler exists but the spec doesn't document it.
    const extra = [...exported].filter((method) => !methods.includes(method));
    if (extra.length > 0) {
      warnings.push(
        `${specPath}: ${openApiPath} → route.ts exports ${extra.join(', ')} but the spec only documents ${methods.join(', ')}`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Parse `--coverage-root=SPEC:root1,root2` into `{ spec, roots }`, or null
 * when malformed. Splits on the LAST colon so a Windows drive letter in the
 * spec path (e.g. `C:/x.yaml`) does not truncate it.
 */
export function parseCoverageRoot(arg: string): { spec: string; roots: string[] } | null {
  if (!arg.startsWith('--coverage-root=')) return null;
  const rest = arg.slice('--coverage-root='.length);
  const sep = rest.lastIndexOf(':');
  if (sep <= 0 || sep === rest.length - 1) return null;
  return { spec: rest.slice(0, sep), roots: rest.slice(sep + 1).split(',') };
}

/**
 * Reverse-direction check: warn when a route exists under a spec's coverage
 * roots but is missing from the spec's documented path templates, so new
 * endpoints can't ship undocumented.
 */
export async function lintUndeclaredRoutes(
  specPath: string,
  documentedTemplates: string[],
  coverageRoots: string[],
  apiRoot: string = 'app/api'
): Promise<string[]> {
  const problems: string[] = [];
  const documentedSegments = documentedTemplates.map((template) =>
    openApiPathToSegments(template)
  );

  for (const root of coverageRoots) {
    const base = path.join(apiRoot, root);
    if (!existsSync(base)) continue;

    for (const routeDir of collectRouteDirs(base)) {
      const covered = documentedSegments.some((segments) => {
        const dir = resolveRouteDir(apiRoot, segments);
        return dir === routeDir;
      });
      if (!covered) {
        const rel = path.relative(apiRoot, routeDir).split(path.sep).join('/');
        problems.push(`${specPath}: ${rel} → route exists but is not documented in the spec`);
      }
    }
  }
  return problems;
}

export async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const strictUndeclared = args.includes('--strict-undeclared');
  const noReverse = args.includes('--no-reverse');
  const specPaths = args.filter((arg) => !arg.startsWith('--'));

  const specs = specPaths.length > 0 ? specPaths : DEFAULT_SPECS.map((s) => s.path);

  // Coverage roots per spec: defaults + --coverage-root=SPEC:r1,r2 overrides.
  const coverageFor = new Map<string, string[]>(
    DEFAULT_SPECS.map((s) => [s.path, [...s.coverageRoots]])
  );
  for (const arg of args) {
    if (!arg.startsWith('--coverage-root=')) continue;
    const parsed = parseCoverageRoot(arg);
    if (!parsed) {
      console.warn(`⚠ ${arg}: expected SPEC:root1,root2`);
      continue;
    }
    const roots = coverageFor.get(parsed.spec) ?? [];
    roots.push(...parsed.roots);
    coverageFor.set(parsed.spec, roots);
    if (!specs.includes(parsed.spec)) {
      console.warn(
        `⚠ --coverage-root names ${parsed.spec}, which is not among the linted specs (${specs.join(', ')}) — override ignored`
      );
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const spec of specs) {
    const result = await lintSpec(spec);
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (!noReverse) {
      const roots = coverageFor.get(spec) ?? [];
      if (roots.length > 0) {
        let text = '';
        try {
          text = await readFile(spec, 'utf-8');
        } catch {
          /* lintSpec already reported the unreadable file */
        }
        const templates = [...extractOpenApiPathsAndMethods(text).keys()];
        warnings.push(...(await lintUndeclaredRoutes(spec, templates, roots)));
      }
    }
  }

  if (errors.length > 0) {
    console.error(`✖ OpenAPI doc-lint failed (${errors.length} error(s)):`);
    for (const error of errors) console.error(`  - ${error}`);
    console.error(
      'Update docs/openapi/*.yaml to match the real app/api routes (or add the missing route/method handler).'
    );
    return 1;
  }

  if (strictUndeclared && warnings.length > 0) {
    console.error(
      `✖ OpenAPI doc-lint failed (--strict-undeclared: ${warnings.length} warning(s) escalated to errors):`
    );
    for (const warning of warnings) console.error(`  - ${warning}`);
    return 1;
  }

  if (warnings.length > 0) {
    console.warn(`⚠ OpenAPI doc-lint: ${warnings.length} warning(s):`);
    for (const warning of warnings) console.warn(`  - ${warning}`);
  }

  console.log(
    `✔ OpenAPI doc-lint passed — all documented paths/methods in ${specs.join(', ')} match app/api routes.`
  );
  return 0;
}

// Run only when executed directly (not when imported by unit tests).
if (import.meta.main) {
  process.exit(await main());
}
