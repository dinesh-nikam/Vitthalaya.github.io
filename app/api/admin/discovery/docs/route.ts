import { NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/require-admin.ts';
import * as fs from 'fs';
import * as path from 'path';

interface DocNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocNode[];
  fileType?: string;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const docsDir = path.join(process.cwd(), 'docs');
    
    if (!fs.existsSync(docsDir)) {
      return NextResponse.json({ tree: [], files: {} });
    }

    const fileContentsMap: Record<string, { content: string; fileType: string }> = {};

    function buildTree(currentPath: string, relativePath = ''): DocNode[] {
      const items = fs.readdirSync(currentPath);
      const nodes: DocNode[] = [];

      for (const item of items) {
        if (item.startsWith('.')) continue; // Skip hidden directories/files

        const fullPath = path.join(currentPath, item);
        const relPath = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const children = buildTree(fullPath, relPath);
          nodes.push({
            name: item,
            path: relPath,
            type: 'directory',
            children,
          });
        } else {
          const fileType = path.extname(item).substring(1).toLowerCase();
          const content = fs.readFileSync(fullPath, 'utf8');

          fileContentsMap[relPath] = { content, fileType };

          nodes.push({
            name: item,
            path: relPath,
            type: 'file',
            fileType,
          });
        }
      }

      // Sort directories first, then files alphabetically
      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    const tree = buildTree(docsDir);

    return NextResponse.json({ tree, files: fileContentsMap });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Docs API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
