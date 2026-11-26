# Moduł zwrotów: jak działa demo i jak przenieść je do Linkera

Instrukcja dla agenta, który zbuduje moduł zwrotów w Linkerze na podstawie tego demo. Demo po przeniesieniu zostanie usunięte, więc wszystko, co trzeba wiedzieć, jest tutaj albo w plikach z sekcji 9. Te pliki czytasz jako referencję, ale piszesz kod od nowa: z nazewnictwem i architekturą Linkera, nie kopiujesz 1:1.

**Poza zakresem tego dokumentu:**
- logowanie (w demo jest prowizoryczny Basic Auth w `src/proxy.ts`);
- wygląd, layout i nawigacja;
- inne moduły Linkera.

Linker ma na to własne rozwiązania. Tu opisane jest tylko, **jak działa funkcja** i **czego nauczyliśmy się po drodze**.

Stan na 25.11.2026: zwroty działają stabilnie na telefonie. W dzienniku jest 59 skanów: 53 trafienia automatyczne, 3 wybory z listy kandydatów, 2 „nie znaleziono” i 1 przerwany. Mediana czasu do automatycznego trafienia to 11 s, a 90. percentyl 32 s.

---

## 1. Co robi moduł (z perspektywy magazynu)

1. Pracownik otwiera skaner na telefonie i trzyma etykietę paczki zwrotnej przed aparatem. Nie robi zdjęć, aplikacja czyta strumień z aparatu.
2. Aplikacja zbiera z etykiety **tropy**: kody kreskowe, numery paczek, numer zamówienia, ID zewnętrzne, zamaskowany telefon (`7320***83`), zamaskowane imię i nazwisko (`m*** ka***`), kod pocztowy.
3. Tropy są punktowane na lokalnym indeksie zamówień z BaseLinkera (ostatnie 45 dni).
4. **Jedno pewne trafienie:** wibracja, dźwięk, zwrot dodaje się automatycznie z domyślnie wszystkimi sztukami przyjętymi i otwiera się ekran zwrotu.
5. **Kilku podobnych kandydatów:** panel z 2–3 zamówieniami i powodami (np. „telefon 7320___83 · inicjały m/ka”) do wyboru ręcznego.
6. **Nic nie pasuje:** panel „Wpisz” (numer paczki, zamówienia, ID zewnętrzne, telefon, maska imienia).
7. Na ekranie zwrotu pracownik koryguje sztuki `− / +` (zwrot **Pełny** albo **Częściowy**), dopisuje notatkę i naciska „Skanuj następną”.
8. Lista zwrotów z wybranego dnia ma kafelki (liczba, pełne/częściowe), kopiowanie wszystkich ID i eksport CSV.
9. Ten sam zwrot zeskanowany drugi raz nie tworzy duplikatu: status `duplicate` i komunikat „Ten zwrot był już na liście”.

**Kluczowa obserwacja biznesowa:** na paczce zwrotnej kod kreskowy zwykle **nic nie daje**. Przewoźnik nakleja własną etykietę zwrotną, której numeru BaseLinker nie zna. W dzienniku z 53 automatycznych trafień 50 dał OCR (42 RapidOCR, 8 tesseract), 2 wpis ręczny, a tylko 1 kod kreskowy. Cały moduł stoi na OCR i dopasowaniu przybliżonym, a kody kreskowe są dodatkiem.

---

## 2. Jak do tego doszliśmy (historia wersji)

| Etap | Co było | Co wyszło |
|---|---|---|
| **v1** (17.11, commit `99c06a1`) | Indeks zamówień w pliku JSON (14 dni). OCR tesseract.js **w przeglądarce** na zdjęciu ramki. Szukanie: dokładny numer, potem odległość Hamminga ≤ 1, potem zapytania do BL na żywo. | Często nie znajdował zamówienia. OCR mylił cyfry (5↔6, 3↔8, 1↔7, 0↔8), kod kreskowy na zwrocie wskazywał numer przewoźnika, czasem był tylko zamaskowany telefon lub imię. Zapytania do BL były wolne i ograniczone limitem. |
| **v2** (18.11, commit `979961c`, plan w `plan-poprawek-zwroty-demo.md`) | SQLite + indeks w pamięci. Wszystkie tropy jako „wzorce z dziurami”, punktacja w bitach, głosowanie z wielu klatek. OCR **na serwerze** (pula tesseract.js, 2 konfiguracje). Strumień klatek. Dziennik skanów i widok `/stats`. | Skuteczność skoczyła. Wąskim gardłem został OCR: tesseract źle czytał długie numery (24 cyfry InPost) i tekst do góry nogami. |
| **v3** (18–19.11, commit `876194b`) | Usługa **RapidOCR** w Pythonie (ONNX), tesseract jako zapas. Bramka ostrości/ruchu, wątki robocze w przeglądarce, kolejka OCR, wycinek paska pod DataMatrix etykiety zwrotnej InPost, strażnik aparatu, dziennik diagnostyczny z telefonu. | RapidOCR dał 42 z 53 automatycznych trafień (8 tesseract z okresu przed nim). Zostały zawieszenia skanera, opisane w sekcji 6 (błędy 1–8). |
| **v3 + poprawki** (19–25.11) | Kody kreskowe w osobnym wątku i WASM z własnego serwera. Przejścia w aplikacji zamiast przeładowania. Blokada wygaszania ekranu (Screen Wake Lock). | Stabilnie: wiele skanów pod rząd przez „Skanuj następną” bez zawieszeń. |

Zasada, która się sprawdziła: **najpierw zmierzyć (dziennik skanów), potem poprawiać**. Prawie każda decyzja w v3 wynikała z liczb w `/stats` albo z dziennika diagnostycznego z telefonu.

---

## 3. Architektura (jak działa całość)

