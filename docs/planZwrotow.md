# Linker — moduł zwrotów (plan brancha `feat/returns`)

> Plan na podstawie ustaleń z 06.11.2026. Szkic kierunku, nie umowa: kolejność i zakres zmieniamy, gdy dowiemy się czegoś nowego.
> Fakty o API: `referencje/baselinker-api-map.md` (sekcje z 06.11.2026). Próbki etykiet: `docs/referencje/etykiety/`.

## 1. Problem

Do magazynu codziennie wraca dużo paczek. Żeby przyjąć zwrot, trzeba znaleźć zamówienie w BaseLinkerze, a to bywa bardzo pracochłonne:

- Na etykiecie zwrotnej odbiorcą jest sklep. Dane klienta są zagwiazdkowane (`KA*** Z***`, `tel. *****0919`).
- Paczka ma często kilka numerów przewozowych (nasz, pośrednika, zwrotny). Zamówienie może też mieć kilka przesyłek, a panel i `getOrders` znają tylko **ostatnią**.
- Część zamówień ma zagwiazdkowane nazwisko już w samym BaseLinkerze.
- Dziś trzeba ręcznie próbować po kolei każdej danej z etykiety, aż coś trafi.

## 2. Cel MVP

Telefon na magazynie: **skanujesz etykietę → Linker sam znajduje zamówienie → skanujesz EAN-y produktów, które przyszły → zapisujesz zwrot**. Zwroty mają listę, szczegóły i historię zmian.

Prototyp jest **całkowicie darmowy i bez AI**. AI do odczytu etykiet rozważamy dopiero, gdy MVP zadziała, i tylko w płatnym planie (darmowe plany używają danych do trenowania, a na etykietach są dane osobowe).

## 3. Ustalenia z testów API (06.11.2026)

| Ustalenie | Skutek dla projektu |
|---|---|
| API nie szuka po numerze przesyłki, imieniu, nazwisku, adresie ani kodzie pocztowym. Nieznane filtry są po cichu ignorowane. | Potrzebny **własny indeks** zamówień i paczek w bazie. |
| `getOrderPackages(order_id)` zwraca **wszystkie** przesyłki zamówienia (40/146 zamówień ze zwrotem ma ich kilka, do 4). | Indeks trzyma wszystkie numery: `courier_package_nr` i `courier_inner_number`. |
| `getOrders({ order_id })` działa zawsze, także dla zamówień starszych niż indeks. | 9-cyfrowe `order_id` sprawdzamy bezpośrednio w API. |
| `filter_external_order_id` działa (Allegro, Erli `261105x21790`). | Szukamy też w API, nie tylko w indeksie. |
| Telefon i e-mail tylko w dokładnym formacie (`+48…`). | Pełny telefon szukamy w indeksie po znormalizowanych cyfrach. Końcówkę tylko w indeksie. |
| Stronicowanie `getOrders` po `id_from` gubi zamówienia. | Synchronizacja stronicuje po `date_confirmed_from` z deduplikacją. |
| 45 dni ≈ 10 000 zamówień (średnio 218, maks. 513 dziennie). `getOrders` za 45 dni: ok. 2 min. | Indeks 45 dni. Pierwsze pobranie paczek ok. 10 000 wywołań, czyli 1,5–2 h, rozłożone w tle. |
| Numer zwrotny InPost („zwrot do nadawcy”) nie istnieje w BaseLinkerze. Oryginalny numer jest w tekście „Uwagi nadawcy”. | Gdy kod kreskowy nic nie da, potrzebny jest odczyt tekstu (OCR). |
| Moduł zwrotów BL jest zasilany automatycznie (99 zwrotów: Allegro, TikTok, AliExpress, wszystkie „Nowe”). | Na później: pokazywanie zgłoszenia klienta i ewentualny zapis do BL. MVP tego nie dotyka. |

## 4. Zasady modułu

