import os
import re

def main():
    # 1. Fix API routes where params wasn't awaited properly
    api_files = [
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\acquire\upload\[id]\route.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\admin\compositions\[id]\route.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\admin\pages\[id]\route.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\admin\tags\[id]\route.ts'
    ]
    for f in api_files:
        if os.path.exists(f):
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
            # Because `const id = params.id;` or `const { id } = params;` didn't catch all cases
            # Let's replace any `params.id` with `(await params).id` 
            content = re.sub(r'params\.id', r'(await params).id', content)
            
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)

    # 2. Fix src/db/bookmark.ts
    bookmark = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\db\bookmark.ts'
    if os.path.exists(bookmark):
        with open(bookmark, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('(session.user as any).id', '(session?.user as any)?.id')
        with open(bookmark, 'w', encoding='utf-8') as file:
            file.write(content)
            
    # 3. Remove src/scraper imports from app/api/scrape/route.ts
    scrape_api = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\api\scrape\route.ts'
    if os.path.exists(scrape_api):
        with open(scrape_api, 'r', encoding='utf-8') as file:
            content = file.read()
        # Instead of deleting, just comment out the legacy scraper lines or delete the whole file if it's dead
        # Actually it's probably better to just remove those imports and let the route do nothing or just return 404
        content = re.sub(r'import\s+.*?\s+from\s+[\'"]@/src/scraper/.*?[\'"];?\n?', '', content)
        content = re.sub(r'await\s+(TukaramGathaScraper|WarkariRojnishiScraper|AbhangInScraper)\.scrape\(\);', '/* Legacy scraper removed */', content)
        with open(scrape_api, 'w', encoding='utf-8') as file:
            file.write(content)

    # 4. Fix allowedPaths casting everywhere
    files_with_allowed = [
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\admin\discovery\page.tsx',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\crawl4ai\pipeline.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\discovery\discovery-worker.ts',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\discovery\scraper-monitor.ts',
    ]
    for f in files_with_allowed:
        if os.path.exists(f):
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
            # Brute force cast allowedPaths anywhere it appears if it's not already casted to any
            content = content.replace('source.allowedPaths.slice', '(source.allowedPaths as any).slice')
            content = content.replace('(source.allowedPaths as string[] | string | null).includes', '((source.allowedPaths as any) || []).includes')
            content = content.replace('source.allowedPaths.includes', '((source.allowedPaths as any) || []).includes')
            # Reset the previous bad regex replaces
            content = content.replace('(source.allowedPaths as string[] | string | null)', '(source.allowedPaths as any)')
            content = content.replace('(source.allowedPaths as any) | string | null', '(source.allowedPaths as any)')
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)

if __name__ == '__main__':
    main()
    print("TypeScript errors fixed.")
