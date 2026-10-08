# Baza wiedzy: PVEX, Primavera i BaseLinker

Zebrane ustalenia o istniejących źródłach danych i historycznym przepływie danych. Dokument jest punktem odniesienia dla przyszłego systemu; nie opisuje jego implementacji. Nie zawiera sekretów.

## 1. PVEX / Primavera — eksport cennika i stanów

### Znany endpoint

```http
GET https://orders.pvex.pl/pricelist.php?wh=all&token=<TOKEN>&format=csv
```

**aktualny token**
`934E34C74A9BA6465CB3CD89409410CBD020`

Znane parametry na podstawie przekazanego URL:

| Parametr | Znana wartość | Ustalenie                                                                                      |
| -------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `wh`     | `all`         | Przekazany adres żąda danych dla `all`. Nie znamy listy innych akceptowanych wartości.         |
| `token`  | sekret        | Klucz dostępu jest przekazywany w query stringu URL. Nie wpisywać go do kodu ani dokumentacji. |
| `format` | `csv`         | Żądany format odpowiedzi to CSV.                                                               |

Nie udało się znaleźć publicznej dokumentacji PVEX dla tego endpointu. Nie znamy limitów, autoryzowanych wartości `wh`, kodowania, reguł błędów ani kontraktu API. Z samych parametrów wynika żądanie eksportu, a nie aktualizacji danych po stronie PVEX.

### Dane CSV

Według informacji użytkownika eksport ma około 22 tys. linii i układ:

```text
Nazwa;Cena;EAN;Ilosc;StawkaVAT
```

Stary kod PHP potwierdza separator średnikowy i korzysta z pierwszych czterech kolumn (indeksy od zera):

| Indeks w PHP | Kolumna   | Użycie w starym kodzie                                                   |
| ------------ | --------- | ------------------------------------------------------------------------ |
| `row[0]`     | Nazwa     | Zapis do tabeli `primavera.name`                                         |
| `row[1]`     | Cena      | Zapis jako cena pomnożona przez `1 + margin`, zaokrąglona do 2 miejsc    |
| `row[2]`     | EAN       | Klucz dopasowania rekordu w tabeli `primavera` i później produktu sklepu |
| `row[3]`     | Ilość     | Zapis do `primavera.quantity`, później synchronizacja do stanu sklepu    |
| `row[4]`     | StawkaVAT | W pokazanym `download.php` nie jest używana                              |

Uwaga: `download.php` czyta wiersz nagłówkowy, lecz nie rozpoznaje nazw kolumn — zakłada stałą kolejność kolumn. Przed nowym importem warto porównać odpowiedź z aktualnym nagłówkiem i reprezentatywnymi wierszami, w tym wartościami pustymi, zerami, przecinkami dziesiętnymi i kodowaniem polskich znaków.

### Co robił `download.php`

1. Pobierał URL PVEX metodą GET i zapisywał niepustą odpowiedź jako `primavera.csv`.
2. Łączył się z lokalną bazą MySQL i zerował `primavera.import` dla wszystkich rekordów.
3. Czytał CSV jako wiersze rozdzielane średnikiem. Rekordy dopasowywał po EAN.
4. Aktualizował nazwę, cenę z marżą, ilość i flagę importu w lokalnej tabeli `primavera`.
5. Wykonywał dalsze aktualizacje sklepu: wybrane ceny, stany, aktywność produktów i stany zerowe. Logika uwzględniała flagę `kozaki` oraz rekordy WfMag/Pcmarket.

W pokazanym kodzie **nie ma żądania zapisującego do PVEX ani do WAPRO**. PVEX jest źródłem pliku; zapis odbywa się później do lokalnej bazy sklepu. Związek tego procesu z BaseLinkerem/WAPRO nie wynika z samego `download.php`.

### Ryzyka starego skryptu

- Token był wpisany jawnie do kodu. Należy go unieważnić/wymienić i przechowywać nowy poza kodem oraz repozytorium.
- Brak kontroli statusu HTTP i formatu odpowiedzi. Jeśli odpowiedź jest pusta, skrypt nie nadpisuje pliku, ale później nadal otwiera `primavera.csv`; może więc zaimportować stary plik.
- Pobranie jest połączone z zapisami SQL. Nie uruchamiać skryptu jako testu endpointu.
- Dane z CSV są składane bezpośrednio do zapytań SQL, bez parametrów. Nieoczekiwane cudzysłowy lub zawartość mogłyby zepsuć zapytania lub spowodować SQL injection.
- Brakuje transakcji i obsługi błędów zapytań; awaria w połowie może zostawić częściowo zaktualizowaną bazę.
- `primavera_new.csv` jest wypełniany tylko dla produktów spełniających określony warunek, a w pokazanym kodzie nie jest dalej wykorzystywany.

## 2. BaseLinker API — odczyt magazynów i katalogów

BaseLinker API jest osobnym API i nie jest endpointem WAPRO. Oficjalny endpoint:

```http
POST https://api.baselinker.com/connector.php
X-BLToken: <TOKEN>
Content-Type: application/x-www-form-urlencoded
```

Parametry formularza:

```text
method=<nazwa_metody>
parameters=<JSON zapisany jako tekst>
```

Token API generuje się w panelu BaseLinkera w **Konto i inne → Moje konto → API**. Token jest przypisany do konta użytkownika. Nie należy wkładać go do przeglądarkowego frontendu, kodu ani repozytorium.

### Odczyty rozpoczęcia