- **BaseLinker tylko do odczytu.** Wołamy wyłącznie metody `get*`. Linker zapisuje tylko do własnej bazy.
- **Dane osobowe minimalnie.** Indeks trzyma tylko pola potrzebne do wyszukiwania i ma retencję 45 dni (starsze rekordy kasujemy). Zwrot zapisuje `order_id` i pozycje, bez kopii danych klienta (te pobieramy na żywo z API).
- **Aplikacja z danymi osobowymi nie jest publiczna.** Przed pierwszym testem przez tunel albo na Hetznerze musi działać ochrona hasłem (zadanie 4).
- **Logika wyszukiwania to czyste funkcje** w `utils/`: łatwo je przetestować na próbkach etykiet.
- Architektura według `docs/ARCHITECTURE.md`. Nowa warstwa `server/db/` (schematy Drizzle) do dopisania w A3.

## 5. Flow użytkownika

### W tle (bez udziału użytkownika)

1. Co 2 minuty cron woła `POST /api/returns/sync` (z sekretem).
2. Synchronizacja pobiera nowe i potwierdzone zamówienia (`getOrders`, kursor `date_confirmed_from`) i zapisuje je w indeksie.
3. Dla zamówień bez paczek albo ze zmianą przesyłek (dziennik `getJournalList`) pobiera `getOrderPackages`. W jednym uruchomieniu najwyżej ok. 80 wywołań, żeby zmieścić się w limicie 100/min. Pierwsze 45 dni uzupełnia się samo w ciągu ok. 2–3 h.
4. Usuwa z indeksu zamówienia starsze niż 45 dni.

### Na magazynie

1. **Telefon → Linker → „Zwroty” → „Skanuj”.** Jeden przycisk, bez wyboru trybu.
2. **Aparat łapie wszystkie kody kreskowe w kadrze** (Code128, DataMatrix, QR). Każdy nowy kod od razu idzie do wyszukiwania. Pewne trafienie: wibracja i przejście do zamówienia.
3. **Jeśli po ok. 3 s żaden kod nic nie dał**, Linker robi zdjęcie, czyta tekst (OCR) i szuka po wszystkich tropach naraz (kody + tekst).
4. **Wynik w trzech poziomach:**
   - **Poziom 1, dokładne trafienie:** otwiera się zamówienie. Przy kilku dokładnych trafieniach wyświetla się lista.
   - **Poziom 2, „Nie znaleziono dokładnego dopasowania — sprawdź te:”**: kandydaci uszeregowani punktami, na każdej karcie widać, co pasuje (np. „końcówka telefonu 0919 · kod 23-425”). Wybiera użytkownik.
   - **Poziom 3, „Nie znaleziono”:** lista odczytanych tropów, przycisk „Spróbuj ponownie” i pole do wpisania z ręki.
5. **Ekran zamówienia:** dane zamówienia i link do BaseLinkera, lista produktów z licznikiem `0 / 2`. Jeśli dla zamówienia jest już zwrot, ostrzeżenie z linkiem do niego.
6. **„Skanuj produkt”:** aparat w trybie ciągłym. Każdy EAN zwiększa licznik pasującej pozycji (sygnał i wibracja). EAN spoza zamówienia: ostrzeżenie i opcja „dodaj jako obcy”. Ręczne `+ / −`, stan pozycji: przyjęte albo uszkodzone. Opcjonalna notatka.
7. **„Zapisz zwrot”:** zapis zwrotu, pozycji i pierwszego wpisu w historii. Status wyliczany: **pełny**, gdy wszystko przyszło, **częściowy**, gdy część. Powrót do „Skanuj”.

### Lista i szczegóły

- `/returns`: tabela (data przyjęcia, numer zamówienia, źródło, status, sztuki przyjęte / zamówione), szukanie po numerze zamówienia, filtr dat.
- `/returns/[returnId]`: pozycje, notatka, historia zmian. Edycja zapisuje nowy wpis w historii (migawka stanu), stare wpisy zostają.

## 6. Wyszukiwanie: reguły

### Tropy wyciągane z tekstu i kodów (`extractSearchTraces`)

