"""Standalone offline diagnostic using the same installed OCR engine and thresholds."""
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('layered', '/checker.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
files = sorted(Path('/input').glob('*.png'))
if not 1 <= len(files) <= 12:
    raise ValueError('Expected 1 to 12 diagnostic frames')
print(json.dumps({file.name: checker.region_ocr(checker.read_image(file)) for file in files}, indent=2))
