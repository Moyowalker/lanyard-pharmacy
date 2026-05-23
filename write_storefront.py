import pathlib

DEST = r'c:\Users\ajayi\Projects\lanyard-pharmacy\apps\web\src\components\storefront-home.tsx'

# Read the large new content from the companion file
new_content = pathlib.Path(r'c:\Users\ajayi\Projects\lanyard-pharmacy\storefront_new.txt').read_text(encoding='utf-8')
pathlib.Path(DEST).write_text(new_content, encoding='utf-8')
print('Write OK -', len(new_content), 'chars')
