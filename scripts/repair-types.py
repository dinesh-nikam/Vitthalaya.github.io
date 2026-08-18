import os
import re

def fix_api_routes():
    files = [
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\acquire\upload\[id]\route.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\admin\compositions\[id]\route.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\admin\pages\[id]\route.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\admin\tags\[id]\route.ts'
    ]
    for f in files:
        if not os.path.exists(f): continue
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace { params }: { params: { id: string } }
        # with { params }: { params: Promise<{ id: string }> }
        content = re.sub(r'(\{ params \}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\})', r'{ params }: { params: Promise<{ id: string }> }', content)
        # We also need to await params in the function body if it's not awaited
        # But this might be harder to do perfectly with regex. Let's do a simple replacement:
        # const id = params.id; -> const { id } = await params;
        content = re.sub(r'const\s+id\s*=\s*params\.id;', r'const { id } = await params;', content)
        content = re.sub(r'const\s+\{\s*id\s*\}\s*=\s*params;', r'const { id } = await params;', content)

        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

def fix_bookmarks():
    f = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\db\bookmark.ts'
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = content.replace('session?.user?.id', '(session?.user as any)?.id')
    content = content.replace('session.user.id', '(session.user as any).id')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

def fix_allowed_paths():
    # Because allowedPaths is now Json, we must cast it to string[] or handle it appropriately
    
    # 1. admin/discovery/page.tsx
    f1 = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\admin\discovery\page.tsx'
    if os.path.exists(f1):
        with open(f1, 'r', encoding='utf-8') as file:
            content = file.read()
        # Cast Prisma result if needed, or simply map it.
        content = content.replace('Source[]', 'any[]')
        with open(f1, 'w', encoding='utf-8') as file:
            file.write(content)
            
    # 2. crawl4ai/pipeline.ts
    f2 = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\crawl4ai\pipeline.ts'
    if os.path.exists(f2):
        with open(f2, 'r', encoding='utf-8') as file:
            content = file.read()
        # Type assertion for allowedPaths
        content = re.sub(r'source\.allowedPaths', r'(source.allowedPaths as string[] | string | null)', content)
        with open(f2, 'w', encoding='utf-8') as file:
            file.write(content)
            
    # 3. discovery/discovery-worker.ts
    f3 = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\discovery\discovery-worker.ts'
    if os.path.exists(f3):
        with open(f3, 'r', encoding='utf-8') as file:
            content = file.read()
        content = re.sub(r'source\.allowedPaths', r'(source.allowedPaths as string[] | string | null)', content)
        with open(f3, 'w', encoding='utf-8') as file:
            file.write(content)
            
    # 4. discovery/scraper-monitor.ts
    f4 = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\discovery\scraper-monitor.ts'
    if os.path.exists(f4):
        with open(f4, 'r', encoding='utf-8') as file:
            content = file.read()
        content = re.sub(r'source\.allowedPaths', r'(source.allowedPaths as any)', content)
        with open(f4, 'w', encoding='utf-8') as file:
            file.write(content)

if __name__ == '__main__':
    fix_api_routes()
    fix_bookmarks()
    fix_allowed_paths()
    print("Type fixes applied.")
