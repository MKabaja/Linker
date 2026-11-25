# ocr-service

Usługa RapidOCR (PaddleOCR przez ONNX) dla skanera zwrotów. Woła ją tylko serwer Next.js (`OCR_SERVICE_URL`, domyślnie `http://127.0.0.1:3201`); słucha wyłącznie na `127.0.0.1`.

## Instalacja

Wymaga Pythona 3.12 lub nowszego (`py -0` pokazuje zainstalowane wersje).

```powershell
cd ocr-service
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

Modele ONNX są w paczce `rapidocr`, nic nie pobiera się przy starcie.

## Uruchomienie

```powershell
.venv\Scripts\python server.py
```

Port: `--port 3202` albo zmienna `OCR_SERVICE_PORT` (domyślnie 3201). Start trwa kilka sekund (rozgrzewka obu silników), gotowość oznacza linia `[ocr-service] RapidOCR x2 na http://127.0.0.1:3201`.

Gdy usługa nie działa, Linker przez 15 s czyta klatki zapasowym tesseract.js i potem znowu próbuje usługi.

## API

- `GET /health` → `{ "status": "ok", "engines": 2 }`
- `POST /ocr`, body: JPEG (maks. 3 MB), nagłówek `X-Ocr-Mode: full | strip`
  - `full`: wykrywanie linii, obrót i odczyt (ok. 0,3–1,4 s);
  - `strip`: sam odczyt paska z numerem (ok. 30 ms); gdy wyjdzie mniej niż 8 cyfr, usługa czyta klatkę trybem `full`.
  - odpowiedź: `{ width, height, mode, ms, lines: [{ text, confidence (0–100), bbox: { x, y, width, height } }] }`, `mode` to tryb faktycznie użyty.
