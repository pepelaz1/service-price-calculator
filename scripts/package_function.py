"""Create the small, dependency-free Yandex Cloud Functions deployment ZIP."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "function.zip"
FILES = ["server/api.mjs", "server/handler.mjs", "data/demo.sqlite"]

if not (ROOT / "data" / "demo.sqlite").is_file():
    raise SystemExit("Run npm run db:seed first")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
    archive.writestr("package.json", '{"type":"module"}\n')
    archive.writestr("index.mjs", "export { handler } from './server/handler.mjs';\n")
    for relative_path in FILES:
        archive.write(ROOT / relative_path, relative_path)

print(OUTPUT)
