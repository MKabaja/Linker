# Mapa API BaseLinker — Kozacka Drogeria

Ostatnia aktualizacja: 06.11.2026

> **Zasada dla Claude:** za każdym razem, gdy w tym projekcie sprawdzamy API BaseLinkera (tester, curl, skrypt), zaktualizuj ten dokument: dopisz nowe metody, parametry, strukturę odpowiedzi, kody błędów, ID z konta i obserwacje. Nie wpisuj tokenu ani danych osobowych klientów. Oznaczaj, co jest potwierdzone odpowiedzią API, a co podane z pamięci.

## Jak wołać API

- Tester: https://api.baselinker.com/?tester (token + metoda + parametry jako JSON). Tester nie pokazuje tabeli typów/słowników — opisy są na stronie metody w dokumentacji.
- Dokumentacja metody: `https://api.baselinker.com/index.php?method=<nazwa>`
- Endpoint: `POST https://api.baselinker.com/connector.php`, nagłówek `X-BLToken`, pola `method` i `parameters` (JSON)
- Błędy wracają z HTTP 200 — zawsze sprawdzaj `status` (`SUCCESS` / `ERROR`)
- Wołamy tylko metody `get*` (token ma prawo zapisu na produkcyjnym koncie)
- Limity (z pamięci): 100 zamówień na odpowiedź `getOrders`, 100 żądań/min
- Uwaga: część liczb wraca jako stringi (np. `package_id`, `tracking_status`, daty w `getOrderPackages`, `time` w logach produktu), a część jako liczby (`object_id`, `date` w `getJournalList`). Porównując ID, rzutuj typy.
- Pobieranie hurtem: skrypt PowerShell (token wklejany w oknie, nie w pliku), funkcja `Bl $method $params`, pętla po `getJournalList` z `last_log_id` = największy pobrany `log_id`, przerwanie gdy brak nowych wpisów, pauza 700 ms. Wynik do JSON-a na pulpicie (`Desktop\baselinker`).
- Raport jednego zamówienia: skrypt PowerShell łączący `getOrders` (wybrane pola, bez danych klienta) + `getJournalList` + `getOrderPackages` + `getOrderStatusList` + `getOrderExtraFields`; daty przeliczane na czas polski (`Central European Standard Time`). Zapis `Desktop\baselinker\zamowienie_<id>.json`.
- **API nigdy nie podaje, która aplikacja z tokenem API wykonała zmianę.** To wiedzą tylko logi samych aplikacji (SellIntegro, WMS) — i ewentualnie WAPRO (operator dokumentu).

## Stałe ID z konta (potwierdzone)

| Co | ID | Uwagi |
| --- | --- | --- |
| Katalog | `inventory_id` 18840 | „Domyślny”, jedyny, `is_default: true`, język pl |
| Grupy cenowe | 17077 (domyślna), 49333, 50065 | |
| Magazyn BaseLinkera | `bl_24543` | domyślny, ale nieużywany — stany 0, brak zmian w logach |
| Magazyn sklepu | `shop_3010600` | faktyczne źródło stanów; zmiany z profilu „Automat” |
| `warehouse_id` w pozycji zamówienia | 72065 | widoczne w `getOrders.products`; nie odpowiada wprost `bl_24543` — znaczenie do ustalenia |
| Konto kurierskie InPost | `account_id` 57771 | `courier_code` `inpostkurier`, `courier_other_name` `inpost_courier_standard` |
| Źródło Erli | `order_source` `erli_connector`, `order_source_id` 34062 | |
| Stanowisko pakowania | `station_id` 33522 | z `getOrderPickPackHistory`, profil „Ela” |

Dziennik zdarzeń zamówień (`getJournalList`) — **włączony** od 26.10.2026 ok. 18:07. Włącza się w panelu (ustawienia konta → API), nie przez API. Zapisuje zdarzenia dopiero od włączenia, trzyma 3 dni.

### Pola dodatkowe zamówień (z `getOrderExtraFields`, potwierdzone)

