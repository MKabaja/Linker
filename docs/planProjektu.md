# Linker — luźny plan prac (do zmiany w trakcie)

> To szkic kierunku, a nie umowa. Kolejność i zakres można zmieniać, gdy dowiemy się czegoś nowego.
> Zasada robocza: najpierw działa (widać wynik na ekranie), potem porządkujemy i dopisujemy testy.
> Fakty o systemach (BaseLinker, Primavera, WAPRO) są w `kontekstProjektu.md`.

## Zasady, których się trzymamy

- **Logika w `lib/`, nie w komponentach ani w `route.ts`.** Parsowanie CSV, agregacja po EAN-ie, budowanie list to zwykłe funkcje. Dzięki temu testy dopiszemy później bez przepisywania.
- **Strony pobierają dane same** (Server Components wołają funkcje z `lib/`). Route Handler tylko tam, gdzie przeglądarka ma pobrać plik (eksport CSV).
- **Tokeny wyłącznie po stronie serwera** (`.env.local`, w `.gitignore`).
- **Aplikacja tylko czyta.** Nic nie zapisuje do BaseLinkera, Primavery ani WAPRO i nie zmienia statusów zamówień.
- Łączenie danych **tylko po EAN-ie**, nigdy po nazwie.

---

## Faza 0 — sprawy poza kodem (równolegle, od razu)

- [ ] Wysłać pytania do administratora (login SQL tylko do odczytu, `xcom_app`, WebAPI Wapro, magazyn realizacji) — odpowiedź zajmie najdłużej.
- [ ] Zanonimizowana próbka zamówień (same pozycje: `ean`, `name`, `quantity`, `sku`, `bundle_id`) — przyda się do demo i do sprawdzania przypadków brzegowych.

## Faza 1 — szkielet i nawigacja

Cel: aplikacja się uruchamia, da się klikać między widokami.

- [x] Layout z nawigacją: sidebar po lewej (zwijany do ikon, wersja mobilna jako wysuwany panel), podświetlenie aktywnej zakładki przez `usePathname`.
- [x] Strony: `/orders`, `/products`, `/shopping-list` (oraz `/settings`); `/` tymczasowo przekierowuje na `/orders`.
- [x] Puste widoki z nagłówkiem i miejscem na tabelę.

**Gotowe, gdy:** nawigacja działa, każda strona się renderuje.

## Faza 2 — produkty z Primavery

Cel: widok `/products` pokazuje cennik hurtowni ze świeżymi stanami.

**Ustalenia:**

- Zostajemy przy CSV. Bez bazy danych, bez TanStack Query, bez `nuqs` (nie dają tu realnego zysku).
- Jedyna nowa biblioteka: `papaparse` (czytanie CSV).
- Dane trzymamy w pamięci serwera. Gdy są starsze niż 1–2 minuty, pokazujemy stare i w tle pobieramy nowe. Nowe dane zastępują stare w całości.
- Wyszukiwanie i stronicowanie działają na serwerze. Wpisane hasło i numer strony są w adresie URL.
- Bez wirtualizacji i bez dodatkowych optymalizacji, dopóki nie pojawi się realny problem.

Struktura:

```text
src/features/products/
        components/
        constants/csv.constants.ts
        lib/csv-parser.ts
        lib/normalize-search-text.ts
        lib/fetch-primavera-csv.ts
        lib/primavera-products-cache.ts
        lib/get-primavera-products.ts
        lib/search-primavera-products.ts
        products.types.ts
        index.ts
```

**Szacowany czas całego brancha:** 8–10 godzin pracy.

### Zadania

**1. [x] Nowy branch** (ok. 5 min)
Zakładasz osobną gałąź na całą fazę.

```bash
git switch -c feat/products-view
```

**2. [x] Instalacja `papaparse`** (ok. 15 min)
Biblioteka, która czyta plik CSV za nas (cudzysłowy, średniki, nagłówki).

```bash
npm install papaparse
```

```bash
npm install -D @types/papaparse
```

Commit: `build(deps): add papaparse for reading PVEX CSV`

**3. [x] Typ produktu i czytanie CSV** (ok. 1,5 h)

- Typy `PrimaveraProduct` i `PrimaveraCsvRow` (typ wiersza wyprowadzony ze stałej z nagłówkami).
- Funkcja `parsePrimaveraCsv` zamienia tekst CSV na listę produktów.
- Do każdego produktu zapisujemy `searchableName`: małe litery, bez polskich znaków i znaków specjalnych, z jednostką sklejoną z liczbą (`100 ml` → `100ml`).
- Gdy nagłówek pliku się zmieni lub plik ma błąd strukturalny, funkcja rzuca czytelny błąd. Wadliwe wiersze są pomijane z ostrzeżeniem w logu.
- Porządki w strukturze: feature `products` z podziałem na `lib` i `constants`, nazwy bez `pvex`, token `PRIMAVERA_TOKEN`, plik roboczy `data/primavera.csv`.