```
Telefon (przeglądarka, HTTPS)                                Serwer (Next.js)                          Usługi
┌──────────────────────────────────────────┐   JPEG     ┌─────────────────────────────┐   JPEG   ┌────────────────────┐
│ Skaner                                    │ ────────► │ POST /api/ocr                │ ───────► │ RapidOCR (Python)  │
│  ├─ pętla kodów (wątek: BarcodeDetector)  │           │  kolejka (2 naraz, najnowsza │          │ 127.0.0.1:3200     │
│  ├─ pętla OCR (wątek: bramka + JPEG)      │ ◄──────── │  klatka na skan) → OcrResponse│ ◄─────── │ zapas: tesseract.js│
│  ├─ silnik tropów (TraceBook, głosowanie) │  linie    └─────────────────────────────┘          └────────────────────┘
│  └─ wynik → POST /api/search              │  tropy    ┌─────────────────────────────┐
│                                           │ ────────► │ POST /api/search             │          ┌────────────────────┐
│ auto → POST /api/returns → ekran zwrotu   │ ◄──────── │  punktacja na indeksie w RAM │ ◄─────── │ SQLite zwroty.db   │
│ po skanie → POST /api/scan-log            │ ScoreResult│  (+ BL na żywo dla order_id) │          │ (indeks zamówień)  │
└──────────────────────────────────────────┘           └─────────────────────────────┘          └────────────────────┘
                                                         auto-sync co 3 min ──► BaseLinker (tylko get*, kolejka 650 ms)
```

Podział odpowiedzialności, który warto zachować:

- **Czysta logika bez I/O** (testowalna, wspólna dla klienta i serwera):
  - wzorce i koszty dopasowania (`utils/pattern.ts`);
  - klasyfikacja odczytów i głosowanie (`utils/trace-engine.ts`);
  - punktacja (`utils/score.ts`);
  - kontrakt typów (`model/traces.ts`, plik bez importów).
- **Serwer:** indeks zamówień (synchronizacja, zapytania), OCR, zapis zwrotów, dziennik.
- **Klient:** tylko aparat, zrzuty klatek, pętle i interfejs. Ciężka praca nigdy nie na głównym wątku.

---

## 4. Jak działa każda część

### 4.1 Indeks zamówień (synchronizacja z BaseLinkerem)

**Źródła:** `server/order-db.ts`, `server/order-index-sync.service.ts`, `server/search-index.ts`, `server/baselinker.client.ts`, `utils/normalize.ts`.

- **Tabele:**
  - `orders`: `order_id`, `external_order_id`, `order_source`, `order_status_id`, `date_add`, `date_confirmed`, `phone_digits` (ostatnie 9 cyfr), `first_name_norm`, `last_name_norm`, `postcode` (same cyfry), `city_norm`, `packages_synced_at`, `synced_at`;
  - `packages` (`package_nr_norm`, `inner_nr_norm`, `courier_code`, unikalne `(order_id, package_nr_norm)`);
  - `order_items` (nazwa, EAN, SKU, ilość);
  - `sync_state` (kursor, czas synchronizacji).
- **Normalizacja:**
  - numery paczek i ID zewnętrzne: wielkie litery, tylko `A-Z0-9`;
  - imiona, nazwiska i miasta: małe litery, bez polskich znaków (`ł` → `l` ręcznie, reszta przez NFD);
  - imię to pierwsze słowo, nazwisko ostatnie, z `delivery_fullname`, a gdy pusty, z `invoice_fullname`.
- **Synchronizacja zamówień:**
  - `getOrders` stronicowane po **`date_confirmed_from`** (nie `id_from`), deduplikacja przez upsert po `order_id`, strona = 100 zamówień, następna od `max(date_confirmed)`;
  - każda synchronizacja zaczyna **3 dni przed kursorem**, żeby złapać zmiany statusów i nowe numery paczek;
  - okno to **45 dni**, starsze zamówienia są usuwane (retencja).
- **Paczki:**
  - `getOrders` zwraca tylko ostatni numer (`delivery_package_nr`), więc w tle idzie `getOrderPackages` dla zamówień bez `packages_synced_at`, najnowsze pierwsze, do 80 wywołań po każdej synchronizacji;
  - świeże zamówienia (≤ 10 dni) bez żadnej paczki są sprawdzane ponownie po 2 h, bo paczka zwykle powstaje po potwierdzeniu;
  - indeks przeładowuje się co 20 paczek.
- **Auto-sync:** co 3 min, dopóki działa proces (w demo z `instrumentation.ts`). W Linkerze: cron lub kolejka zadań.
- **Indeks w pamięci:**
  - po każdej synchronizacji cała tabela trafia do tablicy `IndexedOrderRow[]` w RAM;
  - kilkanaście tysięcy zamówień to kilka MB, a pełny skan punktacji trwa milisekundy;
  - szukanie **nie woła BaseLinkera**.
- **BaseLinker na żywo** tylko wtedy, gdy punktacja nic nie dała, a jest w pełni odczytany `order_id` (9 cyfr) albo ID zewnętrzne spoza indeksu:
  - najwyżej 2 wywołania na zapytanie;
  - nieudane klucze są pamiętane przez 10 min;
  - trafienie jest dopisywane do bazy.
- **Ekran zamówienia** czyta produkty z `order_items`. `getOrders({order_id})` idzie tylko, gdy zamówienia nie ma w bazie. Nazwy statusów pochodzą z `getOrderStatusList` (cache w pamięci).

### 4.2 Tropy i wzorce

**Źródła:** `model/traces.ts`, `utils/pattern.ts`, `utils/trace-engine.ts` (klasyfikacja).

**Wzorzec** to tablica pozycji. Każda pozycja to jeden znany znak, kilka alternatyw (np. `"56"`) albo dziura `""`. Jedna funkcja dopasowania obsługuje numer z rozmazaną cyfrą, telefon z gwiazdkami i wynik głosowania z remisem.