| ID | Nazwa | Co zawiera (zaobserwowane) |
| --- | --- | --- |
| 1 (`extra_field_1`) | Pole dodatkowe 1 | numer dokumentu z WAPRO, np. `ZO 32805/26/K` — najpewniej wpisuje go SellIntegro po utworzeniu zamówienia w WAPRO |
| 2 (`extra_field_2`) | Pole dodatkowe 2 | puste |
| 77709 | WMS | niepobrane — wymaga `include_custom_extra_fields: true` w `getOrders` |
| 77974 | TypTransakcji | niepobrane, j.w. |
| 81109 | Ilość paczek | niepobrane, j.w. |

### Statusy procesu (z `getOrderStatusList`, potwierdzone)

| Grupa (`group_id`) | Statusy (ID) |
| --- | --- |
| WejścieZam (62461) | WeryfikacjaZestawu 336493, RozbijZestaw 336509, RozbijamZestaw 336517, RozbityZestaw 336518, Nowe 327861 |
| KontrolaZam (62462) | KontrolaPlatnosci 327862, KP-ZamowieniaOplacone 327863, KP-ZamowieniaNieOplacone 327864, KontrolaVAT 327865, KV-TransakcjePL 327866, KV-TransakcjeOSS 327867, KV-TransakcjeWDT 327868, SkontrolowanoVAT 327870, UwagiKlienta 327872 |
| Nadawanie (62463) | NadajPrzesylke 327881, UtworzonoPrzesylke 332728 |
| TworzenieZam (62464) | TworzZamowienie 327879, BladERP 332591, BladPowiazaniaTowaru 332592, BrakStanuTowaru 327888, Fairy chusteczki 356160, BrakStanu 358793, BrakStanu2 359045 (nazwa ze spacją na końcu), UtworzonoZK 327889 |
| Komplet-WMS (62465) | PrzypiszNumerWMS 334352, DoKompletacji 327890, Skompletowane 327891 |
| Pakowanie (62466) | Pakowanie 327892, Spakowano 327893 |
| Wysyłka (62467) | Wysłane 327896, WTranzycie 327897, Dostarczono 327898, Zwrot 338059, Zwrot Częściowy 358167 (spacja na końcu) |
| TworzDokHan (62468) | TworzParagon 332839, TworzFakture 332840, BladTworzeniaDokumentu 332871, UtworzonoDokumentHandlowy 332841 |
| Proces (62472) | ProcesStatus 327899, Przetworzone 334351, DoWeryfikacji 338082, NoweAllegroKozacka 335627, NoweErli 338048, NoweSklep 338049, NoweInpostFresh 338080, NoweEmpik 338081 |
| Archiwum (63954) | m.in. Nowe zamówienia 165341 (`is_primary`), Anulowane 165344, Wysłane 165343, statusy „nowe” marketplace’ów |
| Inne | Test 357140 (32627); grupa 61988 = statusy przewoźników (Paczkomaty/Kurier InPost, DHL, Poczta Polska, Odbiór osobisty, Czechy, Słowacja) |

Nazwy statusów mogą mieć spacje/tabulatory na końcu — przycinaj (`trim`).

## Metody

### getInventories — potwierdzone
- Parametry: `{}`
- Odpowiedź: `inventories[]` → `inventory_id`, `name`, `languages`, `default_language`, `price_groups[]`, `default_price_group`, `warehouses[]` (ID z prefiksem `bl_` / `shop_` / `warehouse_`), `default_warehouse`, `reservations`, `is_default`

### getInventoryProductsList — potwierdzone
- Parametry: `{"inventory_id": 18840, "filter_ean": "085805268848"}`
- EAN zawsze jako string (zero na początku). Przy pustym wyniku spróbuj wersji 13-cyfrowej z zerem z przodu.
- Odpowiedź: `products` = obiekt kluczowany ID produktu → `id`, `ean`, `asin`, `sku`, `name`, `parent_id`, `stock` (`{"bl_24543": n, "shop_3010600": n}`), `prices` (`{"<grupa>": cena}`)

