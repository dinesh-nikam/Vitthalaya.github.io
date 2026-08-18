import os

def fix_dashboard():
    f = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\admin\discovery\DiscoveryDashboardClient.tsx'
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('allowedPaths: string | null; // JSON string or null', 'allowedPaths: any; // JSON array')
        content = content.replace('excludedPaths: string | null; // JSON string or null', 'excludedPaths: any; // JSON array')
        content = content.replace('tags: string | null;', 'tags: any;')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

def fix_page():
    f = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\app\admin\discovery\page.tsx'
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('initialSources={serializedSources}', 'initialSources={serializedSources as any}')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

def fix_pipeline():
    f = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\crawl4ai\pipeline.ts'
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('((source.allowedPaths as any) || [])', '((source.allowedPaths as string[]) || [])')
        content = content.replace('(source.allowedPaths as any)', '(source.allowedPaths as string[])')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

def fix_discovery():
    f = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\discovery\discovery-worker.ts'
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('((source.allowedPaths as any) || [])', '((source.allowedPaths as string[]) || [])')
        content = content.replace('(source.allowedPaths as any)', '(source.allowedPaths as string[])')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

def fix_monitor():
    f = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\src\discovery\scraper-monitor.ts'
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('(source.allowedPaths as any)', '(source.allowedPaths as string[])')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

if __name__ == '__main__':
    fix_dashboard()
    fix_page()
    fix_pipeline()
    fix_discovery()
    fix_monitor()