**Rodzaje tropów** (`TraceKind`):

| Rodzaj | Rozpoznanie | Przykład |
|---|---|---|
| `package` | ciąg ≥ 8 znaków z ≥ 6 znanymi | `620999668641300663603312`, `JJD…` |
| `orderId` | 9 cyfr zaczynających się od `3` (zakres tego konta BL) | `3xxxxxxxx` |
| `externalId` | `\d+X\d+` albo 32 znaki hex (Allegro UUID bez myślników) | |
| `phone` | 9 cyfr albo 11 z `48`; maska z `*`, `x`, `•` | `7320***83`, `+48 732*****3` |
| `name` | litery przed gwiazdkami | `m*** ka***` → prefiksy `m`, `ka` |
| `postcode` | `\d{2}-\d{3}` | |

**Parsowanie odczytu OCR na wzorzec** (`parseNumberRead`):
- skleja grupy cyfr rozdzielone spacją, kreską lub kropką;
- `O/o` → `0` oraz `I/l/|` → `1`, ale tylko obok cyfry, żeby „PL” na końcu numeru nie stało się „P1”;
- w ciągach w większości cyfrowych dodatkowo `S` → `5`, `B` → `8`, `Z` → `2`, `G` → `6`, `D/Q` → `0`;
- `?`, `_`, `*` to dziury.

**Maska telefonu:**
- gdy cyfr i gwiazdek jest 9, wzorzec pozycyjny (`7320___83`), bo gwiazdka = jedna cyfra (`STAR_IS_ONE_DIGIT`, potwierdzone na etykietach);
- w przeciwnym razie znany początek i koniec bez pozycji;
- minimum 2 znane cyfry.

**Maska imienia:** prefiksy słów, liczba gwiazdek ignorowana. Prefiksy mogą pasować do imienia i nazwiska w dowolnej kolejności; obsłużone są też nazwiska dwuczłonowe.

**Koszt dopasowania** (`matchCost`):
- zgodny znak lub dziura: 0;
- znak z alternatyw: 0,1;
- typowa pomyłka OCR: 0,3 (tabela `CONFUSION`: 5↔6, 3↔8, 1↔7, 0↔8, 6↔8, 2↔7, 0↔O, 1↔I, 8↔B, 5↔S, 2↔Z);
- inna różnica: 1;
- różnica długości o 1: najlepsze miejsce pominięcia znaku + 0,5;
- numer paczki zawarty w odczycie (albo odczyt będący fragmentem numeru, min. 8 znaków): + 0,3.
- Dla długich numerów (≥ 14 znanych cyfr) dodatkowo odległość edycyjna, bo OCR gubi cyfry w środku. Przed nią jest szybki filtr: 6-cyfrowe fragmenty odczytu za wspólnym początkiem numeru.
- **Naprawa początku:** 24-cyfrowe numery mają częste 7-cyfrowe początki (np. `6209996…`, `5210000…`, liczone z indeksu, min. 30 numerów). Gdy odczyt zgadza się z takim początkiem na ≥ 5 cyfrach z przesunięciem ±2, początek jest podmieniany, a odczyt przycinany do 24 znaków (`repairPrefix`).

**Wykluczenia (dane własne sklepu nie są tropem):**
- kod pocztowy `32-432`;
- teksty „Pcim”, „720”, „Kozacka”, „Drogeria” (cała linia odrzucona);
- telefony kończące się na `9093`.

Bez tego adres nadawcy na każdej etykiecie wygrywałby punktację. W Linkerze trzymaj to w konfiguracji sklepu, nie w kodzie.

**Etykieta zwrotna InPost:**
- kod `62099966xx02333…` (`isInpostReturnNumber`) to numer zwrotu, którego BL nie zna, więc **nie jest tropem**;
- numer oryginalnej paczki jest małym drukiem pod kwadratowym DataMatrix („Zwrot do nadawcy do paczki: …”);
- po wykryciu takiego kodu skaner przez 3 s wysyła co 500 ms tylko **pasek pod kodem**:
  - geometria względem ramki DataMatrix, gdzie `side = max(szer, wys)`: `x = bbox.x − side`, `y = bbox.y + bbox.height + 0,45·side`, szerokość `2,9·side`, wysokość `0,6·side`;
  - pasek jest powiększony 2× i czytany trybem `strip`;
  - pełna klatka idzie wtedy co 4 s, na wypadek gdyby pasek był w złym miejscu.

**Przewoźnik** (`detectCarrier`) jest rozpoznawany po formacie kodu, **tylko do dziennika**, nie steruje niczym.

### 4.3 Głosowanie z wielu klatek (`TraceBook`)

**Źródło:** `utils/trace-engine.ts`, klasa `TraceBook`, oraz testy `trace-engine.test.ts`.

- Odczyt łączy się z istniejącym tropem tego samego rodzaju, gdy wzorce mają tę samą długość i różnią się o mniej niż limit zależny od długości. Tropy bez wzorca pozycyjnego (imię, telefon z kotwicami) łączą się tylko przy identycznej treści.
- Trop pamięta 15 ostatnich odczytów z wagami źródła:
  - kod kreskowy i wpis ręczny: 10;
  - RapidOCR: 2;
  - tesseract: 1.
- Wynik głosowania liczony jest pozycja po pozycji: większość wygrywa, remis daje alternatywy, brak głosów daje dziurę. Wzorzec z każdą klatką robi się dokładniejszy.
- **Do punktacji idą:**
  - od razu: kody, wpisy ręczne, numery paczek ≥ 12 znaków (długie numery same się weryfikują), imiona i kody pocztowe;
  - po co najmniej 2 głosach: reszta odczytów OCR (krótkie numery, telefony).
