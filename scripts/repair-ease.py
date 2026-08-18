import os
import re

def fix_framer_ease():
    files = [
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\hero-section.tsx',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\timeline-section.tsx',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\wari-section.tsx'
    ]
    for f in files:
        if os.path.exists(f):
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
            # replace ease: [0.16, 1, 0.3, 1] with ease: "easeOut"
            content = re.sub(r'ease:\s*\[[\d\.\s,]+\]', 'ease: "easeOut"', content)
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)

if __name__ == '__main__':
    fix_framer_ease()