| Trop | Rozpoznanie | Gdzie szukamy | Poziom |
|---|---|---|---|
| `order_id` | samodzielny ciąg **dokładnie 9 cyfr** (nie fragment dłuższej liczby) | API `getOrders({ order_id })` + indeks | 1 |
| Numer paczki | ciąg cyfr albo liter i cyfr o długości ≥ 8 (np. `13549363258564`, `31734506509`, `A0065ELTU5`, `PX…`, `10…U`, 24 cyfry InPost); także po sklejeniu grup cyfr rozdzielonych spacjami (`354 9363 2585 64`) | indeks: `courier_package_nr`, `courier_inner_number` | 1 |
| ID zewnętrzne | UUID, wzorzec Erli `\d+x\d+`, ID sklepu | API `filter_external_order_id` + indeks | 1 |
| Pełny telefon | 9 cyfr albo `+48` / `48` + 9 cyfr, także z odstępami | indeks (ostatnie 9 cyfr) | 1 |
| Końcówka telefonu | cyfry po gwiazdkach (`*****0919`, `*** *** **0 459`), min. 3 | indeks: telefon kończy się na… | 2 |
| Kod pocztowy | `\d{2}-\d{3}` | indeks | 2 |
| Fragment nazwiska | litery z gwiazdkami (`Ko***`, `***zak`) | indeks: zaczyna się na / kończy się na (bez polskich znaków i wielkości liter) | 2 |
| Słowo (miasto) | słowo ≥ 3 litery | indeks: miasto | 2 |

**Każdy 9-cyfrowy ciąg sprawdzamy w dwóch rolach:** jako `order_id` i jako polski telefon (np. `728024800` na etykiecie Allegro).

### Wykluczenia (dane sklepu na każdej etykiecie zwrotnej)

Stała w `model/returns.constants.ts`: telefon sklepu (`…9093`), `Pcim 720`, `32-432`, `Pcim`, `KozackaDrogeria`, `Kozacka`, `Drogeria`. Bez tego każdy zwrot „pasowałby” do wszystkiego.

### Punktacja poziomu 2 (`scoreCandidates`, czysta funkcja)

- końcówka telefonu: +3, kod pocztowy: +3, miasto: +1, fragment nazwiska: +1 za każdy,
- remis rozstrzyga nowsza data zamówienia,
- pokazujemy najwyżej 10 kandydatów z wypisanymi powodami.

### Zestaw kontrolny (golden set) z `docs/referencje/etykiety/`

| Próbka | Trop | Oczekiwane `order_id` | Poziom |
|---|---|---|---|
| `1.jpg` InPost | „Uwagi nadawcy” `…95344` (tekst) | 354695917 | 1 (po OCR) |
| `2.jpg` InPost | „Uwagi nadawcy” `…70333` (tekst) | 354684769 | 1 (po OCR) |
| `3.jpg` InPost | „Uwagi nadawcy” `…30633` (tekst) | 354807519 | 1 (po OCR) |
| `4.jpg` DHL | kod/numer `31734506509` (3. z 3 paczek) albo dopisek `353637496` | 353637496 | 1 |
| `allegrokurier_…13-22-53.pdf` DPD | `Reference 1: 351408797`, numer `13549363258564` | 351408797 | 1 |
| `erlipro_….pdf` | `355575499`, `261105x21790`, numer `5210000159…` | 355575499 | 1 |
| pozostałe PDF (Allegro CZ, paczkomaty, TikTok) | numery paczek | do ustalenia w zadaniu 0 | 1 |

## 7. Model danych (Postgres + Drizzle)

```text
indexed_orders      order_id (PK), external_order_id, shop_order_id, order_source, order_source_id,
                    date_add, date_confirmed, fullname_normalized, phone_digits (ostatnie 9),
                    email, postcode, city_normalized, packages_synced_at (NULL = do pobrania), synced_at
indexed_packages    package_id (PK), order_id (FK, cascade), package_nr, inner_nr (oba znormalizowane:
                    wielkie litery, bez spacji), courier_code, package_type, tracking_status
sync_state          key (PK), value  — kursory: orders_date_confirmed, journal_last_log_id
returns             id (PK), order_id, received_at, note, created_at, updated_at
return_items        id (PK), return_id (FK), order_product_id (NULL dla „obcego”), ean, name,
                    quantity_ordered, quantity_received, condition ('accepted' | 'damaged')
return_events       id (PK), return_id (FK), created_at, kind ('created' | 'updated'), snapshot (jsonb)
```