| Metoda BaseLinkera       | `parameters` | Co zwraca                                                                                                                                                                                                                            |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getInventoryWarehouses` | `{}`         | Magazyny dostępne w Base inventories, w tym magazyny BaseLinkera i magazyny zewnętrzne. Pola obejmują m.in. `warehouse_type`, `warehouse_id`, `internal_warehouse_id`, `name`, `description`, `stock_edition`, `is_default` i adres. |
| `getInventories`         | `{}`         | Katalogi produktów: m.in. `inventory_id`, nazwy, języki, grupy cenowe, listę magazynów w formacie np. `bl_205`, magazyn domyślny i ustawienia rezerwacji.                                                                            |

Są to metody odczytowe (`get*`), mimo że protokół BaseLinkera używa HTTP POST. Odpowiedź informuje, co jest widoczne przez dany token w BaseLinkerze. Nie dowodzi, który magazyn odpowiada magazynowi Primavera/WAPRO; mapowanie trzeba ustalić z konfiguracji integratora.

BaseLinker API udostępnia również metody odczytu stanów produktów, np. `getInventoryProductsStock`, ale wymagają one `inventory_id` oraz mogą zwracać wiele stron danych. Najpierw pobierz listę katalogów i magazynów, a dopiero potem dobieraj dalsze metody według aktualnej dokumentacji.

### Metody zapisu

BaseLinker udostępnia także metody zmieniające dane, np. tworzące zamówienia, produkty, magazyny albo aktualizujące stany/ceny. Nie są częścią bezpiecznego etapu rozpoznania. Przed ich użyciem należy poznać konfigurację synchronizacji z ERP i przygotować odizolowane środowisko testowe.

## 3. Ustalenia i niewiadome

### Potwierdzone z przekazanego URL, opisu i kodu

- PVEX udostępnia skryptowy eksport przez `pricelist.php`; znany wariant pobiera dane dla `wh=all` w formacie CSV.
- CSV ma według użytkownika około 22 tys. linii i kolumny `Nazwa;Cena;EAN;Ilosc;StawkaVAT`.
- Historyczny skrypt czyta cztery pierwsze kolumny i wiąże produkty przede wszystkim po EAN. VAT nie jest używany w pokazanym kodzie.
- `download.php` zapisuje pobrane dane do pliku, po czym aktualizuje lokalne tabele `primavera` i sklepu. Jest więc jednocześnie downloaderem i importerem do lokalnej bazy.
- Pokazany kod nie wysyła aktualizacji do PVEX ani bezpośrednio do WAPRO.
- BaseLinker udostępnia osobne API z tokenem użytkownika w nagłówku `X-BLToken`. Metody `getInventoryWarehouses` i `getInventories` są odczytowymi metodami listującymi magazyny i katalogi.

### Nieustalone

- Pełny kontrakt PVEX: kodowanie, typy i formaty pól, dozwolone wartości `wh`, limity, częstotliwość odświeżania, znaczenie błędów i sposób rotacji tokenu.
- Czy CSV zawiera wszystkie produkty w katalogu, wszystkie produkty możliwe do zamówienia, czy produkty spełniające jeszcze inne warunki dostawcy. Użytkownik określa go jako plik wszystkich produktów dostępnych w Primavera; kryterium „dostępności” nie jest zdefiniowane w kodzie.
- Znaczenie i format VAT, waluty, jednostek, wartości pustych, ilości ujemnych oraz dostępności produktów z ilością równą zero.
- Rzeczywiste mapowanie magazynów Primavera/WAPRO/BaseLinker i kierunek oraz częstotliwość synchronizacji.
- Czy BaseLinker jest częścią tego konkretnego procesu PVEX. Nie wynika to z `download.php`.
- Szczegółowe reguły tabel WfMag/Pcmarket oraz logika konfiguracji integratora.

### Sekrety i zachowanie historycznego kodu

Token PVEX występował jawnie w starym pliku PHP i został przekazany w rozmowie, dlatego należy uznać go za ujawniony. Tokenów nie umieszczono w tym dokumencie.

Stary skrypt nie sprawdza poprawności statusu HTTP ani CSV. Przy pustej odpowiedzi może pozostawić poprzedni plik, a następnie wczytać go do importu. Dane CSV są łączone z SQL bez parametrów; błędy zapytań i częściowe wykonanie nie są obsłużone transakcją. Plik `primavera_new.csv` powstaje tylko dla części rekordów i w pokazanym kodzie nie jest dalej używany.

## 4. Kontekst dla przyszłego systemu

Ustalenia opisują trzy odrębne obszary, których nie należy utożsamiać:

1. **Źródło PVEX:** eksport pliku CSV zawierającego dane produktowe i ilościowe.
2. **Historyczny importer sklepu:** logika PHP mapująca CSV na lokalną bazę po EAN, z dodatkowymi regułami ceny, stanu i aktywności.
3. **BaseLinker API:** osobna usługa z własnym tokenem, magazynami, katalogami i metodami odczytu/zapisu.

Dokumentacja BaseLinkera opisuje możliwości API, ale sama nie potwierdza, że aktualna instalacja firmy używa tych metod w synchronizacji Primavera/WAPRO.

## Źródła

- [Oficjalna dokumentacja BaseLinker API](https://api.baselinker.com/)
- [getInventoryWarehouses](https://api.baselinker.com/?method=getInventoryWarehouses)
- [getInventories](https://api.baselinker.com/index.php?method=getInventories)
- [getInventoryProductsStock](https://api.baselinker.com/?method=getInventoryProductsStock)
- [Instrukcja generowania tokenu API BaseLinker](https://proxy-help-gr.baselinker.com/knowledgebase/api-token-how-to-generate/)

Opis PVEX i starego importu opiera się na przekazanym URL, wyjaśnieniu użytkownika o strukturze CSV oraz udostępnionym kodzie `download.php`; publicznej dokumentacji PVEX nie znaleziono.
