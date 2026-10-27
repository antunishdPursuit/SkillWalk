"""Bounded offline crop comparison. No LLM, network, or candidate-driven alignment."""
import csv
import io
import json
from pathlib import Path
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image

LIMITS = {'channelDelta': 40, 'activeMismatch': .12, 'tileMismatch': .30,
          'backgroundDelta': 12, 'foregroundDelta': 12, 'alignmentPixels': 6, 'ocrConfidence': 55}


def clean(text):
    return ' '.join(text.split())


def read_image(file):
    with Image.open(file) as image:
        if not (64 <= image.width <= 1920 and 64 <= image.height <= 1920):
            raise ValueError('Image dimensions outside bounded verification limits')
        return image.convert('RGB')


def ocr_pass(image):
    # Two segmentation modes must agree; disagreement is not repaired using output text.
    enlarged = image.resize((image.width * 3, image.height * 3))
    data = io.BytesIO()
    enlarged.save(data, format='PNG')
    observations = []
    for mode in (6, 11):
        run = subprocess.run(['tesseract', 'stdin', 'stdout', '--psm', str(mode), 'tsv'],
                             input=data.getvalue(), capture_output=True, timeout=25, check=True)
        rows = list(csv.DictReader(io.StringIO(run.stdout.decode('utf-8')), delimiter='\t'))
        words = [r for r in rows if r.get('text', '').strip()]
        observations.append({'mode': mode, 'text': clean(' '.join(r['text'] for r in words)),
                             'minimumConfidence': min((float(r['conf']) for r in words), default=0)})
    readable = (bool(observations[0]['text']) and
                observations[0]['text'] == observations[1]['text'] and
                all(o['minimumConfidence'] >= LIMITS['ocrConfidence'] for o in observations))
    return {'status': 'passed' if readable else 'unverified', 'observations': observations,
            'text': observations[0]['text'] if readable else None}


def ocr(image):
    raw = ocr_pass(image)
    gray = np.asarray(image.convert('L'))
    mask = (gray < 180).astype('uint8') * 255
    horizontal = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((1, 40), np.uint8))
    vertical = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((25, 1), np.uint8))
    lines = cv2.dilate(cv2.bitwise_or(horizontal, vertical), np.ones((3, 3), np.uint8))
    cleaned = ocr_pass(Image.fromarray(255-cv2.subtract(mask, lines)))
    usable = [entry for entry in (raw, cleaned) if entry['status'] == 'passed']
    agreed = bool(usable) and len({entry['text'] for entry in usable}) == 1
    return {'status': 'passed' if agreed else 'unverified',
            'text': usable[0]['text'] if agreed else None,
            'variants': {'raw': raw, 'bordersRemoved': cleaned},
            'reason': 'Each usable variant requires two-mode agreement; conflicting usable variants remain uncertain'}


def background(image):
    pixels = np.asarray(image)
    return np.median(pixels.reshape(-1, 3), axis=0)


def translated(image, dx, dy):
    fill = tuple(int(v) for v in background(image))
    result = Image.new('RGB', image.size, fill)
    result.paste(image, (dx, dy))
    # Refuse to hide edge content when moving the source-derived capture.
    pixels = np.asarray(image).astype(float)
    mask = np.max(np.abs(pixels - np.array(fill)), axis=2) > 40
    lost = ((dx > 0 and mask[:, -dx:].any()) or (dx < 0 and mask[:, :-dx].any()) or
            (dy > 0 and mask[-dy:, :].any()) or (dy < 0 and mask[:-dy, :].any()))
    return result, bool(lost)


def metrics(reference, candidate):
    a, b = np.asarray(reference).astype(float), np.asarray(candidate).astype(float)
    bg_a, bg_b = background(reference), background(candidate)
    active = (np.max(np.abs(a-bg_a), axis=2) > 40) | (np.max(np.abs(b-bg_b), axis=2) > 40)
    different = np.max(np.abs(a-b), axis=2) > LIMITS['channelDelta']
    count = int(active.sum())
    mismatch = float((different & active).sum() / max(count, 1))
    worst = 0.
    # Local evidence prevents the white background from hiding a missing small control.
    for y in range(0, a.shape[0], 8):
        for x in range(0, a.shape[1], 8):
            tile = active[y:y+8, x:x+8]
            if tile.sum() >= 2:
                worst = max(worst, float((different[y:y+8, x:x+8] & tile).sum()/tile.sum()))
    core_a = a[np.max(np.abs(a-bg_a), axis=2) > 80]
    core_b = b[np.max(np.abs(b-bg_b), axis=2) > 80]
    foreground_delta = (float(np.max(np.abs(np.median(core_a, axis=0)-np.median(core_b, axis=0))))
                        if len(core_a) and len(core_b) else 255.)
    return {'activePixels': count, 'activeMismatch': mismatch, 'worstTileMismatch': worst,
            'backgroundDelta': float(np.max(np.abs(bg_a-bg_b))), 'foregroundDelta': foreground_delta}