- Indeksy: `indexed_packages(package_nr)`, `(inner_nr)`, `indexed_orders(phone_digits)`, `(postcode)`, `(external_order_id)`.
- Przy 10 000 wierszy wystarczy zwykłe `LIKE`, bez `pg_trgm` i wyszukiwania pełnotekstowego.
- Status zwrotu (pełny / częściowy) jest **wyliczany** z pozycji, nie zapisywany.
- Na później, gdy będzie logowanie: kto przyjął zwrot (`received_by`).

## 8. Struktura plików (propozycja)

```text
src/features/returns/
  components/      returns-scanner/ (aparat, kody → OCR), search-results/, return-form/
                   (pozycje, skan EAN, zapis), returns-table/, return-history/
  model/           returns.types.ts, returns.schemas.ts, returns.constants.ts (wykluczenia, punkty)
  server/db/       order-index.schema.ts, returns.schema.ts
  server/sources/  baselinker.client.ts, baselinker.config.ts, baselinker.schemas.ts (Zod odpowiedzi)
  server/mappers/  baselinker-order.mapper.ts
  server/repositories/ order-index.repository.ts, returns.repository.ts, sync-state.repository.ts
  server/services/ order-index-sync.service.ts, order-search.service.ts, returns.service.ts
  actions.ts       searchOrder, saveReturn, updateReturn
  utils/           extract-search-traces.ts, score-candidates.ts, normalize-phone.ts, match-ean.ts
src/shared/lib/db/client.ts            klient Drizzle (server-only)
src/app/returns/page.tsx               lista
src/app/returns/scan/page.tsx          skaner
src/app/returns/order/[orderId]/page.tsx  nowy zwrot dla zamówienia
src/app/returns/[returnId]/page.tsx    szczegóły i historia
src/app/api/returns/sync/route.ts      wyzwalacz synchronizacji (cron)
src/proxy.ts                           ochrona hasłem (Next 16: proxy zamiast middleware)
drizzle.config.ts, compose.yaml (Postgres lokalnie), .env.example
```

`baselinker.client.ts` leży na razie w `returns`. Przy Fazie 3 (zamówienia) przeniesiemy go do wspólnego miejsca.

## 9. Zadania

Legenda czasu: szacunek dla pracy we dwóch (Ty piszesz, ja robię review), z nauką nowych narzędzi. **Razem ok. 38–48 h**, czyli przy 3–4 h dziennie ok. 2–3 tygodnie.

Po każdym zadaniu: `npm run lint:fix` i `npm run typecheck` bez błędów; przy zadaniach 5, 9, 11 i 13 także `npm run build`.

---

**0. [ ] Test OCR na próbkach (spike, bez commita)** (ok. 1,5 h)

- Skrypt w scratchpadzie: `tesseract.js` na `1–4.jpg` i PDF-ach (po wyrenderowaniu do PNG).
- Sprawdzamy: czy wyciąga 24-cyfrowe numery z „Uwag nadawcy”, `Reference 1`, 9-cyfrowe `order_id`; czy radzi sobie z obróconym zdjęciem (`1.jpg`, `2.jpg` są do góry nogami) i ile to trwa.
- Uzupełniamy oczekiwane `order_id` dla pozostałych PDF-ów w golden secie.

**Weryfikacja:** tabela „próbka → odczytane tropy → trafienie tak/nie”. **Decyzja:** OCR wystarcza / potrzebne obracanie lub przycięcie / plan B (AI) wcześniej.

**1. [ ] Branch** (5 min)

```bash
git switch -c feat/returns
```

**2. [ ] Postgres lokalnie i Drizzle** (ok. 2 h)