### getInventoryProductLogs — potwierdzone
- Parametry: `{"product_id": 281918820}` (wymaga ID produktu z BaseLinkera, nie EAN-u). Opcjonalnie `date_from`, `date_to`, `log_type`, `sort`, `page` (z pamięci).
- Odpowiedź: `logs[]` → `time` (unix jako string), `profile`, `entries[]` → `type`, `info`, `from`, `to`
- Typy zaobserwowane:
  - `1` — zmiana stanu; `info` = ID magazynu
  - `2` — zmiana ceny; `info` = ID grupy cenowej
  - `5` — zmiana pola produktu; `info` = `pole|język` (np. `name|pl`, `description|pl`, `weight`, `category_id`)
- Profile zaobserwowane: `Automat`, `Import pliku/sklepu`
- Uwaga na czas: zamieniając timestamp na czas polski, uwzględnij zmianę czasu (CEST/CET).

### getJournalList — potwierdzone
- Parametry: `{"last_log_id": 1, "order_id": 353712167}` lub `{"last_log_id": 1, "logs_types": [18]}` (wszystkie zamówienia) — `last_log_id` musi być ≥ 1 (zwraca wpisy nowsze niż ten numer)
- Odpowiedź: `logs[]` → `log_id`, `log_type`, `order_id`, `object_id`, `date` (unix, liczba)
- Pusta lista = dziennik wyłączony albo brak zdarzeń od włączenia
- Nie podaje, **kto** wywołał zdarzenie ani statusu „z” — tylko nowy status; poprzedni trzeba wziąć z poprzedniego wpisu tego zamówienia
- Typy:
  - `18` = zmiana statusu zamówienia — **potwierdzone** (3095 wpisów, wszystkie `object_id` to ID statusów)
  - `22` = zdarzenie przesyłki — **potwierdzone**, że `object_id` = `package_id` z `getOrderPackages`. Prawdopodobnie zmiana statusu śledzenia; dokładna nazwa typu niepotwierdzona

### getOrders — potwierdzone
- Jedno zamówienie: `{"order_id": 353712167, "get_unconfirmed_orders": true}`
- Lista: `{"status_id": 327888, "get_unconfirmed_orders": false, "date_from": <unix>}`
- Pola zaobserwowane: `order_id`, `order_source`, `order_source_id`, `order_status_id`, `date_add`, `date_confirmed`, `date_in_status` (wejście w obecny status, unix), `admin_comments`, `extra_field_1`, `extra_field_2`, `products[]` → `name`, `ean`, `sku`, `quantity`, `product_id`, `storage` (`db`), `storage_id` (= `inventory_id`), `warehouse_id`
- `custom_extra_fields` wraca `null`, jeśli nie podasz `include_custom_extra_fields: true` (parametr z pamięci — do potwierdzenia)
- Zawiera dane osobowe klienta — do plików zapisuj tylko wybrane pola
- Brak endpointu na same pozycje — sumowanie po EAN po swojej stronie
- Historii statusów nie zwraca — tylko bieżący status i `date_in_status`

### getOrderExtraFields — potwierdzone
- Parametry: `{}`
- Odpowiedź: `extra_fields[]` → `extra_field_id`, `name`, `editor_type` (tabela wyżej)

### getOrderStatusList — potwierdzone
- Parametry: `{}`
- Odpowiedź: `statuses[]` → `id`, `name`, `color`, `group_id`, `is_primary`, `name_for_customer`
- Nazw grup nie zwraca (tylko `group_id`) — nazwy grup z panelu albo `getOrderStatusGroups` (niesprawdzone)

### getOrderPackages — potwierdzone
- Parametry: `{"order_id": 353712167}`
- Odpowiedź: `packages[]` → `package_id`, `courier_package_nr` (numer listu), `courier_inner_number`, `courier_code`, `courier_other_name`, `account_id`, `tracking_status_date` (unix, string), `tracking_delivery_days`, `tracking_status` (string), `package_type`, `tracking_url`, `is_return`
- Jedno zamówienie może mieć kilka przesyłek; kolejne `package_id` (np. 309919064 i 309919065) = utworzone w tym samym momencie
- `tracking_status` (z pamięci, niepotwierdzone): 0 nieznany, 1 etykieta utworzona, 2 nadana, 3 niedostarczona, 4 w doręczeniu, 5 doręczona, 6 zwrot, 7 awizo, 8 czeka w punkcie, 9 zagubiona, 10 anulowana, 11 w drodze