- **Brak pętli.** Trop ma stan `reading → checked-none / candidates / hit`. Sprawdzony trop nie jest szukany ponownie, chyba że głosowanie zmieni jego wzorzec: wtedy rośnie wersja, a identyfikator ma postać `t3@2`. Wynik dla starszej wersji jest ignorowany.
- Najwyżej 40 tropów. Usuwane są najpierw te z najmniejszą liczbą głosów i najdawniej widziane; chronione są trafienia i kandydaci.

### 4.4 Punktacja w bitach

**Źródła:** `utils/score.ts`, `score.test.ts`, `server/order-search.service.ts`.

Idea: **waga tropu wynika z tego, ile zamówień odrzuca**. N to liczba zamówień w indeksie.

- Trop pasujący dokładnie do m zamówień daje każdemu z nich `log2(N/m)` bitów. Wspólny prefiks InPost pasuje do tysięcy zamówień, więc sam daje ≈ 0 bitów i nie trzeba go wykluczać ręcznie.
- Przy dopasowaniu przybliżonym każde zamówienie dostaje wagę `w = 2^(−koszt·5)`. Bity to `log2(N·w/Σw) − koszt·1`. Dokładne trafienie wypiera przybliżone.
- Próg „pasuje” to koszt ≤ 1,0. Dla długich numerów (≥ 16 znanych cyfr) surowy limit wynosi 2,0 i jest przeskalowany, żeby np. 2 złe cyfry z 24 nadal pasowały.
- **Z jednego rodzaju tropu liczy się najlepszy** (dwa odczyty numeru paczki to nie dwa dowody).
- Premia +0,5 bitu za datę potwierdzenia sprzed 2–40 dni i +0,5 za status z grupy Wysyłka. Identyfikatory statusów pochodzą z tego konta BL i trzeba je ustawić w konfiguracji. Premię dostaje tylko kandydat z jakimkolwiek tropem.
- **Decyzja:**
  - `auto`, gdy najlepszy ma ≥ `log2(N)` bitów (ok. 13 przy 10 tys.) **i** ≥ 3 bity przewagi nad drugim;
  - `candidates` (maks. 3), gdy najlepszy ma ≥ 40% progu;
  - inaczej `none`.
- Wynik zawiera powody po polsku do pokazania użytkownikowi („numer paczki: 1 cyfra różna”, „telefon 7320___83”, „inicjały m/ka”).
- Wydajność: wzorce kompilowane raz na trop (`compilePattern`), płaskie tablice typowane, bez alokacji w pętli po zamówieniach.

Wszystkie stałe są na górze `score.ts` i `pattern.ts`, do strojenia. Testy pokazują zamierzone zachowanie:
- telefon z 6 znanymi cyframi wygrywa sam;
- same inicjały nie przekraczają progu;
- inicjały razem z cyframi telefonu przekraczają;
- dwóch podobnych kandydatów daje listę zamiast automatu.

### 4.5 Skaner (klient)

**Źródła:**
- `components/scanner.tsx` (pętle i stan, 710 linii: do podziału);
- `scanner.camera.ts`, `scanner.pipeline.ts`, `scanner.worker.ts`, `scanner.gate.ts`;
- `scanner.barcode.ts`, `scanner.barcode-worker.ts`, `scanner.feedback.ts`, `scanner.log.ts`, `scanner.debug.ts`, `keep-screen-on.tsx`.

**Aparat:**
- `getUserMedia` w proporcji 4:3, `width: ideal 1920` (2560 przeciążało telefon), ciągły autofokus, minimalny zoom, latarka, jeśli jest;
- limit 10 s na otwarcie, a spóźniony strumień jest zamykany;
- `video.play()` czeka najwyżej 3 s, bo na Androidzie potrafi nigdy nie odpowiedzieć, choć obraz leci;
- wybór aparatu: na telefonie testowym czytały dobrze tylko aparaty nr 4 i 2. W Linkerze zrób przełącznik z zapamiętanym wyborem (demo zapisuje go w `localStorage`), nie wpisane na sztywno numery.
- **Strażnik** co 2 s: zakończona ścieżka, zatrzymane wideo albo obraz stojący > 5 s powoduje ponowne otwarcie aparatu (bez przeładowania strony) i licznik `cameraRestarts`.
- **Zamykanie:** `track.stop()` **oraz** `video.pause(); video.srcObject = null`. Bez tego Android trzyma aparat i kolejny skan bywa czarny.

**Pętla kodów kreskowych:**
- osobny wątek (`scanner.barcode-worker.ts`), do którego trafia `createImageBitmap(video)` (transfer, nie kopia);
- w wątku natywny `BarcodeDetector`, jeśli obsługuje wszystkie formaty w 2 s, inaczej ponyfill `barcode-detector` (zxing-wasm);
- plik `.wasm` serwowany **z własnego serwera** (`new URL('zxing-wasm/reader/zxing_reader.wasm', import.meta.url)`), nie z CDN;
- formaty: code-128, code-39, data-matrix, qr, aztec;
- przerwa między wywołaniami `max(800 ms, czas detekcji × 3)`, żeby kody zajmowały najwyżej ok. ¼ procesora;
- limity czasu: 15 s na start i 3 s na detekcję; po przekroczeniu wątek jest restartowany;
- czytnik startuje w tle: skaner działa od razu, nawet gdy czytnik nie wstanie (zostaje OCR i „Wpisz”).

