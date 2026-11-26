# Dziennik zdarzeń modułu zwrotów

Plik na dysku do debugowania skanera i analizy dopasowania (co znaleziono, po czym, jak dopasowano). Pomocniczy: jego awaria nigdy nie przerywa pracy aplikacji.

## Format

- Plik dzienny `logs/returns/RRRR-MM-DD.jsonl` (doba w strefie Europe/Warsaw), jedna linia JSON na zdarzenie. Katalog jest w `.gitignore`.
- Wspólne pola: `v` (wersja formatu, teraz `1`; rośnie przy zmianie niezgodnej wstecz), `at` (ISO, zegar serwera), `type`, `appVersion` (krótki hash gita albo `null`), opcjonalnie `scanId`, `userId`, `userName`. Zdarzenia z przeglądarki mają też `clientAt` (zegar telefonu).
- Typy i schemat Zod: `src/features/returns/model/event-log.types.ts`, `event-log.schemas.ts`.
- Retencja: przy pierwszym zapisie danego dnia usuwane są pliki starsze niż 30 dni.

## Typy zdarzeń

| Źródło | `type` |
|---|---|
| Serwer | `search` (tropy, decyzja, top 3 kandydatów z bitami i powodami, liczba zapytań do BL na żywo, czas, rozmiar indeksu), `ocr` (silnik, tryb, czas, liczba linii, wynik kolejki), `return.created`, `return.duplicate`, `return.updated` (pozycje przed i po, czy zmieniono notatkę), `return.deleted`, `return.restored`, `auth.login` (sukces albo porażka z powodem, bez e-maila i hasła), `auth.logout` |
| Skaner (przeglądarka) | `scan.started`, `scan.finished`, `scan.read`, `scan.trace-rejected` (tylko powód `shop`; szum odrzucony w klasyfikatorze tekstu nie jest widoczny), `scan.trace-state`, `scan.decision` |

## Przełączniki (`.env.local`)

- `RETURNS_EVENT_LOG`: `false` wyłącza dziennik (domyślnie włączony).
- `RETURNS_LOG_OCR_TEXT`: `false` usuwa z dysku surowy tekst odczytów `text` (domyślnie `true`). Tekst może zawierać dane z etykiety.
- `RETURNS_EVENT_LOG_DIR`: katalog dziennika (domyślnie `logs/returns`).

## Zasady działania

- Serwer dopisuje zdarzenie do kolejki w pamięci (`logReturnsEvent`) i zapisuje porcjami w tle co 0,5 s; żądanie nigdy nie czeka na dysk. Błąd zapisu jest liczony (`getEventLogHealth`), a pierwszy trafia do `console.warn`. Kolejka ma limit 5000 zdarzeń. Przy zatrzymaniu procesu ostatnie ok. 0,5 s zdarzeń może przepaść.
- Skaner zbiera zdarzenia w buforze (maks. 500) i nic nie wysyła w trakcie skanu. Wysyłka na `POST /api/returns/events`: po zakończeniu skanu, po 5 s bezczynności (`requestIdleCallback`) oraz przy `pagehide` i ukryciu karty (`sendBeacon`).
- Prywatność: dziennik nie zawiera haseł, tokenów ani ciasteczek i nie jest wysyłany poza serwer.
