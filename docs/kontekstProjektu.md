# Linker — kontekst projektu (stan na 2026-10-05)

> Dokument wewnętrzny, zebrany podczas rozpoznania. Zawiera informacje o infrastrukturze firmy (nazwy baz, struktury danych) i warunkach handlowych hurtowni — **nie umieszczać w publicznym repo ani w README**.
> Nie zawiera tokenów, haseł, adresów IP ani danych osobowych klientów.
> To spis faktów i wiedzy, bez planu implementacji i bez propozycji architektury.

## Oznaczenia statusu informacji

- **[POTWIERDZONE]** — sprawdzone wywołaniem, zapytaniem albo zrzutem ekranu
- **[DOKUMENTACJA]** — z dokumentacji lub strony producenta, niesprawdzone na naszych danych
- **[HIPOTEZA]** — wniosek z danych lub nazw, wymaga potwierdzenia
- **[ODRZUCONE]** — hipoteza obalona danymi
- **[NIEZNANE]** — nie wiemy

---

## 1. Cel i problem biznesowy

Projekt „Linker" ma uprościć codzienną, ręczną pracę w sklepie internetowym z kosmetykami (Kozacka Drogeria), prowadzonym przez firmę KROLEX K.L. KOZAK SPÓŁKA KOMANDYTOWA. Jednocześnie ma być projektem portfolio, który da się pokazać publicznie (tryb demo) i używać w firmie (tryb live).

### Proces dziś (ręczny)

1. Zamówienie trafia do BaseLinkera (kanały: sklep, Allegro, Erli, Empik i inne).
2. Zewnętrzny integrator (nieznany, patrz sekcja 7) przenosi zamówienie do ERP (WAPRO Mag) jako zamówienie od odbiorcy (numer `ZO nnnnn/26/K`) i ustawia status w BaseLinkerze.
3. Dwa statusy wymagają pracy człowieka:
   - **BladPowiazaniaTowaru** — któryś produkt z zamówienia nigdy nie był w ERP (nowy EAN). Wg opisu użytkownika: ERP nie zna tego kodu.
   - **BrakStanuTowaru** — ERP zna produkty, ale któregoś brakuje na magazynie. BaseLinker **nie pokazuje, której pozycji** brakuje; listy bywają długie.
4. Człowiek ręcznie sprawdza w WAPRO, czego brakuje, szuka tego w hurtowni PVEX (Primavera Parfum) i zamawia przez import pliku CSV na stronie PVEX.
5. Pozycji, których nie ma w PVEX, szuka w sklepach stacjonarnych firmy (Drogeria, Cegielski). Robi to przez wspólny arkusz Google (sekcja 6).
6. Po realizacji kierownik magazynu ręcznie przenosi zamówienie do statusu `TworzZamowienie`, żeby integrator spróbował jeszcze raz. Status `BladERP` ustawia się, gdy coś jest nie tak technicznie. [POTWIERDZONE przez użytkownika]

Skala (zrzut z panelu, 2026-10-02): w BrakStanuTowaru 35 zamówień, w BladPowiazaniaTowaru 3; w grupie „TworzenieZam" łącznie 42.

### Co ma robić aplikacja (cel ogólny wg użytkownika)

- Pobrać produkty/pozycje z zamówień w tych statusach.
- Sprawdzić, które są dostępne w PVEX.
- Wygenerować listę do ręcznego zamówienia w PVEX (CSV; w przyszłości ewentualnie mail).
- Przygotować listę pozycji niedostępnych w PVEX do ręcznego wklepania w arkusz sklepów.
- Dashboard z zamówieniami i dostępnością w PVEX.
- Pomysł dodatkowy: lista „nowych artykułów do założenia w ERP" dla BladPowiazaniaTowaru (nazwa/EAN/cena z CSV PVEX lub z pozycji zamówienia). Aplikacja **nie ma zapisywać do ERP**.

### Wcześniejsza roadmapa użytkownika (plik ROADMAP_PVEX_NEXTJS_FAZA1_2.md)

Faza 1: Next.js + pobranie CSV z PVEX + parsowanie. Faza 2: dashboard z tabelą (EAN, nazwa, cena, ilość), wyszukiwanie po EAN, filtry. Faza 3 (przyszłość): BaseLinker API, filtrowanie po statusie, docelowy przepływ: BaseLinker → BladPowiazaniaTowaru → EAN → PVEX → weryfikacja → lista zakupowa → CSV → wysłanie maila.

---

## 2. Użytkownik i ograniczenia środowiska

- Autor zna React i TypeScript; **Next.js (App Router) jest dla niego nowy, uczy się go w trakcie**. Plan musi to uwzględniać.
- Pracuje na firmowym komputerze z Windows: **brak WSL i Dockera** (mało miejsca na dysku). Baza „najlepiej nie dockerowa".
- `curl` w PowerShellu: używać `curl.exe`. Port SQL Servera WAPRO jest osiągalny z jego komputera (`Test-NetConnection` → `TcpTestSucceeded: True`).
- Projekt jest częściowo zaczęty: podstawa Next.js, Route Handler testujący wywołania BaseLinkera (metoda wpisana w kodzie), działający po poprawieniu tokenu.
- Planowanie architektury i rozpisanie zadań odbędzie się w osobnej sesji (metodyka trzech dokumentów: api-contract → backend-spec → frontend-spec + DESIGN.md).

