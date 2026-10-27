"""Repack reviewed step folders without regenerating or overwriting their content."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent
folders = sorted(p for p in root.iterdir() if p.is_dir() and p.name[:2] in ('01', '02', '03', '04'))
seen = {}
manifest = {}
for index, folder in enumerate(folders, 1):
    attachments = sorted((folder / 'Вложения').iterdir())
    for file in attachments:
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        assert digest not in seen, (file, seen.get(digest))
        seen[digest] = str(file)
    manifest[folder.name] = {
        'input': None if index == 1 else f'step{index-1}.html участника',
        'output': f'step{index}.html',
        'new_attachments': [p.name for p in attachments],
    }
    target = root / (folder.name + '.zip')
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(folder.rglob('*')):
            if file.is_file():
                assert file.suffix != '.html', file
                archive.write(file, file.relative_to(root))
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(attachments) + 1
with zipfile.ZipFile(root / 'Все четыре шага.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.write(root / 'ПОРЯДОК РАБОТЫ.txt', 'ПОРЯДОК РАБОТЫ.txt')
    for folder in folders:
        for file in sorted(folder.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(root))
(root / 'composition-audit.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print({name: len(item['new_attachments']) for name, item in manifest.items()})