- `compose.yaml` z Postgresem (wolumen, port tylko na `localhost`).
- Zależności: `drizzle-orm`, `postgres`, dev: `drizzle-kit`.
- `drizzle.config.ts`, `DATABASE_URL` w `.env.local`, `.env.example` z nazwami zmiennych bez wartości (`BASELINKER_TOKEN`, `PRIMAVERA_TOKEN`, `DATABASE_URL`, `SYNC_SECRET`, `APP_PASSWORD`).
- `src/shared/lib/db/client.ts` z `import 'server-only'`.
- Skrypty `db:generate`, `db:migrate` w `package.json`.

**Weryfikacja:** `docker compose up -d`, `npm run db:migrate` na pustym schemacie przechodzi, `typecheck` OK.
Commity:
- `build(deps): add drizzle orm and postgres driver`
- `chore(db): add local postgres and drizzle config`
- `chore(env): add .env.example`

**3. [ ] Warstwa `server/db/` w architekturze** (ok. 20 min)

- Dopisanie w `docs/ARCHITECTURE.md` (A3, A6): `server/db/*.schema.ts`, kto może importować schematy (tylko `repositories/`), reguła w `biome.json` (pytamy przed zmianą).

Commit: `docs(architecture): add server/db layer for drizzle schemas`

**4. [ ] Ochrona hasłem** (ok. 1–1,5 h)

