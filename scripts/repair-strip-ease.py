import os
import re

def strip_ease():
    files = [
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\hero-section.tsx',
        r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\timeline-section.tsx'
    ]
    for f in files:
        if os.path.exists(f):
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Remove `ease: "easeOut",` or `ease: "easeOut"`
            content = re.sub(r',\s*ease:\s*"easeOut"', '', content)
            content = re.sub(r'ease:\s*"easeOut"\s*,?', '', content)
            
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)

if __name__ == '__main__':
    strip_ease()