def visual(reference, creator, candidate):
    if candidate.size != creator.size or any(abs(a-b) > 2 for a, b in zip(reference.size, creator.size)):
        return {'status': 'unverified', 'reason': 'Capture dimensions differ; no output-dependent resizing'}
    canvas = (max(reference.width, creator.width), max(reference.height, creator.height))
    original_sizes = {'reference': reference.size, 'creator': creator.size, 'candidate': candidate.size}
    def pad(image):
        result = Image.new('RGB', canvas, tuple(int(v) for v in background(image)))
        result.paste(image, (0, 0))
        return result
    # Device scale rounding may differ by <=2 pixels. Pad only; never crop or rescale content.
    reference, creator, candidate = [pad(image) for image in (reference, creator, candidate)]
    # Choose only a small translation from reference + pinned creator, never candidate.
    best = None
    for dy in range(-LIMITS['alignmentPixels'], LIMITS['alignmentPixels']+1):
        for dx in range(-LIMITS['alignmentPixels'], LIMITS['alignmentPixels']+1):
            aligned, lost = translated(creator, dx, dy)
            if lost:
                continue
            a, b = np.asarray(reference).astype(float), np.asarray(aligned).astype(float)
            score = float(np.abs(a-b).mean())
            choice = (score, abs(dx)+abs(dy), dx, dy)
            if best is None or choice < best:
                best = choice
    if best is None:
        return {'status': 'unverified', 'reason': 'Alignment would discard edge content'}
    _, _, dx, dy = best
    aligned, lost = translated(candidate, dx, dy)
    evidence = metrics(reference, aligned)
    passed = (not lost and evidence['activePixels'] >= 16 and
              evidence['activeMismatch'] <= LIMITS['activeMismatch'] and
              evidence['worstTileMismatch'] <= LIMITS['tileMismatch'] and
              evidence['backgroundDelta'] <= LIMITS['backgroundDelta'] and
              evidence['foregroundDelta'] <= LIMITS['foregroundDelta'])
    return {'status': 'passed' if passed else 'failed', 'alignment': {'x': dx, 'y': dy},
            'alignmentSource': 'video-and-pinned-creator-only', 'discardedContent': lost,
            'metrics': evidence, 'limits': LIMITS, 'originalSizes': original_sizes, 'paddedCanvas': canvas}


def verify(reference, creator, candidate, expected_text):
    source_text, output_text = ocr(reference), ocr(candidate)
    readable = source_text['status'] == output_text['status'] == 'passed'
    status = ('passed' if source_text['text'] == output_text['text'] == clean(expected_text)
              else 'failed') if readable else 'unverified'
    if readable and source_text['text'] == output_text['text'] != clean(expected_text):
        status = 'unverified'  # Both OCR passes can omit the same small controls.
    content = {'status': status, 'source': source_text, 'output': output_text,
               'browserText': clean(expected_text),
               'reason': 'Require agreement between independent source OCR, output OCR and browser text'}
    appearance = visual(reference, creator, candidate)
    return {'scope': 'selected-source-crop-only', 'content': content, 'appearance': appearance,
            'passed': status == 'passed' and appearance['status'] == 'passed',
            'limitations': ['Crop completeness and tutorial state selection are separate gates.',
                            'OCR agreement is bounded evidence, not proof of every glyph.',
                            'Image thresholds are calibrated controls, not universal fidelity.']}


if __name__ == '__main__':
    request = json.loads(Path('/input/request.json').read_text())
    images = [read_image(Path('/input') / name) for name in ('reference.png', 'creator.png', 'candidate.png')]
    report = verify(*images, request['browserText'])
    count = request.get('neighborCount', 0)
    if count not in (0, 2):
        raise ValueError('Invalid temporal reference count')
    observations = [ocr(read_image(Path('/input') / f'neighbor{i}.png')) for i in range(count)]
    stable = (count == 2 and report['content']['source']['status'] == 'passed' and
              all(o['status'] == 'passed' and o['text'] == report['content']['source']['text'] for o in observations))
    report['temporal'] = {'status': 'passed' if stable else 'unverified', 'observations': observations,
                          'reason': 'Require readable agreeing source text before, at and after the selected state'}
    print(json.dumps(report))
