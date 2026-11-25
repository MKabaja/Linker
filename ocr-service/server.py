"""Usługa OCR (RapidOCR, PaddleOCR przez ONNX) dla modułu zwrotów Linkera.

POST /ocr     body: JPEG, nagłówek X-Ocr-Mode: full | strip
GET  /health

Słucha tylko na 127.0.0.1: woła ją serwer Next.js, nigdy telefon.
"""

import argparse
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np
from rapidocr import RapidOCR

HOST = '127.0.0.1'
DEFAULT_PORT = 3201
MAX_BYTES = 3 * 1024 * 1024
MIN_STRIP_DIGITS = 8
ENGINE_COUNT = 2
WARM_UP_TEXT = '620999668641300663603312'


class EnginePool:
    """Dwa silniki = dwie klatki naraz; każdy chroniony własną blokadą."""

    def __init__(self, size):
        self.engines = [(RapidOCR(), threading.Lock()) for _ in range(size)]
        self.next_index = 0
        self.pick_lock = threading.Lock()

    def acquire(self):
        with self.pick_lock:
            for offset in range(len(self.engines)):
                index = (self.next_index + offset) % len(self.engines)
                engine, lock = self.engines[index]
                if lock.acquire(blocking=False):
                    self.next_index = (index + 1) % len(self.engines)
                    return engine, lock
            engine, lock = self.engines[self.next_index]
            self.next_index = (self.next_index + 1) % len(self.engines)
        lock.acquire()
        return engine, lock


def read_full(engine, image):
    # Flagi zawsze jawnie: RapidOCR pamięta use_det=False z poprzedniego wywołania i pełna klatka wracała pusta.
    return engine(image, use_det=True, use_cls=True, use_rec=True)


def read_strip(engine, image):
    return engine(image, use_det=False, use_cls=False, use_rec=True)


def to_lines(result, width, height, is_whole_image):
    texts = list(getattr(result, 'txts', None) or [])
    scores = list(getattr(result, 'scores', None) or [])
    boxes = getattr(result, 'boxes', None)
    if boxes is None or is_whole_image:
        boxes = [None] * len(texts)
    lines = []
    for text, score, box in zip(texts, scores, boxes):
        if not text.strip():
            continue
        lines.append({'text': text.strip(), 'confidence': round(float(score) * 100, 1), 'bbox': to_rect(box, width, height)})
    return lines


def to_rect(box, width, height):
    if box is None:
        return {'x': 0, 'y': 0, 'width': width, 'height': height}
    points = np.asarray(box)
    x0, y0 = points.min(axis=0)
    x1, y1 = points.max(axis=0)
    return {'x': float(x0), 'y': float(y0), 'width': float(x1 - x0), 'height': float(y1 - y0)}


def has_enough_digits(lines):
    return any(len(re.sub(r'\D', '', line['text'])) >= MIN_STRIP_DIGITS for line in lines)


def recognize(pool, image, mode):
    height, width = image.shape[:2]
    engine, lock = pool.acquire()
    try:
        if mode == 'strip':
            lines = to_lines(read_strip(engine, image), width, height, is_whole_image=True)
            if has_enough_digits(lines):
                return {'width': width, 'height': height, 'lines': lines, 'mode': 'strip'}
        lines = to_lines(read_full(engine, image), width, height, is_whole_image=False)
        return {'width': width, 'height': height, 'lines': lines, 'mode': 'full'}
    finally:
        lock.release()


def warm_up(pool):
    """Pierwsze wywołanie silnika trwa ok. 1 s, więc robimy je przy starcie, nie przy pierwszym skanie."""
    image = np.full((64, 640, 3), 255, np.uint8)
    cv2.putText(image, WARM_UP_TEXT, (10, 45), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    for engine, _ in pool.engines:
        read_strip(engine, image)
        read_full(engine, image)


def create_handler(pool):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != '/health':
                return self.reply(404, {'message': 'Nie ma takiej ścieżki.'})
            self.reply(200, {'status': 'ok', 'engines': len(pool.engines)})

        def do_POST(self):
            if self.path != '/ocr':
                return self.reply(404, {'message': 'Nie ma takiej ścieżki.'})
            length = parse_length(self.headers.get('Content-Length'))
            if length <= 0 or length > MAX_BYTES:
                return self.reply(413, {'message': 'Pusty obraz albo większy niż 3 MB.'})
            mode = 'strip' if self.headers.get('X-Ocr-Mode') == 'strip' else 'full'
            started = time.perf_counter()
            image = cv2.imdecode(np.frombuffer(self.rfile.read(length), np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                return self.reply(400, {'message': 'To nie jest poprawny JPEG.'})
            try:
                result = recognize(pool, image, mode)
            except Exception as error:  # błąd silnika nie może zatrzymać usługi
                return self.reply(500, {'message': f'Błąd OCR: {error}'})
            result['ms'] = round((time.perf_counter() - started) * 1000)
            self.reply(200, result)

        def reply(self, status, body):
            payload = json.dumps(body, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, format, *args):
            pass

    return Handler


def parse_length(value):
    try:
        return int(value or 0)
    except ValueError:
        return 0


def read_port():
    parser = argparse.ArgumentParser(description='Usługa RapidOCR dla Linkera (tylko 127.0.0.1).')
    parser.add_argument('--port', type=int, default=int(os.environ.get('OCR_SERVICE_PORT', DEFAULT_PORT)))
    return parser.parse_args().port


if __name__ == '__main__':
    port = read_port()
    engine_pool = EnginePool(ENGINE_COUNT)
    warm_up(engine_pool)
    print(f'[ocr-service] RapidOCR x{ENGINE_COUNT} na http://{HOST}:{port}', flush=True)
    ThreadingHTTPServer((HOST, port), create_handler(engine_pool)).serve_forever()
