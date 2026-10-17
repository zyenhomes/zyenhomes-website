#!/usr/bin/env python3
"""Create smaller WebP copies and update site references, preserving originals."""
from pathlib import Path
import re
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent.parent
EXTS = {".jpg", ".jpeg", ".png"}
MAX_WIDTH = 1800
QUALITY = 80
SKIP_DIRS = {".git", ".github", "node_modules", ".venv"}
images = []
for file in ROOT.rglob("*"):
    if not file.is_file() or file.suffix.lower() not in EXTS:
        continue
    if any(part in SKIP_DIRS for part in file.relative_to(ROOT).parts):
        continue
    images.append(file)

converted = []
for source in images:
    target = source.with_suffix(".webp")
    try:
        if not target.exists() or source.stat().st_mtime > target.stat().st_mtime:
            with Image.open(source) as original:
                image = ImageOps.exif_transpose(original)
                if image.width > MAX_WIDTH:
                    image.thumbnail((MAX_WIDTH, 20000), Image.Resampling.LANCZOS)
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.save(target, "WEBP", quality=QUALITY, method=6)
        converted.append(source)
    except (OSError, ValueError, UnidentifiedImageError) as error:
        print(f"Skipping {source.relative_to(ROOT)}: {error}")

# Rewrite image filenames used by pages, CSS and gallery JavaScript arrays.
# All original JPG/PNG files remain in the repository as backups.
names = {source.name: source.with_suffix(".webp").name for source in converted}
pattern = re.compile("|".join(re.escape(name) for name in sorted(names, key=len, reverse=True))) if names else None
if pattern:
    for page in list(ROOT.rglob("*.html")) + list(ROOT.rglob("*.js")) + list(ROOT.rglob("*.css")):
        if any(part in SKIP_DIRS for part in page.relative_to(ROOT).parts):
            continue
        before = page.read_text(encoding="utf-8")
        after = pattern.sub(lambda match: names[match.group(0)], before)
        if after != before:
            page.write_text(after, encoding="utf-8")
            print(f"Updated references: {page.relative_to(ROOT)}")
print(f"Optimized {len(converted)} images; original files retained.")

# Re-run automatically whenever source images or this optimizer change.