### getOrderPickPackHistory — potwierdzone
- Parametry: `{"order_id": 353712167}`; opcjonalnie `action_type` (1–17)
- Odpowiedź: `history[]` → `action_type`, `profile_id` (imię pracownika, np. „Ela”), `station_id`, `cart_id`, `entry_date` (unix, liczba); kolejność od najnowszego
- Dotyczy tylko modułu kompletacji/pakowania BaseLinkera. Nie pokazuje SellIntegro ani zmian statusów.
- `action_type` (opis z zewnętrznego źródła, częściowo): 1 rezerwacja do zbierania, 2 start zbierania, 5 koniec zbierania, 8 start pakowania, 11 koniec pakowania. Zaobserwowane też 7 i 13 — znaczenie nieznane (7 tuż przed startem pakowania, 13 w tej samej sekundzie co koniec pakowania).
- U nas zamówienie 353712167 ma tylko zdarzenia pakowania (7, 8, 11, 13), brak zbierania (1, 2, 5) → zbieranie odbywa się poza BaseLinkerem (zewnętrzny WMS), pakowanie na stanowisku BaseLinkera.

### Wyszukiwanie zamówień — potwierdzone 06.11.2026
- API **nie szuka** po numerze przesyłki, imieniu, nazwisku, adresie ani kodzie pocztowym. Nieudokumentowane filtry (`filter_delivery_package_nr`, `filter_phone`, `filter_fullname` itd.) są po cichu ignorowane (wraca pełna lista).
- `getOrdersByPhone {"phone"}` — tylko dokładne dopasowanie w formacie z bazy (`+48…`, `+421…`). Bez `+`, bez kierunkowego albo sama końcówka → 0 wyników. Zwraca `order_id`, `order_status_id`, `delivery_fullname`, `delivery_company`, daty.
- `getOrdersByEmail {"email"}` i `getOrders.filter_email` — tylko pełny adres. Allegro daje adresy maskowane (`…@allegromail.pl`).
- `getOrders.filter_external_order_id` — działa (np. ID transakcji Allegro, ID Erli `261105x21790`).
- Stronicowanie `getOrders`: **po `date_confirmed_from`** (kolejna strona od największego `date_confirmed`, deduplikacja po `order_id`). Stronicowanie po `id_from` + `date_from` gubi zamówienia (45 dni: 4387 zamiast 10034).
- Skala (06.11.2026): 45 dni = 10 034 zamówienia, średnio 218/dzień, maks. 513/dzień; 102 wywołania `getOrders`, ok. 2 min przy pauzie 700 ms.

### getOrderPackages — uzupełnienie 06.11.2026
- Zwraca **wszystkie** przesyłki zamówienia, także starsze: 40 ze 146 zamówień w statusach Zwrot/Zwrot Częściowy ma więcej niż jedną przesyłkę (do 4). `getOrders.delivery_package_nr` = tylko ostatnia.
- `courier_inner_number`: dla DHL zwykle = numer listu (czasem `SP…`), dla Allegro UUID, dla InPost/DPD krótki numer wewnętrzny.
- `package_type` 2 zaobserwowany (Poczta Polska przez Allegro). Przesyłki „zwrot do nadawcy” nie pojawiają się jako osobne paczki — zostaje oryginalna, z nowym numerem zwrotnym BL nie zna.
- `tracking_status` 105 — zaobserwowany dla TikTok Shipping (InPost PL) przy przesyłkach wracających do nadawcy; spoza listy 0–11.

### getPackageDetails / getCourierPackagesStatusHistory — potwierdzone
- `getPackageDetails {"package_id"}` → waga, wymiary, pobranie, ubezpieczenie.
- `getCourierPackagesStatusHistory {"package_ids": [..]}` → `packages_history.<id>[]` z `tracking_status_date`, `courier_status_code` (np. `PENDING`, `IN_TRANSIT`, `RELEASED_FOR_DELIVERY`, `ISSUE`), `tracking_status`.