**Pętla OCR:**
- co 250 ms, gdy poprzednia odpowiedź już wróciła (nigdy rosnąca kolejka);
- przez pierwsze 1,2 s tylko kody, bo zwykła etykieta może trafić bez OCR;
- pełna klatka najczęściej co 1,5 s;
- przy etykiecie zwrotnej InPost pasek co 0,5 s (sekcja 4.2).
- **Bramka:** w wątku `scanner.worker.ts` miniatura 160 px:
  - ostrość jako wariancja laplasjanu, ≥ 15 i ≥ 50% najlepszej z ostatnich klatek (z zanikiem 0,97 na pomiar);
  - ruch jako średnia różnica jasności ≤ 12;
  - klatka idzie na serwer tylko ostra i nieruchoma, **ale najpóźniej po 2,5 s idzie mimo to** (błąd 6 w sekcji 6).
- Klatka do OCR: `createImageBitmap` z przeskalowaniem do maks. 1280 px (wycinek 2×), JPEG q = 0,75 w wątku, `POST /api/ocr` z nagłówkami `X-Scan-Session` (id skanu) i `X-Ocr-Mode: full | strip`.
- Kody 409 i 503 oznaczają, że serwer jest zajęty albo nowsza klatka czeka: przerwa 1 s. Inne błędy i sieć są liczone w `ocrErrors`.
- Ramki z OCR i kodów są przeliczane z układu klatki na ekran przy `object-fit: cover` (skala i przesunięcie przycięcia) i rysowane jako celownik na podglądzie.

**Szukanie:**
- każda zmiana w `TraceBook` uruchamia `POST /api/search { traces }`;
- najwyżej jedno żądanie naraz, a zmiany w trakcie dają jedno kolejne;
- `auto` oznacza:
  1. dźwięk i wibrację (`scanner.feedback.ts`; audio odblokowane pierwszym dotknięciem);
  2. zamknięcie aparatu;
  3. wpis do dziennika;
  4. `POST /api/returns`;
  5. przejście do ekranu zwrotu **bez przeładowania strony** (błąd 1 w sekcji 6).
- Wszystkie zapytania mają limity czasu: OCR 10 s, szukanie 10 s, zapis 15 s. Zawieszone żądanie nie może na zawsze zablokować pętli.

**Pauza:** przy otwartym panelu „Wpisz” albo schowanej karcie pętle nie analizują klatek.

**Ekran nie gaśnie:** `navigator.wakeLock.request('screen')`, odnawiane przy `visibilitychange`, tylko na telefonie. Zgaszenie ekranu w trakcie skanu przywieszało skaner. Wdrożone 19.11, ale **jeszcze niepotwierdzone na telefonie**.

### 4.6 OCR na serwerze

**Źródła:**
- `ocr-service/server.py`;
- `server/ocr/rapid-engine.ts`, `ocr.service.ts`, `ocr-queue.ts`, `tesseract-engines.ts`;
- `app/api/ocr/route.ts`.

- **RapidOCR** (PaddleOCR przez ONNX, Python 3.12+, `rapidocr`, `opencv`, `numpy`) jako mała usługa HTTP tylko na `127.0.0.1:3200`. Woła ją serwer Next, nigdy telefon.
  - Dwa silniki = dwie klatki naraz, każdy z własną blokadą.
  - Rozgrzewka przy starcie, bo pierwsze wywołanie trwa ok. 1 s.
  - Tryb `full`: wykrywanie linii + obrót + odczyt (0,3–1,4 s na klatkę).
  - Tryb `strip`: sam odczyt paska (ok. 30 ms). Gdy wyjdzie < 8 cyfr, usługa czyta pełnym trybem.
  - Odpowiedź: linie z `text`, `confidence` (0–100) i `bbox` w pikselach klatki.
- **Kolejka** (`ocr-queue.ts`):
  - najwyżej 2 zadania naraz i 4 czekające, ponad to 503 + `Retry-After: 1`;
  - z jednego skanu czeka tylko **najnowsza** klatka, a starsza dostaje 409;
  - klatka porzucona przez telefon (abort) wypada z kolejki.
- **Zapas:** gdy usługa nie odpowiada, przez 15 s działa tesseract.js:
  - pula workerów, `tess-general` na całości (0°, a gdy wynik bezsensowny, 180°);
  - potem `tess-digits` (jedna linia, same cyfry) na wycinkach z długimi ciągami cyfr i na pasie za słowem „Paczki”.
  - Jest dużo gorszy, ale aplikacja działa.
- Silnik jest wymienny za wspólnym kształtem `OcrResponse` (`model/traces.ts`); pole `engine` i źródło tropu idą do dziennika.

### 4.7 Zwrot

**Źródła:** `model/returns.ts`, `server/returns.service.ts`, `app/api/returns/*`, `components/return-editor.tsx`, `components/dashboard.tsx`.

- Rekord: `orderId`, `source`, `createdAt`, `updatedAt`, `note`, `items[]` (`key`, `name`, `ean`, `sku`, `quantityOrdered`, `quantityReceived`).
- **Utworzenie:**
  - produkty z zamówienia, domyślnie `quantityReceived = quantityOrdered`;
  - gdy zwrot dla zamówienia już jest, zwracany jest `duplicate` z istniejącym rekordem, bez drugiego wpisu.
- Edycja: `PATCH { note?, received?: { [itemKey]: number } }`; usuwanie jest możliwe.
- Rodzaj: **Pełny**, gdy wszystkie pozycje mają przyjęte ≥ zamówione, inaczej **Częściowy**.
- Lista dnia: kafelki, kopiowanie ID (po jednym w linii), CSV ze średnikami i BOM (Excel PL).
- Demo trzyma zwroty w `data/returns.json`. W Linkerze to tabela w bazie. Jeśli spisane zwroty z demo mają przejść, zaimportuj ten plik.

### 4.8 Dziennik skanów i diagnostyka

**Źródła:** `model/scan-log.ts`, `server/scan-log.service.ts`, `components/scanner.log.ts`, `app/stats/page.tsx`, `components/scanner.debug.ts`, `app/api/debug-log/route.ts`.