- `src/proxy.ts`: HTTP Basic Auth z `APP_PASSWORD`, porównanie odporne na timing. Wyjątek: `/api/returns/sync` ma własny sekret.
- Przed implementacją przeczytać `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.

**Weryfikacja:** bez hasła 401 na każdej stronie, z hasłem działa. `curl` bez nagłówka zwraca 401.
Commit: `feat(auth): protect app with basic auth password`

**5. [ ] Klient BaseLinkera** (ok. 2 h)

- `baselinker.client.ts`: `callBaseLinker(method, parameters)` z timeoutem, sprawdzaniem `status`, błędami jako wartości (`{ status: 'error', code }`). Twarda blokada: tylko metody `get*`.
- Schematy Zod odpowiedzi `getOrders`, `getOrderPackages`, `getJournalList` (tylko potrzebne pola; liczby, które przychodzą jako stringi, rzutowane schematem).
- Ogranicznik tempa (pauza między wywołaniami) w `baselinker.config.ts`.

**Weryfikacja:** tymczasowe wywołanie dla zamówienia 353637496 zwraca 3 paczki; zły token daje czytelny błąd, nie wyjątek.
Commit: `feat(returns): add read-only BaseLinker client with response schemas`

**6. [ ] Schemat indeksu i mapowanie** (ok. 2 h)

- Tabele `indexed_orders`, `indexed_packages`, `sync_state` i migracja.
- Mapper: normalizacja telefonu (ostatnie 9 cyfr), nazwiska i miasta (małe litery, bez polskich znaków), numerów paczek (wielkie litery, bez spacji).

**Weryfikacja:** migracja przechodzi; mapper na zapisanej odpowiedzi daje oczekiwane pola, bez zbędnych danych osobowych (adres ulicy, e-mail tylko jeśli potrzebny).
Commity:
- `feat(returns): add order index schema`
- `feat(returns): map BaseLinker orders to index rows`

**7. [ ] Synchronizacja indeksu** (ok. 4 h)

- `syncOrderIndex()`: zamówienia od kursora `date_confirmed_from` (deduplikacja, upsert), potem paczki dla zamówień z `packages_synced_at IS NULL` (limit na jedno uruchomienie), retencja 45 dni.
- Odświeżanie paczek: `getJournalList` od `journal_last_log_id`. Najpierw ustalić, które typy zdarzeń to utworzenie i usunięcie paczki (z dokumentacji prawdopodobnie 9 i 10; 22 to zdarzenie przesyłki). Zaznaczone zamówienia dostają `packages_synced_at = NULL`.
- Zabezpieczenie: dziennik trzyma 3 dni, więc gdy kursor jest starszy, odświeżamy paczki zamówień z ostatnich 14 dni.
- `POST /api/returns/sync` z `Authorization: Bearer SYNC_SECRET`; zwraca podsumowanie (ile zamówień, ile paczek, ile zostało).

**Weryfikacja:**
- kilka ręcznych wywołań `curl`, potem pętla aż `packagesPending = 0`,
- SQL: ok. 10 000 zamówień, każde ma `packages_synced_at`,
- SQL: `31734506509` → 353637496, trzy numery InPost → zamówienia TikTok z golden setu,
- drugie wywołanie nie tworzy duplikatów.

Commity:
- `feat(returns): sync order index from BaseLinker`
- `feat(returns): sync order packages in batches`
- `feat(returns): refresh packages from order journal`
- `feat(returns): add sync route handler`

**8. [ ] Logika wyszukiwania: czyste funkcje** (ok. 3 h)

- `extractSearchTraces(text, codes)`: tropy z tabeli w sekcji 6 z wykluczeniami sklepu.
- `scoreCandidates(traces, candidates)`: punktacja poziomu 2 z powodami.
- `normalizePhone`, `matchEan` (EAN 12 vs 13 cyfr z zerem na początku).

**Weryfikacja:** zestaw przykładów z golden setu i z tekstu PDF-ów (np. wynik `pdftotext`). Każdy daje oczekiwane tropy; telefon sklepu i `32-432` są pominięte; 9 cyfr pojawia się w roli `order_id` i telefonu; 24-cyfrowy numer nie daje fałszywego `order_id`.
Commit: `feat(returns): extract and score search traces from label text`

**8a. [ ] (do decyzji) Vitest dla `utils/`** (ok. 1,5 h)

- Pierwszy framework testów w projekcie. Golden set jako testy `extractSearchTraces` i `scoreCandidates`.
- Nowa zależność: decyduje użytkownik.

Commity:
- `build(deps): add vitest`
- `test(returns): cover search traces with label samples`

**9. [ ] Serwis wyszukiwania i Server Action** (ok. 2,5 h)

- `searchOrder(traces)`: poziom 1 (indeks + API dla `order_id` i ID zewnętrznego), potem poziom 2 (zapytanie SQL po końcówkach, kodzie, mieście, nazwisku + punktacja), wynik jako unia `exact | candidates | notFound`.
- Server Action `searchOrderAction` z walidacją Zod.

**Weryfikacja:** dla każdej próbki z golden setu wpisany tekst daje oczekiwane `order_id`; zamówienie starsze niż 45 dni znajduje się po 9-cyfrowym `order_id`.
Commit: `feat(returns): search orders by label traces`

**10. [ ] Ekran skanowania** (ok. 6 h)

- Zależności: `barcode-detector` (zxing-wasm), `tesseract.js`.
- `/returns/scan`: aparat (`getUserMedia`, tylna kamera), pętla wykrywania kodów, każdy nowy kod → wyszukiwanie poziomu 1; po 3 s bez trafienia zdjęcie → OCR → pełne wyszukiwanie.
- Widoki wyniku: trafienie (przekierowanie), kandydaci (karty z powodami), nic (tropy, ponów, pole ręczne).
- Sprzątanie kamery przy wyjściu (`useEffect` z cleanup), obsługa braku zgody na aparat.
- Wibracja (`navigator.vibrate`, tylko Android) i krótki dźwięk.
- Test na telefonie: tunel `cloudflared tunnel --url http://localhost:3000` (HTTPS wymagany dla aparatu), hasło z zadania 4.

**Weryfikacja:** na telefonie wszystkie próbki golden setu (wydruk albo zdjęcie na ekranie) prowadzą do właściwego zamówienia; odmowa dostępu do aparatu daje komunikat i pole ręczne.
Commity:
- `build(deps): add barcode-detector and tesseract.js`
- `feat(returns): scan label barcodes with camera`
- `feat(returns): fall back to OCR when barcodes find nothing`
- `feat(returns): show search candidates and not found state`

**11. [ ] Ekran zamówienia i zapis zwrotu** (ok. 5 h)