### Moduł zwrotów — potwierdzone 06.11.2026
- `getOrderReturns` (stronicowanie `id_from`, 100/str.): 99 zwrotów od 28.07.2026 — allegro 88, tiktokeu 8, aliexpresspl 3; wszystkie mają `order_id`, 69 ma `delivery_package_nr` (numer przesyłki zwrotnej). Wszystkie w statusie „Nowe”, `fulfillment_status` 5 — moduł jest zasilany automatycznie przez marketplace’y, nikt go ręcznie nie obsługuje.
- Pozycje: `order_product_id` (powiązanie z pozycją zamówienia), `ean`, `quantity`, `status_id`, `return_reason_id`. `reference_number` w formacie Allegro (np. `LR49/2026`).
- Statusy zwrotu (`getOrderReturnStatusList`, grupa 7499): Nowe 33428, Odebrane 33429, W trakcie 33430, Zakończone 33431, Odrzucone 33432 (i dalsze).
- Statusy pozycji (`getOrderReturnProductStatuses`): Brak 20424, Przyjęte 20425, Uszkodzone 20426.
- Powody (`getOrderReturnReasonsList`): od 72217 „Nie wybrano”, 72218 „Pomyłka przy zakupie”, … 72226 „Inna wada”.
- `getOrderReturnExtraFields`: tylko pola 1 i 2.

### getOrderSources — potwierdzone
- personal (0, 40588 base.b2b), shop 3010600, blconnect 7715/7726/7727/7728 (KROLEX — wyjaśnia ID z mapowania VAT SellIntegro), allegro 39095 Drogeria_Kozacka i 39097 kozackadrogeria, inpsa 42979, empik 24397, erli_connector 34062, tiktokeu 46805 i inne.

### Co da się wyczytać z etykiet zwrotów (próbki `docs/referencje/etykiety/`)
- InPost „zwrot do nadawcy”: kod kreskowy = nowy numer zwrotny (nie ma go w BL); oryginalny numer w tekście „Uwagi nadawcy: ZWROT DO NADAWCY DO Paczki: …” — 3/3 próbki znalezione jako `delivery_package_nr` zamówień TikTok.
- DPD (Allegro): `Reference 1` = `order_id`.
- Erli: w uwagach `order_id` i ID Erli (`external_order_id`).
- DHL: numer z etykiety był 3. z 3 przesyłek zamówienia — bez `getOrderPackages` nie do znalezienia.
- Dane klienta na etykietach zwrotnych są zagwiazdkowane, a jako odbiorca widnieje sklep (telefon sklepu).

### Do sprawdzenia
- `getOrders` z `include_custom_extra_fields: true` (pole WMS), `getInventoryWarehouses`, `getExternalStoragesList`, `getInventoryProductsStock`
- Czy numer zwrotny z etykiety Allegro odpowiada `getOrderReturns.delivery_package_nr`

## Kody błędów

| Kod | Przyczyna |
| --- | --- |
| `ERROR_PARSE_JSON_PARAMETERS` | niepoprawny JSON (np. placeholder zamiast liczby, krzywe cudzysłowy, przecinek na końcu) |
| `ERROR_STORAGE_ID` | zły `inventory_id` (np. ID magazynu albo przykładowa liczba) lub stara metoda „storage” |
| `ERROR_BAD_PARAMETERS` | np. `last_log_id` = 0 |

## Panel (to, czego API nie pokazuje)

- Historia statusów zamówienia (na dole strony zamówienia) pokazuje, **kto** zmienił status: `Automat`, `API`, nazwa użytkownika. API tego nie zwraca. Przy „API” nie widać, która aplikacja.
- Sekcja „Historia zmian w zamówieniu” — zmiany pól zamówienia.
- Lista reguł akcji automatycznych — tylko w panelu, API jej nie udostępnia.
- Którą aplikację kryje „API”, ustala się przez porównanie godzin z logami SellIntegro / WMS albo z datą utworzenia dokumentu w WAPRO.

## Przepływ statusów (z dziennika 26.10 18:07 – 27.10 12:42, 467 zamówień, 3095 zmian)

Główna ścieżka i rytm przejść:

| Przejście | Liczba | Czas | Rytm / kto (wniosek) |
| --- | --- | --- | --- |
| WeryfikacjaZestawu → Nowe | 128 | ~2 min | cykl co 2 min |
| Nowe → KontrolaPlatnosci → KP-ZamowieniaOplacone → KontrolaVAT → KV-TransakcjePL/OSS → SkontrolowanoVAT → NadajPrzesylke → UtworzonoPrzesylke | ~120–130 | 0–1 s | natychmiast, łańcuch akcji automatycznych |
| UtworzonoPrzesylke → TworzZamowienie | 140 | ~2 min | cykl co 2 min |
| TworzZamowienie → UtworzonoZK | 145 | ~9 s | integracja ERP (SellIntegro) |
| TworzZamowienie → BrakStanuTowaru | 17 | ~10 s | integracja ERP |
| UtworzonoZK → PrzypiszNumerWMS | 166 | 0 s | natychmiast (akcja automatyczna) |
| BrakStanuTowaru → PrzypiszNumerWMS | 13 | 1–14 min (mediana 8) | nieregularnie, osobny proces przez API — **problem** |
| PrzypiszNumerWMS → DoKompletacji | 153 | ~4 min | cron co 5 min (xx:x1:52 / xx:x6:52) — WMS |
| DoKompletacji → Skompletowane | 67 | ~8 h | ludzie, od 6:00 |
| DoKompletacji → BrakStanu2 | 14 | ~10 h | masowo o 07:15:01 (12 zam.), 12:09:22 (4), 10:45:11 (1) |
| Skompletowane → Pakowanie | 214 | 0 s | natychmiast |
| Pakowanie → Spakowano | 183 | ~2 h | ludzie (stanowisko pakowania BaseLinkera) |
| Spakowano → UtworzonoDokumentHandlowy | 265 | 0 s | natychmiast |
| UtworzonoDokumentHandlowy → Wysłane | 103 | ~22 min | |

Dokument dla osób spoza projektu z osią czasu 13 zamówień: „BrakStanuTowaru omija blokadę: kto przestawia statusy” (Docs, 27.10.2026).

## Obserwacje

- **Stany (26.10.2026):** BaseLinker nie liczy stanów sam, odbija stan magazynu sklepu `shop_3010600`. Produkt 281918820 (EAN 085805268848): ok. 420 szt. do 23.10, potem w piątek 23.10 12:23–15:39 skoki 398/464/494/998, od 15:39 stan 998 → sztuczny. Ceny codziennie ok. 6:05 obniża „Import pliku/sklepu”, a „Automat” przywraca.
- **BrakStanuTowaru jest omijany (27.10.2026):** z 17 zamówień z BrakStanuTowaru 13 trafiło do PrzypiszNumerWMS → DoKompletacji bez UtworzonoZK, 1 po ponownym TworzZamowienie dostało UtworzonoZK, 3 (26.10 21:26–21:32) zostały w BrakStanuTowaru. Prawie wszystkie z tych 13 wróciły potem z DoKompletacji do BrakStanu2. Do ustalenia: który proces API przestawia BrakStanuTowaru → PrzypiszNumerWMS i czy te zamówienia mają dokument ZO w WAPRO (`extra_field_1`).
- **Statusy (zamówienie 353711742):** ten sam wzorzec: TworzZamowienie → BrakStanuTowaru (API) → PrzypiszNumerWMS (API) → DoKompletacji; powtórzony po ręcznym ponownym puszczeniu. Przesyłka powstaje przed sprawdzeniem stanu w WAPRO.
- **Zamówienie 353712167 (27.10.2026):** Erli, dodane 24.10 22:09, potwierdzone 22:10. W WAPRO istnieje dokument `ZO 32805/26/K` (`extra_field_1`). Komentarz admina „26.10 wypisano na braki”. Pakowanie 26.10: 14:52:49 (7), 14:52:53 start (8), 14:55:50 koniec (11, 13) — „Ela”, stanowisko 33522. Obecnie WTranzycie od 26.10 16:55. Brak zmian statusu w dzienniku (były przed jego włączeniem). Dwie przesyłki InPost o kolejnych ID (utworzone razem): 309919064 — `tracking_status` 1, 26.10 14:56:03 (13 s po końcu pakowania); 309919065 — `tracking_status` 4, 27.10 07:24 (4 wpisy typu 22). Druga etykieta może być duplikatem.