### Założenia i zakres zgłoszone przez autora (do rewizji w planowaniu)

- Stack: Next.js (App Router) + TypeScript + Tailwind, Biome, Postgres + Prisma lub Drizzle (do wyboru), Vitest do testów logiki, opcjonalnie DevExtreme DataGrid (komponenty client-side).
- Architektura: dostęp do danych przez interfejsy (np. ProductSource, OrderSource) z dwiema implementacjami: live (PVEX CSV, BaseLinker API) i demo (zanonimizowane pliki w repo); przełączanie zmienną `DATA_SOURCE=demo|live`; tokeny tylko po stronie serwera; logika biznesowa w warstwie serwisów oddzielonej od Route Handlerów / Server Actions; publiczne demo (i `docker compose up`) bez żadnych tokenów.
- Zakres MVP: (1) import i parsowanie CSV z PVEX + testy parsera, (2) tabela produktów z wyszukiwaniem po EAN i filtrami, (3) zamówienia z BaseLinkera (w demo z JSON) → lista zakupowa po EAN, (4) eksport listy do CSV, (5) deploy w trybie demo + README z opisem problemu i architektury.
- Poza MVP: wysyłka maila, autoryzacja, cron.
- Konflikt do rozstrzygnięcia: wymóg `docker compose up` kontra brak Dockera na komputerze autora.
- Autoryzacja: autor skłania się do jej braku („marnowanie czasu"). Na etapie rozpoznania pojawiło się rozważanie: brak logowania, jeśli tryb live działa wyłącznie lokalnie lub w sieci firmowej. Decyzja nie zapadła.
- Sklepy stacjonarne: **nie integrujemy** (brak dostępu do ich baz). Aplikacja przygotowuje tylko listę do ręcznego wklepania w arkusz.

---

## 3. PVEX / Primavera Parfum

### Kim są [DOKUMENTACJA]
Primavera Parfum Sp. z o.o. (Warszawa), hurtownia/dystrybutor e-commerce kosmetyków i perfum; model B2B, wymaga firmy. Brak publicznej dokumentacji endpointu `pricelist.php`.

### Endpoint CSV
```
GET https://orders.pvex.pl/pricelist.php?wh=all&token=<TOKEN>&format=csv
```
- Parametry znane: `wh=all` (inne dozwolone wartości nieznane), `token` (sekret w query stringu), `format=csv`. [POTWIERDZONE z przekazanego URL-a]
- Kontrakt, limity, kodowanie deklarowane, reguły błędów, częstotliwość odświeżania, rotacja tokenu: [NIEZNANE].
- **Token PVEX został ujawniony** (stary plik PHP i dokumentacja w rozmowie). Należy go wymienić; kto i jak to robi (opiekun handlowy PVEX?) [NIEZNANE].

### Format CSV [POTWIERDZONE na próbce 21 wierszy]
- Nagłówek: `Nazwa;Cena;EAN;Ilosc;StawkaVAT`
- Separator `;`, nazwy w cudzysłowach, kropka jako separator dziesiętny, UTF-8 (polskie znaki OK).
- Ceny bez stałej liczby miejsc (`59.9` i `48.90`). EAN 13-cyfrowy w próbce.
- Całość ok. 22 tys. wierszy (wg autora), kilka MB. Wgrana próbka to tylko 21 wierszy.
- Próbka (pierwsze wiersze):
```
"111SKIN_Anti Blemish Booster booster do twarzy 20ml";299.44;5060280378911;1;23
"4711 EDC spray 100ml";33.21;4011700746668;110;23
"4ORGANIC_Lip Balm #Kawaii balsam do ust Strawberry 5g";5.37;5904181931502;42;23
```
- [NIEZNANE]: czy cena jest netto czy brutto (wg porównania z WAPRO przy jednym produkcie cena z CSV = cena zakupu **netto** w WAPRO: 74,90), znaczenie wartości zerowych/pustych/ujemnych w `Ilosc`, EAN-y krótsze lub z zerem wiodącym w pełnym pliku, duplikaty EAN, kryterium „dostępności" (czy plik zawiera produkty z ilością 0).
- W arkuszu sklepów występują EAN-y 8-cyfrowe (np. `30074576`, `73103714`) — mogą pojawić się też w pozycjach zamówień i w CSV.

### Stary skrypt PHP (`download.php`) [z dokumentu dostarczonego przez autora]
Pobierał CSV, zerował flagę importu w lokalnej tabeli `primavera`, dopasowywał rekordy po EAN (kolumny 0–3: nazwa, cena × (1+marża), EAN, ilość; VAT nieużywany) i aktualizował ceny, stany i aktywność produktów w sklepie. Ryzyka: token w kodzie, brak kontroli statusu HTTP (przy pustej odpowiedzi mógł wczytać stary plik), SQL składany z danych CSV (SQL injection), brak transakcji. Nie wynikało z niego, czy BaseLinker bierze udział w tym procesie.

### Portal PVEX (zrzut ekranu) [POTWIERDZONE]
- Zakładki: Katalog produktów, Historia zamówień. Cenniki w podziale na magazyny: „Całość", „000", „CUE", każdy w formacie XLS, CSV, XML.
- **Import zamówienia: z pliku XLS lub CSV w formacie `ean;zamawiana ilość`** oraz pole „Numer zamówienia w systemie Klienta". Pliku cennika nie wolno modyfikować.
- Katalog w panelu ma kolumny: EAN, Nazwa, Ilość dostępna, Netto, Do zamówienia (z wyszukiwarką po EAN).
- Logowanie ma captcha (wg autora) — **automatyczne składanie zamówień odpada**; zamawia człowiek, importując plik.
- Znaczenie magazynów „000" i „CUE" oraz wpływ wyboru magazynu na dostępność i czas dostawy [NIEZNANE].

---

## 4. BaseLinker API

### Protokół [DOKUMENTACJA, częściowo potwierdzone wywołaniami]
- `POST https://api.baselinker.com/connector.php`, nagłówek `X-BLToken: <token>`, pola formularza `method` i `parameters` (JSON jako tekst). Metody `get*` też idą przez POST.
- **Błędy wracają z HTTP 200** i `status: "ERROR"`, z polami `error_code` i `error_message` (nie `error`). Zaobserwowane: `ERROR_EMPTY_METHOD` (brak pola `method` w body), `ERROR_BAD_TOKEN`.
- Limit: **100 żądań na minutę**. UTF-8. Czasy to **unix timestamp w sekundach**.
- Token jest przypisany do konta (Konto i inne → Moje konto → API) i ma **pełne uprawnienia do zapisu** na koncie firmy. Czy da się go ograniczyć do odczytu [NIEZNANE]. Zasada projektu: wywoływać wyłącznie metody `get*`.
- **Token BaseLinkera został ujawniony w rozmowie** (a przy konfiguracji był wklejony z powielonymi fragmentami). Należy go wymienić po zakończeniu rozpoznania.
- Oficjalne webhooki nie istnieją; zmiany śledzi się przez polling (`getJournalList` — zdarzenia z ostatnich 3 dni).
- API było aktualizowane 2026-09-30.

### Sprawdzone metody

#### `getOrderStatusList` [POTWIERDZONE]
Zwraca statusy konta (`id`, `name`, `color`, `group_id`, `is_primary`, `name_for_customer`). Statusy istotne dla projektu:

| Nazwa | id | grupa |
|---|---|---|
| BladPowiazaniaTowaru | 332592 | 62464 |
| BrakStanuTowaru | 327888 | 62464 |
| BladERP | 332591 | 62464 |
| TworzZamowienie | 327879 | 62464 |
| UtworzonoZK | 327889 | 62464 |
| TowarZamowiony | 356160 | 62464 (dodany później, ręczny; raczej poza zakresem) |
| Dostarczono | 327898 | 62467 |

Pozostałe statusy tworzą potok: kontrola płatności i VAT → nadanie przesyłki → tworzenie zamówienia (grupa 62464, odpowiada sekcji „TworzenieZam" w panelu) → kompletacja WMS → pakowanie → wysyłka → dokument handlowy, plus statusy zestawów (`RozbijZestaw`, `RozbityZestaw`) i „NoweAllegroKozacka/NoweErli/NoweSklep…". ID statusów są specyficzne dla konta. Nazwy grup (`getOrderStatusGroups`) nie były pobierane.

#### `getOrders` [POTWIERDZONE]
- Bez parametrów zwraca bardzo duży zbiór z całego konta (zamówienia od najstarszych, w tym dostarczone).
- Z `status_id` filtr działa (zamówienia mają `order_status_id` równe filtrowi). Pierwsza próba z trzema parametrami (`status_id`, `get_unconfirmed_orders`, `date_from`) zwróciła błąd (treść nie zachowana); nie ustalono, który parametr go powodował. Następnie wywołanie działało.
- Wg dokumentacji: maks. 100 zamówień naraz; zalecane `get_unconfirmed_orders=false`; stronicowanie przez `date_confirmed_from` (kolejna paczka od `date_confirmed` ostatniego zamówienia + 1 s, aż paczka ma mniej niż 100). Paginacja nie była testowana na naszych danych.
- Pola zamówienia (nazwy z odpowiedzi): `order_id`, `shop_order_id`, `external_order_id`, `order_source`, `order_source_id`, `order_status_id`, `confirmed`, `date_confirmed`, `date_add`, `date_in_status`, `currency`, `payment_method`, `payment_method_cod`, `payment_done`, `delivery_method`, `delivery_price`, `admin_comments`, `user_comments`, `extra_field_1`, `extra_field_2`, `order_page`, `pick_state`, `pack_state`, `star`, `delivery_country_code`, `products[]` oraz sporo pól osobowych (`email`, `phone`, `user_login`, `delivery_*`, `invoice_*`). **Pola osobowe i `order_page` (link z kluczem) nie mogą trafić do repo ani do demo.**
- Pola pozycji (`products[]`): `storage` (`"shop"`), `storage_id` (3010600), `order_product_id`, `product_id` (tekst; numeracja sklepu), `variant_id` (`""` lub `"0"` — oba znaczą brak wariantu), `name`, `attributes`, `sku`, `ean`, `location`, `warehouse_id`, `warehouse_type`, `warehouse_source_id`, `auction_id`, `price_brutto`, `tax_rate`, `quantity`, `weight`, `bundle_id`, `transaction_id`, `transaction2_id`.
- Obserwacje: w próbkach `sku` = `ean`; koszt dostawy jest osobnym polem `delivery_price` (**w pozycjach z BaseLinkera nie ma linii transportu**); `admin_comments` przy BrakStanuTowaru miał wartości typu „+GRATIS" (nic od integratora); zamówienia Allegro za granicę mają `extra_field_2` = `#OSS#` (znacznik VAT OSS).
- **`extra_field_1` zawiera numer zamówienia z ERP (`ZO nnnnn/26/K`)** — w obu zbadanych zamówieniach z BrakStanuTowaru (czyli ERP utworzyło ZO, a brak uniemożliwia realizację) oraz w zamówieniu dostarczonym. Dla BladPowiazaniaTowaru nie sprawdzono (hipoteza: pole puste).
- Nie sprawdzono: zamówień z BladPowiazaniaTowaru, zamówień wielopozycyjnych z BaseLinkera (w próbkach tylko po 1 pozycji), pozycji z `bundle_id` ≠ 0.

#### `getInventories` [POTWIERDZONE]
Jeden katalog: `inventory_id` = **18840**, nazwa „Domyślny", język `pl`, grupy cenowe 17077 (domyślna), 49333, 50065, magazyny `bl_24543` (domyślny) i `shop_3010600`, `reservations: false`, `is_default: true`.

#### `getInventoryWarehouses` [POTWIERDZONE]
- `bl_24543` — „Domyślny", `stock_edition: true` (stan edytowalny w BaseLinkerze).
- `shop_3010600` — „kozackadrogeria", `stock_edition: false` (odbicie stanu ze sklepu); ten sam numer 3010600 jest w `storage_id` pozycji zamówień i w `order_source_id` zamówień ze sklepu.
- **Osobnego magazynu WAPRO nie ma.**

#### `getInventoryProductsList` z filtrem EAN [POTWIERDZONE]
Zapytanie `{"inventory_id": 18840, "filter_ean": "<EAN>"}` działa. Odpowiedź: `products` to **obiekt kluczowany `id` produktu w katalogu**, a nie tablica; pola: `id`, `ean`, `asin`, `sku`, `name`, `parent_id`, `stock` (obiekt z kluczami magazynów), `prices` (obiekt z kluczami grup cenowych).
- **Ten sam EAN może mieć kilka produktów** (np. pojedynczy i zestaw), więc samo wyszukiwanie po EAN bywa niejednoznaczne.
- Numery produktów różnią się między katalogiem (np. 305894853) a pozycją zamówienia (`product_id` sklepu, np. 116022). Łączenie wymaga EAN/`sku`.
- Nie sprawdzono: filtrowania po wielu EAN-ach naraz.

#### `getInventoryProductsStock` [POTWIERDZONE częściowo]
Zwraca `products` (obiekt kluczowany `product_id`) z `stock` per magazyn. Pierwsza strona zawierała same zera dla produktów o starych ID (nieprzydatne jako dowód). Stronicowanie (`page`) i filtry nie były badane.

### Niesprawdzone, ale istotne
- `getExternalStorageProductsQuantity` (stan produktu w sklepie, `storage_id` w formacie `shop_3010600`) — niesprawdzone; spodziewany wynik ten sam co `shop_3010600` z katalogu.
- `getInventoryProductLogs` (historia zmian stanu produktu) — może wyjaśnić, kto i jak często zmienia `shop_3010600`.
- `getOrderExtraFields`, `getOrderStatusGroups`, `getInventoryProductsData`.
- Metody zapisu (`addInventoryProduct`, `updateInventoryProductsStock`, `setOrderStatus` itd.) istnieją, ale **nie są używane**; `addInventoryProduct` dodaje produkt tylko do katalogu BaseLinkera, nie do ERP.
- BaseLinker ma własne zamówienia zakupowe (`addInventoryPurchaseOrder`, dostawcy) — nie badane; potencjalne nakładanie się z celem projektu.

---

## 5. WAPRO Mag (ERP)

### Dostęp [POTWIERDZONE]
- Baza SQL Server 2017, połączenie przez host, port 1433 (bez nazwy instancji), uwierzytelnianie SQL. Port jest osiągalny z komputera autora. Dane połączenia (host, port, nazwa bazy) autor ma w osobnym pliku; **brak loginu i hasła do bazy**.
- Baza z zamówieniami sklepu: **KROLEX** (potwierdzone: `ZO 26196/26/K` istnieje w `KROLEX.dbo.ZAMOWIENIE`). Na serwerze są też bazy: KOZAK, KROLEX2014, KROLEX2017, KROLEXanalityka, MAGMOBILE, WAPROJPK, WAPRO_UPDATE, TEST. Bazy KOZAK i KROLEXanalityka nie były badane.
- **Konsola SQL wbudowana w WAPRO pracuje na koncie aplikacji z rolą sysadmin serwera** (zapytanie: `czy_sysadmin = 1`). Nie wolno używać tego konta w aplikacji. W konsoli wykonywano wyłącznie `SELECT` (metadane i dane zamówień).
- Zgodnie z dokumentacją WAPRO aplikacja pracuje standardowo na dedykowanym koncie MS SQL, a użytkownicy programu mają osobne konta w warstwie aplikacji, więc hasło użytkownika WAPRO najpewniej nie jest hasłem do bazy [DOKUMENTACJA, nie sprawdzono]. Potrzebny jest osobny login tylko do odczytu od administratora.
- Aktywne sesje (zapytanie o sesje): główne konto aplikacji z wielu stanowisk (WAPRO Mag, MVAX, usługi aktualizacji), konto usługi mobilnej WAPRO (`erpliteuser`), konto administracyjne i **`xcom_app`** — aplikacja .NET łącząca się z maszyny serwera; jej rola [NIEZNANE].
- Lista użytkowników bazy KROLEX nie zawiera konta o nazwie wskazującej na BaseLinker/API.

### Obiekty niestandardowe [POTWIERDZONE, wnioski HIPOTEZA]
- Wiele tysięcy obiektów producenta (prefiks `Api_` ok. 3,9 tys.; `WAPROERP_`, `AP_`, `RM_`, `RODO_`, `KSEF_`, `MAGGEN_`, `WFM_` itd.); większość zaktualizowana jednocześnie 31.08.2026. Aktualizacja WAPRO miała też miejsce 2026-10-05 rano.
- Nie znaleziono obiektów wskazujących na własną integrację z BaseLinkerem. Pojedyncze nietypowe nazwy (np. `ZD_SP_ZapiszToken`, prefiks `BL_` — wygląda na usługi subskrypcyjne WAPRO) nie były badane. Brak śladu w bazie nie wyklucza integratora działającego poza bazą.
- Gniazda rozszerzeń (Admin | Definicje | Gniazda rozszerzeń programu) autor przejrzał i nic nie znalazł.

### Schemat (kolumny istotne) [POTWIERDZONE]
- **`ARTYKUL`**: `ID_ARTYKULU`, `ID_MAGAZYNU`, `NAZWA`, `STAN`, `ZAMOWIONO`, `DO_REZERWACJI`, `ZAREZERWOWANO`, `INDEKS_KATALOGOWY`, `INDEKS_HANDLOWY`, `KOD_KRESKOWY`, `STAN_MINIMALNY`, `STAN_MAKSYMALNY` i wiele innych. Artykuł może mieć osobny wiersz na magazyn.
- **`KOD_KRESKOWY`** (kody dodatkowe): `ID_MAGAZYNU`, `KOD_KRESKOWY`, `ID_ARTYKULU`, `ID_JEDNOSTKI`, `DOM_ILOSC` (ilość przypadająca na kod), `ID_KODU_KRESKOWEGO`. Dopasowanie EAN wymaga sprawdzenia obu tabel (kod główny i dodatkowe).
- **`ZAMOWIENIE`**: `ID_ZAMOWIENIA`, `ID_KONTRAHENTA`, `ID_FIRMY`, `ID_MAGAZYNU`, `NUMER` (format `ZO nnnnn/26/K`), `NR_ZAMOWIENIA_KLIENTA`, `ZAMOWIENIE_INTERNETOWE`, `ZAMOWIENIE_INTERNETOWE_ID`, `STAN_REALIZ`, `FLAGA_STANU`, `KONTRAHENT_NAZWA` (dane osobowe), `NUMER_PRZESYLKI` i inne.
- **`POZYCJA_ZAMOWIENIA`**: `ID_POZYCJI_ZAMOWIENIA`, `ID_ZAMOWIENIA`, `ID_ARTYKULU`, `ZAMOWIONO`, `ZAREZERWOWANO`, `DO_REZERWACJI`, `ID_DOSTAWY_REZ`, `STAN_ZREALIZOWANO`, `ID_WARIANTU` i inne.
- Widoki stanów: **`iWP_VV_WFMAG_StanZamowienIRezerwacji`** (`IndeksKatalogowy`, `Stan`, `IloscDostepna`, `DoDostawcowZamowiono`, `OdbiorcyZamowili`, `OdbiorcyZarezerwowano`, `Stan_Prognozowany`, `id_magazynu`, `id_artykulu`, `Magazyn`, `NazwaFirmy`), **`LX_STAN_MAGAZYNU_R`** (`nazwa`, `id_firmy`, `id_magazynu`, `nazwa_magazynu`, `indeks_katalogowy`, `indeks_handlowy`, `stan`, `nazwa_kategorii`, `kod_kreskowy`, `nazwa2`, `id_artykulu` — zawiera zarówno kod kreskowy, jak i stan), `JLVIEW_STANMAGAZYNU_RAP`, `WIDOK_POZYCJASTANU`. Widoki nie były jeszcze odpytane o dane.
- `MAGGEN_Wms_Artykul_Stan_VP` ma bezimienne kolumny `p1`…`p30` — nieprzydatny.

### Powiązanie zamówień BaseLinker ↔ WAPRO [POTWIERDZONE na 2 zamówieniach]
`ZAMOWIENIE.NR_ZAMOWIENIA_KLIENTA` = `B_<order_id z BaseLinkera>` (np. `B_349082952`). W drugą stronę numer ZO jest w `extra_field_1` zamówienia w BaseLinkerze. Zbadano tylko dwa zamówienia; wzorzec dla reszty należy potwierdzić. `STAN_REALIZ` = `N`, `FLAGA_STANU` = 0 dla obu (znaczenie [NIEZNANE]). `ZAMOWIENIE_INTERNETOWE_ID` było puste.

### Pozycje zamówienia w WAPRO — zbadane przypadki
- Zamówienie `ZO 26196/26/K` (BaseLinker 349082952) ma 2 pozycje: Lattafa (EAN 6290360592909: zamówiono 1, zarezerwowano 0, `DO_REZERWACJI` 1, stan 0) oraz **linię „USŁUGI transportowa"** z fałszywym EAN-em `0000000000001` (zamówiono 1, `DO_REZERWACJI` 0). ERP dopisuje koszt dostawy jako pozycję; w pozycjach z BaseLinkera tej linii nie ma.
- **[ODRZUCONE] Reguła „brak = `DO_REZERWACJI` > 0".** Zapytanie na ok. 200 ostatnich zamówieniach z BaseLinkera (ZO 27179…27380) pokazało trzy układy: wszystkie pozycje z `DO_REZERWACJI` > 0 (większość), wszystkie oprócz jednej (przypuszczalnie linia transportu) oraz żadna (ok. 40 zamówień, zawsze co najmniej 2 pozycje). Pole opisuje stan całego zamówienia i flaguje większość zamówień, więc nie wskazuje brakującej pozycji. Znaczenie pola [NIEZNANE]. Jedno zamówienie ma 112 pozycji (skrajny przypadek).
- Reguła porównania stanu artykułu z ilością (`czy_brak`) nie została jeszcze uruchomiona na zamówieniach z BrakStanuTowaru (zapytanie przygotowane, wymaga listy `order_id` z `getOrders`).

### Magazyny w WAPRO (zrzuty karty artykułu)
Magazyny: **KROLEX (KROLEX)**, KOZACKADROGERIA (NOWOŚCI), KROLEX BRAKI (BRAKI), KROLEX USZKODZENIA (USZK). Stany tylko w KROLEX. Który magazyn liczy się przy realizacji zamówień sklepu [NIEZNANE] (prawdopodobnie KROLEX).

### WebAPI Wapro integrator [DOKUMENTACJA]
Osobny moduł dodatkowy wdrażany przez partnera (APROSYSTEM), udostępnia zawartość bazy WAPRO (tabele, widoki, procedury) przez HTTP z SSL; licencja bezterminowa, bez limitu użytkowników, bezpłatne aktualizacje. Czy firma ma ten moduł [NIEZNANE]; nie znamy nazwy usługi ani portu. Moduł mógłby nie zostawiać śladu w bazie.

---

## 6. Arkusz Google sklepów stacjonarnych [POTWIERDZONE zrzutem]

Wspólny arkusz, w którym ktoś ręcznie wpisuje pozycje niedostępne w PVEX; sklepy (DROGERIA, CEGIELSKI) uzupełniają, ile mają i mogą podrzucić. Ok. 750 wierszy od początku arkusza.
- Kolumny: Data, EAN, Nazwa, Zamówienie (ilość), Brakuje, DROGERIA, CEGIELSKI, Kontrahent, Czy ukryć (checkbox).
- **Kolumna „Kontrahent" zawiera numer zamówienia z BaseLinkera** (np. 349893073) — zgodny z `order_id`.
- Kolory wierszy: zielony przekreślony = załatwione, żółty = częściowo, czerwony = brak. Czy „Brakuje" i kolory są liczone formułą czy ręcznie [NIEZNANE].
- Nazwy w stylu WAPRO (skrócone, wielkie litery), EAN-y także 8-cyfrowe, ale format EAN-ów bywa zapisany liczbowo i tekstowo.
- Decyzja: aplikacja nie integruje się z arkuszem ani ze sklepami; ma przygotować listę w kolejności kolumn do wklejenia. Ewentualna integracja z Google Sheets — kiedyś, poza zakresem.

---

## 7. Integrator BaseLinker ↔ WAPRO [częściowo HIPOTEZA]

Nie wiemy, jaki mechanizm przenosi zamówienia i ustawia statusy. Z rozpoznania i wyszukiwania w sieci:
- Połączenia WAPRO–BaseLinker robią zewnętrzni integratorzy (np. WfSync, integrator wf-mag, SellIntegro, Wapro Aukcje). Typowy schemat: zamówienia i kontrahenci z BaseLinkera do WAPRO, a artykuły, ceny, stany i statusy z WAPRO do BaseLinkera; artykuły wiązane po kodzie kreskowym; towar rezerwowany w momencie złożenia zamówienia. [DOKUMENTACJA]
- [HIPOTEZA] `BladPowiazaniaTowaru` = brak artykułu o danym EAN w ERP (zgodne z opisem użytkownika).
- [HIPOTEZA] Jeden z integratorów przesyła do BaseLinkera tylko artykuły o kategorii wielopoziomowej innej niż „Ogólna" — mogłoby tłumaczyć, że `bl_24543` nie zawsze odzwierciedla ERP.
- Statusy `BladERP`, `BladPowiazaniaTowaru`, `BrakStanuTowaru` wyglądają na ustawiane przez integrator; kierownik magazynu cofa zamówienia do `TworzZamowienie`. Aplikacja nie powinna zmieniać statusów (mogłoby kolidować z integratorem).
- Ślady w bazie: sesje i obiekty niczego jednoznacznego nie wskazały. Jedyna aplikacja .NET wyglądająca na zewnętrzną to `xcom_app` [NIEZNANE].

---

## 8. Porównanie stanów w czterech miejscach [POTWIERDZONE, wnioski ostrożne]

| Produkt (EAN) | WAPRO (KROLEX): stan / dostępna / zarezerw. | BaseLinker `bl_24543` | BaseLinker `shop_3010600` | PVEX |
|---|---|---|---|---|
| Lattafa Pride Vintage Radio EDP 100ml (6290360592909) | 0 / 0 / 0 | 0 | 32 | 32 (netto 74,90) |
| Almusso Bravo, ręcznik papierowy (5907678200419) | 169 / 166 / 3 (dostawy 482) | **-12** | 174 | brak w ofercie |
| Reklamówka 30/9×55 (5907483600510) | 18 / 17 / 1 (dostawy 141) | 0 | 17 | brak w ofercie |

Wnioski:
- **[ODRZUCONE] `bl_24543` = stan WAPRO.** Ujemny stan (-12) przy 169 w ERP oraz zera przy dodatnich stanach wskazują, że to osobny licznik BaseLinkera (edytowalny ręcznie), niezgodny z ERP.
- **[ODRZUCONE] `shop_3010600` = dostępne w WAPRO + stan w PVEX.** Pasowało do Lattafy i reklamówek, ale Almusso ma 174 przy 166 dostępnych i braku w PVEX. Możliwe wyjaśnienia (niesprawdzone): opóźnienie synchronizacji, inne rezerwacje w innym momencie, własne źródło sklepu.
- **Stan sklepu `shop_3010600` zgadza się z PVEX tam, gdzie produkt jest w PVEX (Lattafa: 32 = 32).** Skąd dokładnie pochodzi i jak często się odświeża [NIEZNANE]; w starym skrypcie PHP ilości z PVEX były zapisywane do sklepu.
- **Wniosek roboczy:** stanów magazynu głównego WAPRO nie da się wiarygodnie odczytać z BaseLinkera. Źródłem musi być WAPRO (baza SQL, eksport do pliku lub WebAPI), albo zostaje wersja bez stanów.
- Zestaw 4-pakowy w BaseLinkerze (sku `ZESTAWx4x<EAN>`, osobny produkt `354466338`) ma stan 43 = 174 podzielone przez 4 w dół (jedna próbka). Pojedynczy i zestaw mają ten sam EAN.
- Nazwy tego samego produktu różnią się w trzech systemach (np. „Lattafa Vintage Radio Woda Perfumowana Spray 100ml" / „LATAFFA Pride Vintage Radio EDP 100ml" / „LATTAFA Pride Vintage Radio EDP spray 100ml") → **łączenie wyłącznie po EAN, nie po nazwie.** Przy Almusso kolor w nazwie BaseLinkera („Szary") różni się od WAPRO („BIAŁY") dla tego samego EAN — możliwy błąd w katalogu.

Skutek dla zakresu: bez stanów z WAPRO lista dla BrakStanuTowaru zawiera **wszystkie pozycje zamówień z tego statusu**, w tym te, które na magazynie są. Dla BladPowiazaniaTowaru lista jest od razu trafna (każdy EAN jest nieznany ERP).

---

## 9. Ustalenia, które nie zadziałały (żeby ich nie powtarzać)

- Stany z `bl_24543` jako stan WAPRO.
- Reguła `DO_REZERWACJI` > 0 jako oznaczenie brakującej pozycji.
- Równanie `shop_3010600 = dostępne w WAPRO + PVEX`.
- Widok `MAGGEN_Wms_Artykul_Stan_VP` (kolumny `p1`…`p30` bez nazw).
- Szukanie śladu integratora w katalogu obiektów bazy, sesjach i gniazdach rozszerzeń — bez rozstrzygnięcia.
- Komentarz z listą brakujących EAN-ów w zamówieniu (integrator tego nie robi; `admin_comments` zawierał inne notatki).

---

## 10. Czego potrzebujemy (otwarte sprawy)

### Od administratora / IT firmy
1. Co to jest konto `xcom_app` i czy działa integracja BaseLinker↔WAPRO (jaki produkt/dostawca).
2. Czy firma ma WebAPI Wapro (APROSYSTEM).
3. **Login SQL tylko do odczytu** na bazie KROLEX: `SELECT` na `ZAMOWIENIE`, `POZYCJA_ZAMOWIENIA`, `ARTYKUL`, `KOD_KRESKOWY`, `iWP_VV_WFMAG_StanZamowienIRezerwacji` (i ewentualnie `LX_STAN_MAGAZYNU_R`); najlepiej wystawione przez widok bez danych osobowych klienta. Łączenie tylko z sieci firmowej.
4. Który magazyn WAPRO liczy się przy realizacji zamówień sklepu.
5. Czy integrator może zakładać artykuły (BladPowiazaniaTowaru) i jak dziś zakłada się nowe artykuły.
6. Czy WAPRO przyjmuje import artykułów z pliku (i w jakim formacie), żeby lista „nowych artykułów" mogła być użyteczna.

### Od osoby, która dziś obsługuje te zamówienia
- Ile minut dziennie to zajmuje i ile pozycji dziennie trafia do arkusza (liczby do README).
- Czy najpierw sprawdza PVEX, a do arkusza trafia tylko to, czego tam nie ma.
- Czy „Brakuje" i kolory w arkuszu są formułą.
- Jak często i z jakiego źródła sklep dostaje stany (`shop_3010600`).
- Co robi z zestawami (`RozbijZestaw`) przy zamawianiu u hurtowni.

### Dane i testy do dopełnienia
- Zanonimizowana próbka zamówień z BrakStanuTowaru i BladPowiazaniaTowaru: same pozycje (`ean`, `name`, `quantity`, `sku`, `bundle_id`), w tym zamówienia wielopozycyjne i z zestawem.
- Większa próbka CSV z PVEX z przypadkami brzegowymi (puste wartości, zera, EAN 8-cyfrowe, cudzysłowy w nazwach).
- Test `czy_brak` w WAPRO dla zamówień z BrakStanuTowaru (porównanie stanu z ilością).
- Weryfikacja zasady `NR_ZAMOWIENIA_KLIENTA = 'B_' + order_id` na większej liczbie zamówień.
- Test paginacji `getOrders` (przy ponad 100 zamówieniach) i filtrowania wielu EAN-ów w `getInventoryProductsList`.
- Sprawdzenie, czy `extra_field_1` jest pusty dla BladPowiazaniaTowaru.
- Porównanie stanu produktu z kilku godzin (opóźnienie synchronizacji `shop_3010600`).
- Znaczenie: `STAN_REALIZ`, `FLAGA_STANU`, `DO_REZERWACJI`; znaczenie magazynów PVEX „000"/„CUE" i parametru `wh`; netto/brutto w CSV PVEX.

### Tokeny i dostęp
- Wymienić **token BaseLinkera** i **token PVEX** (oba ujawnione w rozmowie); ustalić, kto generuje nowe tokeny po stronie PVEX.
- Wszystkie sekrety wyłącznie w zmiennych środowiskowych po stronie serwera (`.env.local` w `.gitignore`).

---

## 11. Ryzyka i zasady bezpieczeństwa

- Token BaseLinkera ma pełne uprawnienia zapisu na koncie firmy → w kodzie dopuszczać tylko metody `get*`.
- Konsola SQL w WAPRO działa jako sysadmin → tylko `SELECT` z `TOP`, bez wywoływania procedur `Api_*`/`AddOrModify`, bez zapisu.
- Dane zamówień zawierają dane osobowe klientów (imię, adres, telefon, e-mail, login kupującego) i linki z kluczem (`order_page`) → nie trafiają do repo, logów, demo ani do rozmów; w demo dane zmyślone lub zanonimizowane.
- Ceny hurtowe z CSV PVEX to warunki handlowe → w publicznym demo zmienić ceny i ilości (EAN-y i nazwy mogą zostać).
- Odczyt z WAPRO działa tylko w sieci firmowej; publiczne demo nie może zależeć od WAPRO.
- Aplikacja nie zapisuje do ERP, BaseLinkera ani PVEX; nie zmienia statusów zamówień.
- Błędy BaseLinkera przychodzą z HTTP 200 — samo `response.ok` nie wystarcza.

---

## 12. Słownik

- **ZO** — zamówienie od odbiorcy w WAPRO (numer `ZO nnnnn/26/K`); `UtworzonoZK` w statusach BaseLinkera to prawdopodobnie jego skrót.
- **EAN** — kod kreskowy, klucz łączenia między systemami (traktować jako tekst).
- **PVEX / Primavera Parfum** — hurtownia kosmetyków i perfum, źródło CSV.
- **Katalog (inventory)** — baza produktów BaseLinkera („Artykuły"), `inventory_id` = 18840.
- **Magazyn `bl_…` / `shop_…`** — odpowiednio magazyn BaseLinkera i stan sklepu zewnętrznego w katalogu.
- **Gniazda rozszerzeń** — miejsca w WAPRO, w których można podpiąć własny kod (procedura SQL, skrypt, program).

---

## 13. Źródła

- BaseLinker API (lista metod, tester, changelog): https://api.baselinker.com/
- Protokół wymiany danych BaseLinkera ze sklepami: https://developers.baselinker.com/shops_api/
- WebAPI Wapro integrator: https://wapro.pl/rozwiazania-branzowe/webapi-wapro-integrator-rest-api/
- WAPRO — zabezpieczenie dostępu do danych (konto aplikacji w SQL): https://wapro.pl/dokumentacja-erp/desktop/docs/srodki-trwale/o-programie/est-03-przetwarzanie-danych-osobowych/est-04-zabezpieczanie-dostepu-do-danych/
- WAPRO — gniazda rozszerzeń: https://wapro.pl/dokumentacja-erp/anywhere/docs/sprzedaz-i-magazyn/gniazda-rozszerzen/edytor-gniazd/
- WAPRO — eksport i import danych w Mag: https://wapro.pl/dokumentacja-erp/anywhere/docs/sprzedaz-i-magazyn/menu-inne/wymiana-danych/eksport-import-mag/
- Integratory WAPRO–BaseLinker (przykłady rynkowe): https://integratory.pl/produkt/wfsync-integrator-baselinker-i-wapro-wf-mag/ , https://wf-mag.com.pl/integrator/108-integrator-baselinker , https://www.sellintegro.pl/wtyczki/przesylanie-zamowien-z-baselinker-do-wapro-mag
- Primavera Parfum: https://www.primaveraperfum.pl/en/
