# Linker — luźny plan prac (do zmiany w trakcie)

> To szkic kierunku, a nie umowa. Kolejność i zakres można zmieniać, gdy dowiemy się czegoś nowego.
> Zasada robocza: najpierw działa (widać wynik na ekranie), potem porządkujemy i dopisujemy testy.
> Fakty o systemach (BaseLinker, PVEX, WAPRO) są w `kontekstProjektu.md`.

## Zasady, których się trzymamy

- **Logika w `lib/`, nie w komponentach ani w `route.ts`.** Parsowanie CSV, agregacja po EAN-ie, budowanie list to zwykłe funkcje. Dzięki temu testy dopiszemy później bez przepisywania.
- **Strony pobierają dane same** (Server Components wołają funkcje z `lib/`). Route Handler tylko tam, gdzie przeglądarka ma pobrać plik (eksport CSV).
- **Tokeny wyłącznie po stronie serwera** (`.env.local`, w `.gitignore`).
- **Aplikacja tylko czyta.** Nic nie zapisuje do BaseLinkera, PVEX ani WAPRO i nie zmienia statusów zamówień.
- Łączenie danych **tylko po EAN-ie**, nigdy po nazwie.

---

## Faza 0 — sprawy poza kodem (równolegle, od razu)

- [ ] Wymienić token BaseLinkera i token PVEX (oba były wklejone do rozmowy).
- [ ] Wysłać pytania do administratora (login SQL tylko do odczytu, `xcom_app`, WebAPI Wapro, magazyn realizacji) — odpowiedź zajmie najdłużej.
- [ ] Zanonimizowana próbka zamówień (same pozycje: `ean`, `name`, `quantity`, `sku`, `bundle_id`) — przyda się do demo i do sprawdzania przypadków brzegowych.

## Faza 1 — szkielet i nawigacja

Cel: aplikacja się uruchamia, da się klikać między widokami.

- [ ] Layout z prostym navbarem (`next/link`, podświetlenie aktywnej zakładki przez `usePathname` w małym komponencie klienckim).
- [ ] Strony: `/orders`, `/products`, `/shopping-list`; `/` przekierowuje na `/orders`.
- [ ] Puste widoki z nagłówkiem i miejscem na tabelę.

**Gotowe, gdy:** nawigacja działa, każda strona się renderuje.

## Faza 2 — produkty z PVEX

Cel: widok `/products` pokazuje cennik hurtowni.

- [ ] Wydzielić z obecnego `route.ts` funkcję pobierającą i parsującą CSV (np. `getPvexProducts()` w `lib/`).
- [ ] Pobieranie z cache (np. `revalidate` kilka–kilkanaście minut), bo plik ma ok. 22 tys. wierszy.
- [ ] Tabela: EAN, nazwa, cena, ilość, VAT; wyszukiwanie po EAN i po nazwie; stronicowanie lub wirtualizacja.
- [ ] Obsługa błędów: pusta odpowiedź, zły token, zmiana formatu — komunikat zamiast pustej strony.

**Gotowe, gdy:** wpisujesz EAN i widzisz ilość w PVEX.

## Faza 3 — zamówienia z BaseLinkera

Cel: widok `/orders` pokazuje zamówienia z dwóch statusów i dostępność ich pozycji w PVEX.

- [ ] Funkcja `getOrdersByStatus(statusId)` (metoda `getOrders`, statusy 327888 i 332592; błędy wracają z HTTP 200 — sprawdzać `status`).
- [ ] Przy odpowiedzi ograniczać dane do tego, co potrzebne (pozycje, numer zamówienia, status, `extra_field_1`); **dane osobowe klientów nie trafiają do widoków ani logów**.
- [ ] Tabela zamówień z pozycjami i znacznikiem „jest / nie ma w PVEX" (po EAN).
- [ ] Zdecydować, co robić z zestawami (`ZESTAWx4x<EAN>`, `bundle_id`) po obejrzeniu prawdziwych danych.
- [ ] Przy 100 lub więcej zamówieniach: paginacja po `date_confirmed_from`.

**Gotowe, gdy:** widzisz bieżące zamówienia z braków i wiesz, co z nich da się zamówić w PVEX.

## Faza 4 — listy zakupowe i eksport (sedno aplikacji)

Cel: zastąpić ręczne przepisywanie.

- [ ] Agregacja pozycji po EAN-ie (suma ilości; sprawdzenie w PVEX).
- [ ] Lista „zamów w PVEX" → eksport CSV `ean;ilość` do importu w portalu (jeden mały plik testowy najpierw, żeby sprawdzić, czy PVEX chce nagłówek).
- [ ] Lista „brak w PVEX" → format do wklejenia w arkusz sklepów (EAN, nazwa, ilość, numer zamówienia).
- [ ] Lista „nowe artykuły do założenia" dla `BladPowiazaniaTowaru` (EAN, nazwa, cena z PVEX lub z zamówienia).
- [ ] Route Handler eksportu (`/api/shopping-list/export` i analogiczne).

**Gotowe, gdy:** pobierasz plik, wgrywasz go do PVEX i zamówienie przechodzi.
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

- Czy potrzebna jest baza danych, czy wystarczą pliki i cache? (komputer bez Dockera/WSL; na razie raczej bez bazy)
- Jak liczyć ilość do zamówienia dla zestawów.
- Czy PVEX wymaga nagłówka w pliku importu.
- Netto czy brutto w cenie z CSV PVEX (jedna próbka sugeruje netto).
- Czy demo ma być osobnym wdrożeniem, czy trybem tej samej aplikacji.