Commity: typ, stałe i walidacja nagłówka, pomijanie wadliwych wierszy, refaktor nazw i struktury, normalizacja `searchableName`.

**4. [ ] Pobieranie z Primavery i pamięć podręczna** (ok. 1,5 h)

- Funkcja `getPrimaveraProducts()` pobiera plik z Primavery.
- Dane do 1–2 minut są zwracane z pamięci.
- Starsze dane są zwracane od razu, a nowe pobierają się w tle.
- Kilka jednoczesnych zapytań korzysta z jednego pobierania.
- Zapisujemy też godzinę ostatniego pobrania.

Commit: `feat(products): fetch Primavera products with in-memory cache`

**5. [ ] Wyszukiwanie** (ok. 1 h)

- Same cyfry w polu: szukamy po EAN.
- Tekst: produkt musi zawierać wszystkie wpisane słowa, bez względu na wielkość liter i polskie znaki.
- Funkcja zwraca też łączną liczbę wyników.

Commit: `feat(products): add search by EAN and name`

**6. [ ] Tabela produktów** (ok. 1,5 h)

- Strona `/products` pobiera dane na serwerze i pokazuje jedną stronę (np. 50 wierszy).
- Kolumny: EAN, nazwa, cena, ilość, VAT.
- Tabela korzysta z TanStack Table.
- Przyciski „poprzednia / następna strona”.

Commit: `feat(products): show products table with pagination`

**6a. [ ] Refaktor `features/products` do warstw z `docs/ARCHITECTURE.md`** (ok. 2 h)

Czysty refaktor: przenosimy, scalamy, zmieniamy nazwy i poprawiamy importy. Bez zmian zachowania i UI.

| Obecnie                                           | Docelowo                                                  |
| ------------------------------------------------- | --------------------------------------------------------- |
| `products.types.ts`, `products.schemas.ts`        | `model/`                                                  |
| `PRODUCTS_PAGE_SIZE`                              | `model/products.constants.ts`                             |
| `constants/primavera.constants.ts`                | `server/sources/primavera.config.ts`                      |
| `lib/fetch-primavera-csv.ts`                      | `server/sources/primavera-csv.source.ts`                  |
| `lib/csv-parser.ts`                               | `server/mappers/primavera-csv.mapper.ts`                  |
| `lib/get-primavera-products.ts`                   | `server/repositories/products.repository.ts`              |
| `lib/primavera-products-cache.ts`                 | `server/repositories/products.cache.ts`                   |
| `lib/search-…`, `lib/get-primavera-products-page` | `server/services/products.service.ts` (scalone)           |
| `lib/paginate-products.ts`                        | `src/shared/lib/paginate.ts` (`paginate<T>`)              |
| `lib/normalize-search-text.ts`, `lib/format-price.ts` | `utils/`                                              |
| `index.ts`                                        | usunięty, importy bezpośrednie                            |

- Pliki przenosimy przez `git mv`, scalanie w osobnym kroku.
- `import 'server-only'` w każdym pliku `server/` (nowa zależność `server-only`).
- Typ wyniku strony produktów jako płaskie warianty unii, żeby podpowiedź w edytorze pokazywała pola.
- Na koniec reguły architektury w `biome.json` (A9).
- Ręcznie: `/products` działa jak przed refaktorem.

Commity: zależność, przenosiny per warstwa, scalenie serwisu, usunięcie barrela, reguły Biome.

**7. [ ] Pole wyszukiwania** (ok. 1 h)

- Pole nad tabelą, odczekuje chwilę po wpisaniu (ok. 300 ms).
- Wpisane hasło i strona zapisują się w adresie URL, więc działa odświeżenie i przycisk „wstecz”.
- Nowe hasło wraca na pierwszą stronę.
- Logika w osobnym hooku.

Commit: `feat(products): add search field synced with URL`

**8. [ ] Błędy i nieaktualne dane** (ok. 1 h)

- Zły token, pusta odpowiedź lub zmieniony format: czytelny komunikat zamiast pustej strony.
- Gdy Primavera nie odpowiada, a mamy starsze dane, pokazujemy je z dopiskiem „dane nieaktualne”.
- Nad tabelą pokazujemy „Dane z godz. HH:MM”.

Commit: `feat(products): show errors and data freshness`

**9. [ ] Odświeżanie po powrocie na kartę** (ok. 45 min)

- Gdy wracasz do karty z aplikacją, strona sama pobiera świeże dane.
- Logika w osobnym hooku.
- Bez przycisku „odśwież” jako głównego mechanizmu.

Commit: `feat(products): refresh data when browser tab becomes active`

**10. [ ] Porządki i sprawdzenie** (ok. 45 min)

- Usuwamy prototyp `src/app/api/primavera/route.ts` i niepotrzebny `src/app/dashboard/page.tsx`, jeśli się zgadzasz.
- Uruchamiamy `npm run lint:fix`, `npm run typecheck` i `next build`.
- Ręcznie sprawdzamy: wpisanie EAN-u, wpisanie fragmentu nazwy, zły token.

Commit: `chore(products): remove Primavera prototype route`

