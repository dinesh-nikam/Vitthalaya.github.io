import re

def main():
    schema_path = r'c:\Users\Dinesh Nikam\Desktop\mirai\varkari\prisma\schema.prisma'
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Enums
    content = re.sub(
        r'type\s+String\s+@map\("type"\)\s*//\s*SQLite: use String instead of enum',
        r'type          CompositionType @map("type")',
        content
    )
    
    # 2. JSON fields marked with // SQLite: JSON... or // JSON...
    def json_replacer(match):
        field_decl = match.group(1)
        comment = match.group(2)
        field_decl = field_decl.replace('String', 'Json')
        return field_decl + comment
        
    # Strictly on the same line to avoid eating up other fields
    content = re.sub(
        r'([a-zA-Z0-9_]+\s+String\??(?:[^/\n]*))\s*(//\s*(?:SQLite:\s*)?JSON.*)',
        json_replacer,
        content,
        flags=re.IGNORECASE
    )

    # 3. Boolean fields marked with // SQLite: INTEGER for boolean
    content = re.sub(
        r'templeVerification\s+Int\s+@default\(0\)\s+@map\("temple_verification"\)\s*//\s*SQLite: INTEGER for boolean',
        r'templeVerification     Boolean  @default(false) @map("temple_verification")',
        content
    )

    # 4. Remove the SQLite header comment
    content = re.sub(
        r'// Provider is auto-switched by scripts/switch-provider\.ts.*?\n.*?\n.*?\n',
        r'// Provider is PostgreSQL for local and production environments.\n',
        content,
        flags=re.MULTILINE
    )

    # Add Enums if not exist
    if 'enum CompositionType' not in content:
        content += "\n\nenum CompositionType {\n  ABHANG\n  BHAJAN\n  AARTI\n  STOTRA\n  HARIPATH\n  OVI\n  POWADA\n  GAULAN\n  OTHER\n}\n"

    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Schema refactored successfully.")

if __name__ == '__main__':
    main()