- Tabele `returns`, `return_items`, `return_events` i migracja.
- `/returns/order/[orderId]`: produkty z `getOrders` na żywo, liczniki, skan EAN w trybie ciągłym, `+ / −`, stan pozycji, „obcy” EAN, notatka. Ostrzeżenie, gdy zwrot dla zamówienia już istnieje.
- Server Action `saveReturn`: Zod, transakcja (zwrot + pozycje + wpis `created` z migawką).

**Weryfikacja:** zwrot częściowy (1 z 2) i pełny zapisują się z poprawnym statusem; EAN z zerem na początku pasuje; podwójne kliknięcie „Zapisz” nie tworzy dwóch zwrotów.
Commity:
- `feat(returns): add returns schema`
- `feat(returns): show order products for return`
- `feat(returns): mark returned products by EAN scan`
- `feat(returns): save return with items and history entry`

**12. [ ] Lista, szczegóły i historia** (ok. 4 h)

- `/returns`: tabela (TanStack Table), szukanie po `order_id`, filtr dat, stronicowanie w SQL.
- `/returns/[returnId]`: pozycje, notatka, historia; edycja zapisuje wpis `updated` z migawką.
- Pozycja „Zwroty” w sidebarze; `loading.tsx`, `error.tsx` i pusty stan.

**Weryfikacja:** edycja zwrotu dodaje wpis w historii, stara wersja jest widoczna; pusta lista pokazuje pusty stan.
Commity:
- `feat(returns): list returns with search and date filter`
- `feat(returns): show return details and history`
- `feat(returns): edit return as new history entry`
- `feat(nav): add returns to sidebar`

**13. [ ] Porządki, dokumenty, test na magazynie** (ok. 2 h)

- `docs/decyzje.md`: baza danych, retencja 45 dni, BL tylko do odczytu, MVP bez AI, `baselinker.client` do przeniesienia przy Fazie 3.
- `docs/planProjektu.md`: odpowiedź na otwartą decyzję o bazie danych.
- Pełne `lint:fix`, `typecheck`, `build`.
- Test na magazynie: 10–20 prawdziwych zwrotów, notatki, co nie trafiło.

Commit: `docs(returns): record decisions for returns module`

**14. [ ] Pull request** (15 min). Tytuł i treść według `docs/PR_TEMPLATE.md`, PR zakładasz sam.

**Gotowe, gdy:** na magazynie skanujesz etykietę, w większości przypadków od razu widzisz właściwe zamówienie, a w pozostałych krótką listę kandydatów. Zwrot zapisuje się z pozycjami i jest na liście z historią.

## 10. Wdrożenie (osobny branch po MVP)

- Hetzner: Postgres (bez portu na zewnątrz), `next start` za Caddy (HTTPS), cron co 2 min z `curl` do `/api/returns/sync`.
- Backup bazy (`pg_dump` raz dziennie).

## 11. Później / poza MVP

- Odczyt etykiety przez AI (płatny plan, np. Gemini Flash-Lite albo Claude), gdy OCR nie wystarcza.
- Zgłoszenie zwrotu klienta z modułu zwrotów BL (`getOrderReturns`) obok tego, co przyszło.
- Zapis do BL: utworzenie zwrotu (`addOrderReturn`) albo status zamówienia „Zwrot” / „Zwrot Częściowy”. Pierwszy zapis do produkcji, tylko po decyzji.
- Logowanie użytkowników i „kto przyjął”.
- Miniatury produktów na ekranie zamówienia.
- Zdjęcia uszkodzonych produktów.

## 12. Otwarte decyzje

- Kto pisze kod w poszczególnych zadaniach.
- Docker lokalnie (zalecane) czy Postgres od razu na Hetznerze.
- Vitest (zadanie 8a): teraz czy w Fazie 6.
- Typy zdarzeń dziennika dla utworzenia i usunięcia paczki (zadanie 7).
- `tracking_status` 105 (TikTok, InPost, zwrot do nadawcy): czy da się na nim oprzeć automatyczne wykrywanie zwrotów.
- Wynik zadania 0: czy sam OCR wystarczy.
