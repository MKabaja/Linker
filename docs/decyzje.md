# Linker — decyzje i świadome pominięcia

> Krótki rejestr zamiast osobnych plików ADR. Dopisujemy tylko to, czego nie widać w kodzie ani w planie.
> Priorytet od 2026-11-02: funkcjonalność aplikacji. Poprawki i dopieszczanie dopiero po MVP.

## Decyzje

| Data | Decyzja | Dlaczego | Kiedy wrócić |
|---|---|---|---|
| 2026-11-02 | Cache Primavery zachowuje przedział 1–5 min: po powrocie na kartę użytkownik dostaje od razu starsze dane, a świeże pobierają się w tle. | Natychmiastowa odpowiedź jest ważniejsza niż różnica kilku minut w cenniku. | Gdy ilości muszą być aktualne co do minuty. |
| 2026-11-02 | Stan zwinięcia sidebara nie jest zapamiętywany. Usunięty zapis cookie, którego nikt nie czytał. | Zapis nic nie dawał, a `cookieStore` działa tylko w bezpiecznym kontekście (HTTPS lub localhost). | Gdy użytkownicy zaczną tego potrzebować. Odczyt cookie w głównym layoucie uczyni wszystkie strony dynamicznymi. |
| 2026-11-02 | `ProductsAutoRefresh` zostaje w `features/products`, choć nie wie nic o produktach. | Jest tylko jedno użycie (YAGNI). | Przy drugim użyciu (Faza 3, zamówienia): ogólna nazwa i przeniesienie do `shared/components`. |
| 2026-11-02 | Importy są grupowane w `biome.json`: Node, pakiety, komponenty, hooki, aliasy, ścieżki względne. | Biome nie ma sortowania po długości ścieżki, grupy dają czytelny układ. | — |
| 2026-11-02 | Miniatury ładujemy bezpośrednio z `orders.pvex.pl/thumbs/<EAN>.jpg`, bez logowania i bez optymalizacji `next/image`. | Pliki 50×50 px mają ok. 1 KB. Eksporty cennika nie mają zdjęć, a logowania z captchą nie obchodzimy. | Adres jest nieudokumentowany, więc tabela musi działać bez zdjęć. Przed publicznym demo zapytać Primaverę o zgodę albo użyć zdjęć zastępczych. |
| 2026-11-15 | Cała infrastruktura bazy (klient, schematy tabel, migracje, konfiguracja drizzle-kit) leży w `src/database/`, nie w `features/` ani `shared/lib/`. | Jedna baza, tabele łączą się kluczami obcymi między feature'ami (Faza 3 sięgnie po indeks zamówień), jeden folder migracji, jedno miejsce na „co jest w bazie”. | Gdy pojawi się feature z własną, odrębną bazą. |
| 2026-11-25 | Logowanie na własnych sesjach w bazie (`sessions` z hashem SHA-256 tokenu), bez JWT i bez Better Auth. | JWT nie da się unieważnić (wylogowanie, zmiana roli i blokada konta działają dopiero po wygaśnięciu). Better Auth ma dużo nieużywanych funkcji i własne tabele. | Gdy dojdzie logowanie zewnętrzne (OAuth, SSO). |
| 2026-11-25 | Hasła hashuje `@node-rs/argon2` (Argon2id), nie ręczny `scrypt`. | Biblioteka sama robi sól, format hasha i porównanie w stałym czasie. | — |
| 2026-11-25 | Sesja trwa 30 dni i przedłuża się przy używaniu (baza: gdy zostało mniej niż 15 dni; ciasteczko: proxy odnawia je przy każdym GET). | Telefon na magazynie nie powinien co chwilę prosić o hasło. Sesję i tak można unieważnić usunięciem wiersza. | Gdy pojawią się wymagania bezpieczeństwa klienta (krótsza sesja, wylogowanie po bezczynności). |
| 2026-11-25 | Konta dezaktywujemy (`deactivatedAt`), nie usuwamy. | Konto zostaje w historii zwrotów. Dezaktywacja usuwa sesję przy następnym żądaniu i blokuje logowanie. | Przy ekranie zarządzania użytkownikami. |
| 2026-11-25 | Ciasteczko sesji ma `Secure`. | Tunel i Hetzner działają przez HTTPS, a przeglądarki akceptują `Secure` na `localhost`. `next start` pod adresem IP przez HTTP nie zaloguje. | — |
| 2026-11-25 | Brak rejestracji. Konta zakłada `npm run user:create`. | Aplikacja wewnętrzna, kilka kont. | Przy ekranie zarządzania użytkownikami. |
| 2026-11-25 | Limit prób: 10 złych haseł dla e-maila → 15 min blokady (kolumny `failedLoginCount`, `lockedUntil` w `users`, bez osobnej tabeli). W czasie blokady nawet dobre hasło jest odrzucane. Próba jest rezerwowana atomowym `UPDATE` przed sprawdzeniem hasła (równoległe żądania nie przekroczą limitu). Zablokowane konto dostaje ten sam wynik i komunikat co złe hasło („Nieprawidłowy e-mail lub hasło.”) oraz liczoną atrapę argon2, więc blokada nie zdradza istnienia konta. | Najprostszy wariant: licznik i blokada w `users`, bez osobnej tabeli. Odpowiedź bez rozróżnienia blokady zamyka enumerację kont. | Gdy blokowanie kont przez złośliwe próby stanie się problemem. |
| 2026-11-26 | Limit logowań na IP: 20 prób na 15 min (okno stałe) w pamięci procesu, liczony w akcji `logIn` przed argon2. Po przekroczeniu ten sam komunikat co przy złym haśle. IP z `x-forwarded-for` (pierwszy adres), a gdy go brak z `x-real-ip`. | Limit na e-mail nie łapie zgadywania po wielu kontach ani prób na nieistniejące e-maile. Zero nowych zależności i tabel. | Ochrona tylko dla jednej instancji (stan znika po restarcie, nie jest współdzielony). Za reverse proxy trzeba zaufać nagłówkowi, więc proxy musi go nadpisywać (inaczej klient poda dowolny IP). Przy kilku instancjach: Redis albo tabela w bazie. |
| 2026-11-25 | Wyszukiwanie zamówień dla skanera to Route Handler `POST /api/returns/search`, wyjątek od reguły „bez własnych Route Handlerów dla stron”. | Skaner woła go z pętli równolegle z OCR i musi móc przerwać nieaktualne żądanie (`AbortController`). Server Actions idą po kolei i nie dają się przerwać. Brak sesji daje 401 zamiast przekierowania. | Gdy Server Actions dostaną równoległość i przerywanie. |
| 2026-11-25 | Indeks zamówień do wyszukiwania jest w pamięci procesu, przeładowywany po synchronizacji i co 2 min (TTL). Kolejka BaseLinkera, cache statusów i blokady synchronizacji też są w procesie (`getProcessSingleton`). | 10–15 tys. zamówień to kilka MB, punktacja trwa milisekundy. TTL łapie zmiany z innego procesu (skrypt seed, druga instancja). | Przy kilku instancjach serwera albo hostingu bez stałego procesu: wspólna kolejka i sygnał przeładowania (np. wersja w `sync_state`). |
| 2026-11-25 | Eksport CSV zwrotów przez `GET /api/returns/export?date=` (Route Handler), nie Server Action. | Plik pobiera zwykły link z `download`, bez JavaScriptu i bez składania `Blob` w przeglądarce; Server Action zwraca dane do komponentu, a nie odpowiedź z nagłówkiem `Content-Disposition`. | — |
| 2026-11-25 | OCR klatek skanera robi osobna usługa Pythona (RapidOCR, `ocr-service/`) tylko na `127.0.0.1:3201` (`OCR_SERVICE_URL`). Woła ją serwer Next, nigdy telefon. Gdy nie odpowiada, przez 15 s czyta tesseract.js z danymi `eng` z paczki `@tesseract.js-data/eng` (bez CDN). | Telefon w przeglądarce nie udźwignie dobrego OCR, a RapidOCR dużo lepiej czyta długie numery niż tesseract. Port 3200 zajmuje demo. | Przy wdrożeniu: czy hosting uruchomi Pythona (albo osobny mały serwer OCR). |
| 2026-11-25 | OCR ma Route Handler (`POST /api/returns/ocr`), nie Server Action. | Skaner wysyła binarne klatki JPEG w pętli, równolegle i z możliwością przerwania (`AbortController` → wypada z kolejki). Server Actions idą sekwencyjnie i nie przyjmują surowego body. | — |
| 2026-11-25 | tesseract.js działa w bundlu Next bez `serverExternalPackages`: `workerPath` i `langPath` są podane jawnie od `process.cwd()`. | Domyślna ścieżka workera liczona od `__dirname` wskazuje po bundlowaniu na `/ROOT/node_modules/...`. | Gdy aplikacja nie startuje z katalogu projektu (np. build `standalone`): wtedy `serverExternalPackages: ['tesseract.js']`. |
| 2026-11-02 | `motion` zostaje w zależnościach, choć nic go jeszcze nie importuje. | Będzie używany w kolejnych widokach. | Przy porządkach po MVP, jeśli nadal nie będzie używany. |

