import re
import sys

def main():
    file_path = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\vitthalaya-pilgrimage.tsx'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Insert imports
    imports_to_add = """
import { ChapterHero } from './features/pilgrimage/hero-section';
import { ChapterBhakti } from './features/pilgrimage/timeline-section';
import { ChapterWari } from './features/pilgrimage/wari-section';
import { useScrollReveal } from './features/pilgrimage/hooks';
"""
    content = content.replace("import '@/app/homepage.css';", "import '@/app/homepage.css';" + imports_to_add)

    # 2. Remove hooks
    content = re.sub(r'/\*\s*── Hooks ──\s*\*/.*?/\*\s*── Types ──\s*\*/', '/* ── Types ── */', content, flags=re.DOTALL)

    # 3. Remove ChapterHero
    content = re.sub(r'/\*\s*============================================================\s*\n\s*CHAPTER 1 — HERO:.*?/\*\s*============================================================\s*\n\s*CHAPTER 2 — WELCOME:', '/* ============================================================\n   CHAPTER 2 — WELCOME:', content, flags=re.DOTALL)

    # 4. Remove ChapterBhakti
    content = re.sub(r'/\*\s*============================================================\s*\n\s*CHAPTER 3 — BHAKTI TIMELINE:.*?/\*\s*============================================================\s*\n\s*CHAPTER 4 — SAINTS:', '/* ============================================================\n   CHAPTER 4 — SAINTS:', content, flags=re.DOTALL)

    # 5. Remove ChapterWari
    content = re.sub(r'/\*\s*============================================================\s*\n\s*CHAPTER 5 — WARI:.*?/\*\s*============================================================\s*\n\s*CHAPTER 6 — GALAXY:', '/* ============================================================\n   CHAPTER 6 — GALAXY:', content, flags=re.DOTALL)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Extraction refactor complete.")

if __name__ == '__main__':
    main()
