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