**11. [ ] Pull request** (ok. 15 min)
Na Twoją prośbę podaję tytuł i treść PR po angielsku. PR tworzysz sam na GitHubie.

**Gotowe, gdy:** wpisujesz EAN lub fragment nazwy i od razu widzisz ilość w Primaverze. Dane odświeżają się same.

## Faza 3 — zamówienia z BaseLinkera

Cel: widok `/orders` pokazuje zamówienia z dwóch statusów i dostępność ich pozycji w Primaverze.

- [ ] Funkcja `getOrdersByStatus(statusId)` (metoda `getOrders`, statusy 327888 i 332592; błędy wracają z HTTP 200 — sprawdzać `status`).
- [ ] Przy odpowiedzi ograniczać dane do tego, co potrzebne (pozycje, numer zamówienia, status, `extra_field_1`); **dane osobowe klientów nie trafiają do widoków ani logów**.
- [ ] Tabela zamówień z pozycjami i znacznikiem „jest / nie ma w Primaverze" (po EAN).
- [ ] Zdecydować, co robić z zestawami (`ZESTAWx4x<EAN>`, `bundle_id`) po obejrzeniu prawdziwych danych.
- [ ] Przy 100 lub więcej zamówieniach: paginacja po `date_confirmed_from`.

**Gotowe, gdy:** widzisz bieżące zamówienia z braków i wiesz, co z nich da się zamówić w Primaverze.

## Faza 4 — listy zakupowe i eksport (sedno aplikacji)

Cel: zastąpić ręczne przepisywanie.

- [ ] Agregacja pozycji po EAN-ie (suma ilości; sprawdzenie w Primaverze).
- [ ] Lista „zamów w Primaverze" → eksport CSV `ean;ilość` do importu w portalu (jeden mały plik testowy najpierw, żeby sprawdzić, czy Primavera chce nagłówek).
- [ ] Lista „brak w Primaverze" → format do wklejenia w arkusz sklepów (EAN, nazwa, ilość, numer zamówienia).
- [ ] Lista „nowe artykuły do założenia" dla `BladPowiazaniaTowaru` (EAN, nazwa, cena z Primavery lub z zamówienia).
- [ ] Route Handler eksportu (`/api/shopping-list/export` i analogiczne).

**Gotowe, gdy:** pobierasz plik, wgrywasz go do Primavery i zamówienie przechodzi.
**Uwaga:** dla `BrakStanuTowaru` lista bez stanów WAPRO jest górnym szacunkiem (zawiera także pozycje, które są na magazynie).

## Faza 5 — porządki i tryb demo

- [ ] Wspólny podział na źródła danych (live / demo) i przełącznik `DATA_SOURCE`.
- [ ] Zanonimizowane dane w `data/demo/` (ceny i ilości zmienione, bez danych klientów).
- [ ] README: problem, jak działa proces, zrzuty ekranu, uruchomienie w trybie demo.
- [ ] Stany ładowania, puste stany, obsługa błędów w UI.
- [ ] Wdrożenie wersji demo.

## Faza 6 — testy (dopiero tu)

- [ ] Parser CSV (cudzysłowy, puste wartości, EAN 8-cyfrowe, duplikaty).
- [ ] Agregacja po EAN-ie i budowanie list (w tym zestawy).
- [ ] Ewentualnie test kontraktu odpowiedzi BaseLinkera na zapisanych próbkach.

## Faza 7 — stany z WAPRO (zależy od administratora)

Zaczynamy dopiero po dostaniu loginu tylko do odczytu.

- [ ] Sprawdzić widok `LX_STAN_MAGAZYNU_R` (ma kod kreskowy i stan) oraz `iWP_VV_WFMAG_StanZamowienIRezerwacji`.
- [ ] Przetestować w konsoli SQL regułę „brak = stan mniejszy niż potrzeba" na zamówieniach z `BrakStanuTowaru`.
- [ ] Uzupełnić listy zakupowe o prawdziwą ilość do zamówienia (zamówiono minus dostępne).
- [ ] Odczyt WAPRO działa tylko w sieci firmowej; demo nie może od niego zależeć.

## Później / może nigdy

- Wysyłka listy mailem.
- Automatyczne odświeżanie (cron).
- Logowanie do aplikacji (potrzebne, jeśli kiedyś wyjdzie poza sieć firmową).
- Bezpośrednie zakładanie artykułów w ERP — poza zakresem (ryzyko dla danych ERP).

---

## Otwarte decyzje (do rozstrzygnięcia po drodze)

- Czy potrzebna jest baza danych? Na razie nie (cache w pamięci wystarcza). Wrócimy do tego, gdy pojawi się potrzeba historii stanów lub wielu instancji aplikacji.
- Jak liczyć ilość do zamówienia dla zestawów.
- Czy Primavera wymaga nagłówka w pliku importu.
- Netto czy brutto w cenie z CSV Primavery (jedna próbka sugeruje netto).
- Czy demo ma być osobnym wdrożeniem, czy trybem tej samej aplikacji.