- **Jeden wpis na skan:**
  - czas, wynik (`auto`, `manual-pick`, `manual-entry`, `not-found`, `aborted`), wybrane zamówienie;
  - tropy jako wzorce (bez zdjęć) ze źródłem, głosami i stanem;
  - najlepsi kandydaci z bitami;
  - czasy OCR per silnik;
  - przewoźnicy i etykieta aparatu;
  - diagnostyka: błędy OCR, odrzucenia (409/503), restarty aparatu, wywołania i czasy kodów, czasy zrzutu, ile klatek przeszło bramkę.
- `/stats` pokazuje odsetek automatycznych trafień, czasy i przyczyny porażek. **Przenieś to do Linkera.** Bez tego nie da się stroić progów ani ocenić zmian.
- Dziennik diagnostyczny z telefonu (`debug()` → `/api/debug-log`):
  - kroki startu aparatu, błędy JS i odrzucone obietnice;
  - `pagehide`, `visibilitychange`;
  - **zablokowany główny wątek** (zegar 500 ms spóźniony o > 700 ms).
  - Dzięki niemu znaleźliśmy zawieszenia. W Linkerze może zostać za flagą, wyłączony domyślnie.

---

## 5. Założenia i decyzje (obowiązują dalej)

| Założenie | Dlaczego |
|---|---|
| BaseLinker **tylko `get*`**, jedna wspólna kolejka z pauzą ~650 ms | Limit tokenu to 100 wywołań/min. **W Linkerze moduł musi używać tej samej kolejki co reszta Linkera**; dwie niezależne kolejki przekroczą limit i BL zablokuje token. |
| Token BL tylko po stronie serwera | Telefon nigdy nie łączy się z BL. |
| Szukanie na lokalnym indeksie, nie przez API BL | Szybkość (ms) i limit API. BL na żywo tylko dla pełnego `order_id` / ID zewnętrznego spoza indeksu. |
| Indeks w pamięci procesu | 10–15 tys. zamówień to kilka MB. W Linkerze przy kilku instancjach serwera każda ma swoją kopię, przeładowywaną po synchronizacji (sygnał, wersja w bazie albo TTL). W środowisku bez stałego procesu (serverless) trzeba innego podejścia, np. osobnego procesu skanera. |
| Dopasowanie do skończonego zbioru numerów zamiast generowania wariantów | Porównanie odczytu z ~10 tys. numerów jest szybsze i pewniejsze niż zgadywanie 2^k wariantów 5/6. |
| Punktacja w bitach, progi i przewaga jako stałe | Waga wynika z danych. Stałe stroić na dzienniku, nie na wyczucie. |
| OCR na serwerze (RapidOCR), strumień klatek | Telefon w przeglądarce nie udźwignie dobrego OCR. Wymaga Pythona na serwerze; przy wdrożeniu na hosting sprawdź, czy da się uruchomić usługę (albo osobny mały serwer OCR). |
| Minimum danych osobowych | Indeks trzyma tylko znormalizowane pola potrzebne do dopasowania (telefon, imię, nazwisko, kod, miasto). Widok zamówienia i dziennik bez danych klienta. Nie loguj nazwisk, adresów, telefonów ani tokenu. |
| HTTPS wymagany | Aparat w przeglądarce działa tylko w bezpiecznym kontekście (HTTPS lub localhost). Wake Lock również. |
| Bez AI na tym etapie | Skuteczność wystarcza. AI (np. odczyt zdjęcia przez model) najwyżej jako wyjście awaryjne dla `not-found`, po zmierzeniu. |

---

## 6. Błędy, na które trafiliśmy (przyczyna → naprawa → reguła)

1. **Skaner przestawał reagować po „Skanuj następną”** (najtrudniejszy błąd, kilka dni).
   - Przyczyna: pełne przeładowanie strony (`<a href="/scan">`, `location.reload()`) zaraz po skanie zakleszczało Chrome na Androidzie. Zamykanie starej strony (`LayerTreeHost::~LayerTreeHost > ProxyMain::Stop`) czekało na wątek skanera nowej strony, a ten na nią. Przyciski były martwe. Przeładowanie dodano wcześniej jako obejście „na świeży start”, a samo okazało się przyczyną.
   - Naprawa: wszystkie przejścia do skanera przez `next/link` i `router.push`, w tym link w nagłówku; „Spróbuj ponownie” restartuje aparat bez przeładowania.
   - **Reguła:** w przepływie skanowania nigdy pełnego przeładowania strony.
2. **Martwe przyciski przez ciężką pracę na głównym wątku.**
   - Przyczyna: zxing-wasm liczył 1–3 s na klatkę na głównym wątku; kodowanie JPEG i bramka też blokowały stronę.
   - Naprawa: dwa wątki robocze (kody; bramka + JPEG), na głównym wątku tylko asynchroniczny `createImageBitmap`.
   - **Reguła:** cała analiza obrazu w wątkach roboczych, każde wywołanie wątku z limitem czasu i restartem.
3. **Zawieszanie na pobieraniu z internetu.**
   - Przyczyna: WASM czytnika kodów i dane tesseract z CDN (jsDelivr) spowalniały lub blokowały start; natywne `getSupportedFormats()` czasem nie odpowiadało.
   - Naprawa: WASM z własnego serwera (`/_next/static/media/`, bez autoryzacji, `application/wasm`), `tessdata/` lokalnie, limit 2 s na `getSupportedFormats`.
   - **Reguła:** nic z zewnętrznych CDN w trakcie skanu, wszystko z własnego serwera.
4. **Natywne API przeglądarki potrafią nie odpowiedzieć nigdy** (`getUserMedia`, `video.play()`, `getSupportedFormats()`).
   - Naprawa: każde czekanie ma limit czasu i ścieżkę „Spróbuj ponownie”; strażnik aparatu.
