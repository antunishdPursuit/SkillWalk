"""Offline, read-only transcription of tutorial frames with the installed OCR tool."""
from pathlib import Path
import json
import subprocess

result = {}
for frame in sorted(Path('/input').glob('frame-*.jpg')):
    completed = subprocess.run(['tesseract', str(frame), 'stdout', '--psm', '11'],
                               capture_output=True, text=True, timeout=20, check=True)
    result[frame.name] = completed.stdout[:16000]
print(json.dumps(result))
