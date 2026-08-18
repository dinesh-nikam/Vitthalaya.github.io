import os
import re

def fix_framer_types():
    # 1. hero-section.tsx
    hero = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\hero-section.tsx'
    if os.path.exists(hero):
        with open(hero, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'import { motion } from' in content and 'Variants' not in content:
            content = content.replace("import { motion } from 'framer-motion';", "import { motion, Variants } from 'framer-motion';")
        content = content.replace("const fadeUp =", "const fadeUp: Variants =")
        with open(hero, 'w', encoding='utf-8') as f:
            f.write(content)

    # 2. timeline-section.tsx
    timeline = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\components\features\pilgrimage\timeline-section.tsx'
    if os.path.exists(timeline):
        with open(timeline, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'import { motion } from' in content and 'Variants' not in content:
            content = content.replace("import { motion } from 'framer-motion';", "import { motion, Variants } from 'framer-motion';")
        content = content.replace("const containerVariants =", "const containerVariants: Variants =")
        content = content.replace("const itemVariants =", "const itemVariants: Variants =")
        with open(timeline, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == '__main__':
    fix_framer_types()
