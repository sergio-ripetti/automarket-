#!/bin/bash
for file in $(find src -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  python3 << 'PYEOF'
import sys
filepath = '''FILEPATH'''
try:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace all variants of quotes and dashes
    replacements = {
        '"': '"',  # U+201C LEFT DOUBLE QUOTATION MARK
        '"': '"',  # U+201D RIGHT DOUBLE QUOTATION MARK
        ''': "'",  # U+2018 LEFT SINGLE QUOTATION MARK
        ''': "'",  # U+2019 RIGHT SINGLE QUOTATION MARK
        '–': '-',  # U+2013 EN DASH
        '—': '-',  # U+2014 EM DASH
    }
    
    for old, new in replacements.items():
        if old in content:
            content = content.replace(old, new)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {filepath}")
except Exception as e:
    print(f"Error in {filepath}: {e}")
PYEOF
done