5. **Czarny podgląd przy kolejnym skanie.**
   - Przyczyna: Android Chrome trzyma aparat, dopóki `<video>` wskazuje na strumień.
   - Naprawa: `track.stop()` + `video.pause()` + `video.srcObject = null` przy zamykaniu.
6. **Bramka klatek za ostra.**
   - Objaw: w jednym skanie odrzuciła 145 ze 146 klatek i skan trwał 82 s.
   - Naprawa: próg ostrości względny (do najlepszej z ostatnich klatek) i wysyłka mimo bramki po 2,5 s.
   - **Reguła:** lepiej czytać częściej i ufać głosowaniu niż filtrować agresywnie.
7. **Błędy znikały ze statystyk.**
   - Przyczyna: odpowiedzi 500 z `/api/ocr` nie były nigdzie liczone.
   - Naprawa: każdy błąd sieci, OCR i aparatu trafia do dziennika skanu.
8. **Przeciążenie serwera klatkami.**
   - Przyczyna: przy wolnym OCR klatki się kolejkowały i odpowiedzi przychodziły dla nieaktualnych obrazów.
   - Naprawa: klient wysyła następną klatkę dopiero po odpowiedzi; serwer trzyma najwyżej jedną czekającą klatkę na skan (409), a przy przepełnieniu odpowiada 503 i klient robi przerwę.
9. **Rozdzielczość.** 2560 px z aparatu przeciążało telefon. 1920 px z aparatu i 1280 px do OCR wystarczają.
10. **Tesseract a długie numery i obrót.**
    - Tesseract urywał 24-cyfrowe numery po kilku cyfrach („Paczki: 620”) i źle czytał tekst do góry nogami. Cyfry 0/6/8/9 odwrócone też są cyframi, więc „są cyfry” nie oznacza, że orientacja jest dobra.
    - Naprawa w zapasie: pewność + słowo „Paczki” jako test orientacji, pas za słowem-kotwicą czytany jako jedna linia. Docelowo RapidOCR.
11. **RapidOCR pamięta flagi z poprzedniego wywołania.** Po `use_det=False` (tryb `strip`) pełna klatka wracała pusta. Naprawa: przy każdym wywołaniu podawać jawnie `use_det`, `use_cls`, `use_rec`.
12. **Kod kreskowy na zwrocie wskazuje numer przewoźnika** (InPost zwrot). Naprawa: taki kod nie jest tropem, ale wyzwala czytanie paska pod DataMatrix.
13. **Dane sklepu wygrywały punktację** (adres nadawcy, telefon sklepu). Naprawa: wykluczenia z sekcji 4.2.
14. **`getOrders` daje tylko ostatni numer paczki.** Naprawa: `getOrderPackages` w tle i ponowne sprawdzanie świeżych zamówień bez paczki.
15. **Stronicowanie `getOrders`.** Synchronizacja musi iść po `date_confirmed_from` z deduplikacją po `order_id` i zakładką 3 dni, nie po `id_from`. Inaczej gubi zamówienia potwierdzone później niż dodane.
16. **ID zewnętrzne Allegro.** Na etykiecie bywa 32 hex bez myślników, a `filter_external_order_id` wymaga UUID z myślnikami, małymi literami (`toApiExternalId`).
17. **Zgaszony ekran przywieszał skaner.** Naprawa: Screen Wake Lock (sekcja 4.5); do potwierdzenia na telefonie.
18. **Czarny ekran po przebudowie** (demo, lokalny serwer). Stary proces serwera dalej trzymał port i serwował HTML z nowego builda bez istniejących skryptów (404 na chunkach), więc strona się nie uruchamiała. W Linkerze dotyczy to wdrożenia: stary proces musi być zatrzymany przed startem nowego; klient ze starą wersją strony po wdrożeniu powinien przejść na nową (np. przez nawigację, a nie zostać na martwych chunkach).

---

## 7. Proponowany podział w Linkerze (lekko lepsze nazwy)

Tylko propozycja: dopasuj do konwencji Linkera. Ważne jest rozdzielenie odpowiedzialności, nie nazwy.

| Demo | Odpowiedzialność | Propozycja w Linkerze |
|---|---|---|
| `model/traces.ts` | kontrakt tropów, wzorców, OCR, wyniku | `returns/matching/types.ts` |
| `utils/pattern.ts` | wzorce, koszty, wykluczenia | `returns/matching/pattern.ts` + `shop-exclusions` z konfiguracji |
| `utils/trace-engine.ts` (klasyfikacja) | odczyt → trop | `returns/matching/read-classifier.ts` |
| `utils/trace-engine.ts` (`TraceBook`) | głosowanie, stany tropów | `returns/matching/trace-collector.ts` |
| `utils/score.ts` | punktacja w bitach, decyzja | `returns/matching/order-scorer.ts` |
| `server/order-search.service.ts` | punktacja + BL na żywo | `returns/server/order-matcher.service.ts` |
| `server/order-db.ts`, `order-index-sync.service.ts`, `search-index.ts` | indeks zamówień, synchronizacja, kopia w RAM | `orders-index/` (repozytorium w bazie Linkera, zadanie synchronizacji w cronie, cache w pamięci) |
| `server/baselinker.client.ts` | klient BL | **istniejący klient Linkera** (jedna kolejka) |
| `server/ocr/*`, `ocr-service/` | OCR | `returns/server/sources/` (`*-ocr.source.ts`, `ocr.config.ts`) + `returns/server/services/` (`ocr.service.ts`, `ocr-queue.ts`) + usługa `ocr-service` |
| `server/returns.service.ts` | zwroty | `returns/server/returns.service.ts` na bazie Linkera |
| `server/scan-log.service.ts`, `model/scan-log.ts` | dziennik skanów, statystyki | `returns/server/scan-log.service.ts` (tabela) |
| `components/scanner.tsx` (710 linii) | wszystko naraz | rozbić na hooki: `useCamera` (otwieranie, strażnik, latarka, wybór obiektywu), `useBarcodeLoop`, `useOcrLoop` (plan, bramka, wysyłka), `useTraceSearch` (TraceBook + `/api/search` + decyzja) oraz komponent widoku |
| `scanner.pipeline.ts` + `scanner.worker.ts` | zrzut klatki, bramka, JPEG w wątku | `returns/scanner/frame-pipeline.ts` + `frame.worker.ts` |
| `scanner.barcode.ts` + `scanner.barcode-worker.ts` | kody w wątku | `returns/scanner/barcode-reader.ts` + `barcode.worker.ts` |
| `keep-screen-on.tsx` | Wake Lock | hook `useWakeLock` na ekranie skanera |