## Pominięte do czasu MVP

| Co | Skutek | Uwagi |
|---|---|---|
| „Dane nieaktualne” przy awarii Primavery (zadanie 8) | Przy awarii, gdy dane w cache wygasły, widać błąd zamiast starszych danych. | Wariant wyniku `ok \| stale \| error`. |
| „Dane z godz. HH:MM” nad tabelą (zadanie 8) | Użytkownik nie widzi wieku danych. | Strefa `Europe/Warsaw`. |
| Podatności z `npm audit` | Po aktualizacji Next.js do 16.4.3: 13 zgłoszeń, 0 krytycznych, 7 wysokich. | Stan z 2026-11-02. Podatny `zod` 3.25.76 należy do `shadcn`, aplikacja używa 4.6.7. |
| `.env.example` | Nowa osoba nie widzi, jakie zmienne są potrzebne (`BASELINKER_TOKEN`, `PRIMAVERA_TOKEN`). | `.gitignore` już dopuszcza ten plik. |
| README i pliki SVG z generatora | Domyślny README, nieużywane pliki w `public/`. | README jest w Fazie 5. |
| Typy domenowe bez prefiksu `Primavera` | Nazwy zdradzają źródło danych. | Refaktor. |
| Przeniesienie `app-sidebar` do `features/navigation` | Nazwa nie mówi o roli folderu. | Refaktor. |