---

## 8. Kolejność odtworzenia i „gotowe”

1. **Indeks zamówień** w bazie Linkera + synchronizacja (sekcja 4.1) na istniejącym kliencie BL. Sprawdź:
   - liczba zamówień zgadza się z rzędem wielkości (ok. 218 dziennie);
   - ponowna synchronizacja nie tworzy duplikatów;
   - paczki dociągają się w tle.
2. **Czysta logika** z testami: wzorce, klasyfikacja, głosowanie, punktacja. Przenieś testy z `utils/*.test.ts` i fixture z `fixtures.test-helper.ts`; muszą przejść bez zmian w oczekiwaniach.
3. **`/api/search`** (punktacja na indeksie w pamięci + BL na żywo).
4. **OCR:** usługa RapidOCR + endpoint z kolejką, tesseract jako zapas.
5. **Zwroty:** model, zapis, edycja, lista dnia, CSV.
6. **Skaner:** aparat, wątki, pętle, przejście do zwrotu bez przeładowania, Wake Lock.
7. **Dziennik skanów i statystyki.** Diagnostyka z telefonu za flagą.

**Gotowe =**
- 10 skanów pod rząd przez „Skanuj następną” bez zawieszenia i bez przeładowania strony;
- zwykła etykieta i etykieta zwrotna InPost (numer spod DataMatrix) trafiają automatycznie;
- zamaskowany telefon z inicjałami daje trafienie albo listę kandydatów;
- skuteczność z dziennika nie gorsza niż w demo: ≥ 90% `auto`, mediana ≤ 12 s;
- testy logiki przechodzą;
- moduł nie wywołuje żadnej metody BL poza `get*` i korzysta ze wspólnej kolejki Linkera.

---

## 9. Referencje (pliki demo do przeczytania)

Ścieżki względem `E:\projekty\demozwroty`. Czytaj jako źródło zachowania i stałych; pisz od nowa.

**Dokumenty**
- `plan-poprawek-zwroty-demo.md`: pierwotne założenia v2 (wzorce, bity, głosowanie, OCR na serwerze).
- `docs/REACT_NATIVE_PLAN.md`: wersja natywna do porównania, sekcja 5 to te same wnioski z perspektywy RN.
- `README.md`: opis v1 (częściowo nieaktualny: JSON i 14 dni zostały zastąpione przez SQLite i 45 dni).

**Logika (najważniejsze, czyste funkcje)**
- `src/features/returns/model/traces.ts`
- `src/features/returns/utils/pattern.ts` + `pattern.test.ts`
- `src/features/returns/utils/trace-engine.ts` + `trace-engine.test.ts`
- `src/features/returns/utils/score.ts` + `score.test.ts`
- `src/features/returns/utils/normalize.ts`
- `src/features/returns/utils/fixtures.test-helper.ts`

**Serwer**
- `src/features/returns/server/baselinker.client.ts`, `baselinker.schemas.ts`
- `src/features/returns/server/order-db.ts`, `order-index-sync.service.ts`, `search-index.ts`
- `src/features/returns/server/order-search.service.ts`, `orders.service.ts`
- `src/features/returns/server/returns.service.ts`, `model/returns.ts`
- `src/features/returns/server/scan-log.service.ts`, `model/scan-log.ts`
- `src/features/returns/server/sources/` (`rapid-ocr.source.ts`, `tesseract-ocr.source.ts`, `ocr.config.ts`)
- `src/features/returns/server/services/` (`ocr.service.ts`, `ocr-queue.ts`)
- `ocr-service/server.py`, `ocr-service/requirements.txt`
- `src/app/api/` (kontrakty endpointów: `search`, `ocr`, `returns`, `order`, `sync`, `packages`, `scan-log`, `debug-log`)
- `src/instrumentation.ts` (start auto-sync i rozgrzewka OCR)

**Klient**
- `src/features/returns/components/scanner.tsx` (pętle, stałe czasowe na górze pliku)
- `src/features/returns/components/scanner.camera.ts`, `scanner.pipeline.ts`, `scanner.worker.ts`, `scanner.gate.ts`
- `src/features/returns/components/scanner.barcode.ts`, `scanner.barcode-worker.ts`
- `src/features/returns/components/scanner.feedback.ts`, `scanner.log.ts`, `scanner.debug.ts`
- `src/features/returns/components/keep-screen-on.tsx`
- `src/features/returns/components/return-editor.tsx`, `dashboard.tsx` (tylko zachowanie: liczniki, duplikat, CSV)
- `src/app/stats/page.tsx` (jakie liczby pokazywać)

**Nie przenoś:**
- `src/proxy.ts` (Basic Auth), `server.mjs`, `scripts/make-cert.mjs`, `start-zwroty*.cmd`: prowizorka demo (logowanie, HTTPS w LAN, uruchamianie);
- danych z `data/`: `zwroty.db` i `scan-log.jsonl` zawierają dane klientów. Wyjątkiem jest ewentualny import `returns.json`.
