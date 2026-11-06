# Mapa struktury bazy WAPRO Mag — Kozacka Drogeria

Ostatnia aktualizacja: 05.11.2026 11:45

> **Zasady dla Claude (obowiązują w każdej rozmowie w tym projekcie):**
> 1. **Najpierw czytaj ten dokument.** Zanim zaproponujesz zapytanie badające strukturę (INFORMATION_SCHEMA, sys.*), sprawdź tu, czy tabela/kolumna/relacja jest już opisana. Nie szukaj drugi raz tego, co już potwierdzone.
> 2. **Aktualizuj ten dokument od razu**, gdy cokolwiek sprawdzamy w bazie albo robimy na niej zmiany: nowe tabele, kolumny, relacje, znaczenie wartości, zapytania, które zadziałały, pułapki, a przy zmianach danych — co, kiedy, ile wierszy i jak cofnąć. Nie czekaj na prośbę.
> 3. Nie wpisuj loginów, haseł ani danych osobowych kontrahentów.
> 4. Oznaczaj: **[POTWIERDZONE]** (wynik z bazy), **[HIPOTEZA]**, **[Z DOKUMENTACJI]**.
> 5. Praca w konsoli SQL WAPRO idzie na koncie sysadmin — domyślnie tylko `SELECT`. Zmiany danych wyłącznie w transakcji, po kopii zmienianych wartości, po akceptacji Mateusza.
> 6. Wyniki zapytań interpretuj dosłownie i nie zakładaj, że „puste” znaczy „brak” — jeśli wynik jest niejednoznaczny, poproś o screen. (Błąd z 05.11.2026: uznano triggery na `KONTRAHENT` za nieistniejące, a było ich 19.)
> 7. **Zapytania dla Mateusza dawaj po jednym, ponumerowane („Blok N”), i czekaj na pełny wynik przed następnym.** Mateusz wkleja po jednym screenie na zapytanie.
> 8. Nie zostawiaj otwartej transakcji do ręcznego `COMMIT` — blokuje `KONTRAHENT` i integrację zamówień. Skrypty zmieniające dane mają same zatwierdzać lub cofać (kontrola `@@ROWCOUNT`).
> 9. Konfiguracja integratora zamówień (SellIntegro) jest opisana osobno w `sellintegro-konfiguracja.md` — czytaj go przy problemach z zamówieniami, kontrahentami i towarami z BaseLinkera.

## Środowisko

- WAPRO Mag 9.1x, SQL Server. Konsola SQL wbudowana w WAPRO (Admin) działa na koncie aplikacji z rolą sysadmin. [POTWIERDZONE]
- Baza z danymi sklepu: **KROLEX**. Na serwerze są też: KOZAK, KROLEX2014, KROLEX2017, KROLEXanalityka, MAGMOBILE, WAPROJPK, WAPRO_UPDATE, TEST. [POTWIERDZONE, rozpoznanie 07–08.10.2026]
- Wiele tysięcy obiektów producenta (prefiksy `Api_`, `WAPROERP_`, `AP_`, `RM_`, `RODO_`, `KSEF_`, `MAGGEN_`, `WFM_`, `A4BVIEW_`). Nie ruszać. [POTWIERDZONE]
- Obiekty o prefiksie **`yfi_`** nie są nazwami producenta WAPRO — **[HIPOTEZA]** dopisane przez integratora/firmę (bufor zmian).
- Obiekty o prefiksie **`ZZ_`** — nasze tabele robocze (kopie zapasowe), do usunięcia po zakończeniu prac.
- Brak kluczy obcych na tabelach klasyfikacji — relacje wykrywamy po nazwach kolumn, nie przez `sys.foreign_keys`. [POTWIERDZONE 05.11.2026]
- Wersja programu aktualizuje się sama (np. 31.08 i 05.10.2026) — po aktualizacji nazwy obiektów mogą się zmienić.
- Konsola SQL pokazuje jeden wynik naraz — wynik skryptu zbierać do zmiennej tabelarycznej `@log` i wyświetlić jednym `SELECT` na końcu (zmienna tabelaryczna przeżywa `ROLLBACK`).
- SQL Server: nie wolno używać podzapytania wewnątrz funkcji agregującej (`SUM(CASE WHEN ... EXISTS (...))`) — użyć `LEFT JOIN`.
- Zamówienia z BaseLinkera wprowadza do WAPRO integrator SellIntegro (szczegóły: `sellintegro-konfiguracja.md`): dokument ZO w głównym rejestrze z rezerwacją, magazyn KROLEX, towary dopasowywane po kodzie kreskowym (EAN, potem SKU → domyślny kod kreskowy), kontrahenci tworzeni/wiązani po NIP, potem Email. [POTWIERDZONE w panelu 05.11.2026]

## Tabele

### `ARTYKUL` [POTWIERDZONE]
`ID_ARTYKULU`, `ID_MAGAZYNU`, `NAZWA`, `STAN`, `ZAMOWIONO`, `DO_REZERWACJI`, `ZAREZERWOWANO`, `INDEKS_KATALOGOWY`, `INDEKS_HANDLOWY`, `KOD_KRESKOWY`, `STAN_MINIMALNY`, `STAN_MAKSYMALNY` i inne. Artykuł może mieć osobny wiersz na magazyn.

### `KOD_KRESKOWY` (kody dodatkowe) [POTWIERDZONE]
`ID_MAGAZYNU`, `KOD_KRESKOWY`, `ID_ARTYKULU`, `ID_JEDNOSTKI`, `DOM_ILOSC`, `ID_KODU_KRESKOWEGO`. Dopasowanie EAN = sprawdzić obie tabele.

### `ZAMOWIENIE` [POTWIERDZONE]
`ID_ZAMOWIENIA`, `ID_KONTRAHENTA`, `ID_FIRMY`, `ID_MAGAZYNU`, `NUMER` (format `ZO nnnnn/26/K`), `NR_ZAMOWIENIA_KLIENTA`, `ZAMOWIENIE_INTERNETOWE`, `ZAMOWIENIE_INTERNETOWE_ID`, `STAN_REALIZ`, `FLAGA_STANU`, `KONTRAHENT_NAZWA` (dane osobowe), `NUMER_PRZESYLKI` i inne.

### `KONTRAHENT` — znane kolumny [POTWIERDZONE]
| Kolumna | Typ | Null | Uwagi |
| --- | --- | --- | --- |
| `ID_KONTRAHENTA` | numeric | | klucz; najwyższe ID 108780 (05.11.2026 10:37) |
| `NAZWA` | | | |
| `ID_KLASYFIKACJI` | numeric | tak | wskazuje `KLASYFIKACJA_KONTRAHENTA.ID_KLASYFIKACJI` (bez FK) — pole „Klasyfikacja” w programie |
| `ID_GRUPY` | numeric | tak | **[HIPOTEZA]** „Grupa (ceny)” |
| `GRUPA_VAT` | tinyint | tak | |
| `SEMAFOR`, `FLAGA_STANU`, `DOSTEPNY_W_B2B`, `ID_RACHUNKU`, `ID_MIEJSCA_DOSTAWY_DOM`, `POLE1`…`POLE10` | | | występują w kodzie triggerów; typy niezbadane |

Nr kontrahenta w UI = prawdopodobnie `ID_KONTRAHENTA` (np. 63329) **[HIPOTEZA]**.

#### Triggery na `dbo.KONTRAHENT`: 19, wszystkie włączone, żaden `INSTEAD OF` [POTWIERDZONE 05.11.2026]

| Zdarzenie | Trigger | Definicja |
| --- | --- | --- |
| UPDATE | `tu3_KONTRAHENT_WFM_INT_KONTRAHENT` | jawna — przeanalizowana niżej |
| UPDATE | `tu3_KONTRAHENT_POLA_DOD_WFM_INT_KONTRAHENT_POLA_DOD` | jawna — nie zadziała przy zmianie samej klasyfikacji |
| INSERT + UPDATE | `yfi_tKontrahent_InsertUpdate` | jawna — przeanalizowana niżej |
| UPDATE | `tu3_kontrahent`, `tuw_kontrahent`, `tuwr_kontrahent_FAKIR`, `tuwr_kontrahent_mag`, `tux_RODO_KONTRAHENT` | **zaszyfrowane** — test na 1 rekordzie nie wykazał zapisu do innych tabel |
| INSERT | `ti3_KONTRAHENT_WFM_INT_KONTRAHENT`, `ti3_KONTRAHENT_POLA_DOD_WFM_INT_KONTRAHENT_POLA_DOD` (jawne), `ti3_kontrahent`, `tiw_kontrahent`, `tix_RODO_KONTRAHENT` (zaszyfrowane) | |
| DELETE | `td3_kontrahent_notatka`, `td3_KONTRAHENT_POLA_DOD_WFM_INT_KONTRAHENT_POLA_DOD`, `td3_KONTRAHENT_WFM_INT_KONTRAHENT` (jawne), `td3_kontrahent`, `tdw_kontrahent`, `tdw2_kontrahent`, `tdw3_kontrahent`, `tdx_RODO_KONTRAHENT` (zaszyfrowane) | |

**`tu3_KONTRAHENT_POLA_DOD_...`** [kod]: działa tylko przy `UPDATE(POLE1…POLE10)`. `UPDATE` samego `ID_KLASYFIKACJI` jej nie uruchamia.

**`tu3_KONTRAHENT_WFM_INT_KONTRAHENT`** [kod]: przy `UPDATE` bez `SEMAFOR` w SET, dla wierszy `WFM_INT_KONTRAHENT` z `SEMAFOR IS NULL` i `StatusObiektu < 1` ustawia `DataZmiany = getdate()` i **`StatusObiektu = 2`**. **Potwierdzone testem:** zmiana klasyfikacji kontrahenta przestawia status 0 → 2.

**`yfi_tKontrahent_InsertUpdate`** [kod]: `AFTER INSERT, UPDATE`; dla kontrahenta, którego nie ma w `dbo.yfi_ChangeBuffer` (`cb_ObjectType = 210`), wstawia `(210, ID_KONTRAHENTA, 0, 0, '', 0)`. **Potwierdzone testem.**

### `yfi_ChangeBuffer` — bufor zmian (obiekt dodatkowy, nie producenta WAPRO) [POTWIERDZONE struktura, wnioski HIPOTEZA]
Kolumny: `cb_ObjectType`, `cb_ObjectId`, `cb_ObjectId2`, `cb_ObjectId3`, `cb_ObjectCode`, `cb_State`.

Zawartość (05.11.2026 10:48, przed naszą zmianą): wszystkie wpisy `cb_State = 0`. Typy: 101 — 96 448; 120 — 522; **210 (kontrahent) — 102 527**; 310 — 260 520; 603 — 22 761 (znaczenie typów poza 210 nieznane).

Wnioski [HIPOTEZA]: wpisów typu 210 jest ~tyle, ile kontrahentów, wszystkie w stanie 0, nikt ich nie czyści → bufor jest dziennikiem zmian lub nieprzetwarzanym. Z 413 kontrahentów bez klasyfikacji (10:49) 407 miało wpis, **6 nie** — w tym najstarszy bez klasyfikacji (ID 59537); przyczyna nieznana.

### Tabele integracji WFM
- `WFM_INT_KONTRAHENT`: `Id_Obiektu` (= `ID_KONTRAHENTA`), `Id_Systemu`, `StatusObiektu`, `DataZmiany`, `Id_ObiektuDupl`, `Id_ObiektuPom1`. Dla kontrahentów bez klasyfikacji (10:44): system 57 — 410 ze statusem 0, 2 ze statusem 1. Znaczenie statusu **[HIPOTEZA]**: 0 = bez zmian, 1 = nowy, 2 = zmieniony (zgodne z testem).
- `WFM_INT_SYSTEM_TABLICE`: `Id_Tablicy`, `NazwaTablicy`, `Id_Systemu`, `SUBSYSTEM`. Dla kontrahentów: `Id_Tablicy 1967`, `KONTRAHENT`, **`Id_Systemu 57`** [POTWIERDZONE].
- `WFM_INT_SYSTEM`: kolumny `Id_Systemu`, `Opis`, `Aktywny`. Wpis: **57 = `ABSM`, `Aktywny = 1`** [POTWIERDZONE]. Czym jest `ABSM` — **nieustalone** (przypuszczenie, bez dowodu: mobilna aplikacja producenta; wyszukiwanie w sieci nic nie dało). Decyzja Mateusza 05.11.2026: ignorujemy. Przy okazji można zapytać administratora, czym jest ABSM.
- `WFM_INT_KONTRAHENT_POLA_DOD`, `WFM_INT_RACHUNEK_KONTRAHENTA`, `WFM_INT_MIEJSCE_DOSTAWY` — kolejki podobnego typu (z kodu).

### `KLASYFIKACJA_KONTRAHENTA` — słownik klasyfikacji [POTWIERDZONE]
| Kolumna | Typ | Null | Uwagi |
| --- | --- | --- | --- |
| `ID_KLASYFIKACJI` | numeric | NIE | klucz główny (hipoteza) |
| `ID_FIRMY` | numeric | tak | |
| `NAZWA` | varchar | NIE | nazwa z okna |
| `OPIS` | varchar | tak | |
| `KONTO_FK` | varchar | tak | konto księgowe |
| `ANALITYKA_KONTRAHENTA` | tinyint | tak | |
| `LAST_MODIFIED` | datetime | NIE | |
| `DOMYSLNA` | tinyint | tak | **= pole „Domyślna dla dodawanych kontrahentów” w oknie Edycja klasyfikacji kontrahenta** (potwierdzone 05.11.2026: zaznaczenie w programie → `DOMYSLNA = 1`). Wygląda na jedną domyślną naraz (hipoteza). |

Zawartość słownika i liczba kontrahentów [POTWIERDZONE 05.11.2026 ok. 10:24, przed naprawą]:

| ID | NAZWA | Kontrahentów | DOMYSLNA (od 11:05) |
| --- | --- | --- | --- |
| 7 | WSZYSCY KONTRAHENCI | 2369 | 0 |
| 15 | SEZAMEK | 20 | 0 |
| 16 | MICHAŁ | 414 | 0 |
| 17 | OLA | 253 | 0 |
| 18 | RADEK | 363 | 0 |
| 19 | HURTOWNIA | 845 | 0 |
| **20** | **INTERNET** | **97 845** (po naprawie ok. +413) | **1** |
| 21 | POKUSA | 0 | 0 |
| 22 | MAGAZYNY | 0 | 0 |
| 23 | SZYMON | 0 | 0 |
| 25 | KUPIEC | 18 | 0 |
| 26 | RABAT | 5 | 0 |
| 27 | EWELINA | 0 | 0 |
| — | brak (`NULL`) | 407 (po naprawie 0) | |

(ID 24 nie występuje — luka w numeracji. Przed 11:05 wszystkie `DOMYSLNA` = 0.)

### `KLASYFIK` — NIE klasyfikacja kontrahentów [POTWIERDZONE kolumny]
`NRKLASYF` (varchar, NOT NULL), `PRNT`, `NAZWA`, `STAWKA` (decimal), `POZIOM` (int). **[HIPOTEZA]** słownik towarowy (PKWiU/PKOB) ze stawką VAT. Pomijamy.

### Inne obiekty z „KLASYF” w nazwie (nie ruszać)
- `A4BVIEW_KLASYFIKACJA_KONTRAHENTA` (widok), `WFM_INT_KLASYFIKACJA_KONTRAHENTA` i `..._PRZETWARZANIE` (integracja WFM).
- `KLASYFIKATOR_*`, `GRUPA_KLASYFIKATOR_TABELA`, `MAG_KLASYFIKATOR_ATRYBUTY_ARTYKULU` — osobny mechanizm klasyfikatorów/atrybutów **[HIPOTEZA]**.
- `ROZRACHUNEK_KLASYFIKACJA` — rozrachunki, raczej niezwiązane.

### `ZZ_BACKUP_KONTRAHENT_KLASYFIKACJA_20261105` — nasza kopia zapasowa [POTWIERDZONE]
Utworzona 05.11.2026 ~11:00. Kolumny: `ID_KONTRAHENTA`, `ID_KLASYFIKACJI` (wszędzie `NULL` — stan sprzed zmiany), `data_kopii`. **414 wierszy.** Tylko ID (bez danych osobowych). Do usunięcia po kilku dniach, gdy zmiana potwierdzi się jako OK (`DROP TABLE dbo.ZZ_BACKUP_KONTRAHENT_KLASYFIKACJA_20261105;`).

## Zmiana w danych: kontrahenci bez klasyfikacji → INTERNET (05.11.2026)

**Wykonana 05.11.2026 ok. 11:02** (jedna transakcja z automatycznym zatwierdzeniem) [POTWIERDZONE]:
- do kopii dopisano 0 nowych; oczekiwana liczba zmian 413; **`UPDATE` zmienił 413 wierszy** (`ID_KLASYFIKACJI NULL → 20`); **ZATWIERDZONO**.
- po zmianie: z 414 z kopii **414 ma klasyfikację 20** (jeden dostał ją sam w międzyczasie); bez klasyfikacji w bazie: **0**.
- Skutki uboczne (oczekiwane): ~413 wierszy `WFM_INT_KONTRAHENT` systemu 57 przestawionych 0 → 2; do 6 nowych wpisów w `yfi_ChangeBuffer`.

**Ustawienie domyślnej (05.11.2026 11:05):** w programie (Klasyfikacje kontrahentów → INTERNET → Popraw) zaznaczono „Domyślna dla dodawanych kontrahentów”; potwierdzone w bazie: INTERNET `DOMYSLNA = 1`, reszta 0.

**Jak cofnąć** (tylko jeśli będzie potrzeba; uruchomi te same triggery ponownie):
```sql
UPDATE k SET ID_KLASYFIKACJI = NULL
FROM dbo.KONTRAHENT k
JOIN dbo.ZZ_BACKUP_KONTRAHENT_KLASYFIKACJA_20261105 b ON b.ID_KONTRAHENTA = k.ID_KONTRAHENTA
WHERE k.ID_KLASYFIKACJI = 20;
```
(Uwaga: dotyczy też tego jednego kontrahenta, który dostał 20 sam.) Flagę domyślnej cofa się w programie, odznaczając pole.

**Wniosek o przyczynie [HIPOTEZA]:** liczba kontrahentów bez klasyfikacji rosła w ciągu godziny (407 → 413), więc nowi powstawali stale bez klasyfikacji — prawdopodobnie przez integrację zamówień internetowych (SellIntegro tworzy kontrahentów, gdy nie znajdzie po NIP/Email; w widocznej części jego konfiguracji nie ma ustawienia klasyfikacji — „Opcje zaawansowane” nie sprawdzone), która mogła pomijać flagę domyślnej (bo żadna nie była ustawiona). Nieznane, czy integracja po ustawieniu flagi będzie ją respektować.

**Do zrobienia (kontrola):** po kilku godzinach / następnego dnia po nowych zamówieniach policzyć kontrahentów z `ID_KLASYFIKACJI IS NULL` (zapytanie „kontrahenci bez klasyfikacji” niżej; nowi mają ID > 108780). Jeśli dalej przybywają — flaga nie działa na integrację; wtedy sprawdzić „Opcje zaawansowane” w pkt 18 konfiguracji SellIntegro, zapytać dostawcę integracji lub poprawiać okresowo tym samym skryptem. Po potwierdzeniu — usunąć tabelę `ZZ_BACKUP_...`.

## Zapytania sprawdzone [OK]

```sql
SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%KLASYF%';

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('KLASYFIKACJA_KONTRAHENTA', 'KLASYFIK')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'KONTRAHENT' AND (COLUMN_NAME LIKE '%KLASYF%' OR COLUMN_NAME LIKE '%GRUP%');

-- triggery: nazwa, zdarzenie, INSTEAD OF, czy definicja jawna
SELECT t.name, te.type_desc AS zdarzenie, t.is_instead_of_trigger,
       CASE WHEN OBJECT_DEFINITION(t.object_id) IS NULL THEN 'zaszyfrowany' ELSE 'jawny' END AS definicja
FROM sys.triggers t JOIN sys.trigger_events te ON te.object_id = t.object_id
WHERE t.parent_id = OBJECT_ID('dbo.KONTRAHENT') ORDER BY te.type_desc, t.name;

-- kod triggera (jawne)
SELECT t.name, OBJECT_DEFINITION(t.object_id) AS kod FROM sys.triggers t
WHERE t.parent_id = OBJECT_ID('dbo.KONTRAHENT') AND t.name IN ('...');

SELECT ID_KLASYFIKACJI, NAZWA, DOMYSLNA FROM dbo.KLASYFIKACJA_KONTRAHENTA ORDER BY DOMYSLNA DESC, NAZWA;

SELECT k.ID_KLASYFIKACJI, kl.NAZWA AS klasyfikacja, COUNT(*) AS liczba
FROM dbo.KONTRAHENT k
LEFT JOIN dbo.KLASYFIKACJA_KONTRAHENTA kl ON kl.ID_KLASYFIKACJI = k.ID_KLASYFIKACJI
GROUP BY k.ID_KLASYFIKACJI, kl.NAZWA ORDER BY liczba DESC;

-- kontrahenci bez klasyfikacji (liczba, NULL vs spoza słownika, najwyższe ID) — zapytanie kontrolne
SELECT COUNT(*) AS razem,
       SUM(CASE WHEN k.ID_KLASYFIKACJI IS NULL THEN 1 ELSE 0 END) AS null_klasyfikacja,
       SUM(CASE WHEN k.ID_KLASYFIKACJI IS NOT NULL THEN 1 ELSE 0 END) AS id_spoza_slownika,
       MAX(k.ID_KONTRAHENTA) AS najwyzszy_id
FROM dbo.KONTRAHENT k
LEFT JOIN dbo.KLASYFIKACJA_KONTRAHENTA kl ON kl.ID_KLASYFIKACJI = k.ID_KLASYFIKACJI
WHERE kl.ID_KLASYFIKACJI IS NULL;

-- prostsza kontrola po naprawie
SELECT COUNT(*) AS bez_klasyfikacji, MIN(ID_KONTRAHENTA) AS najnizsze_id, MAX(ID_KONTRAHENTA) AS najwyzsze_id
FROM dbo.KONTRAHENT WHERE ID_KLASYFIKACJI IS NULL;

SELECT * FROM dbo.WFM_INT_SYSTEM_TABLICE WHERE NAZWATABLICY = 'KONTRAHENT';
SELECT * FROM dbo.WFM_INT_SYSTEM WHERE Id_Systemu = 57;   -- uwaga na kolumny z danymi dostępowymi, jeśli się pojawią

SELECT X.Id_Systemu, X.StatusObiektu, COUNT(*) AS liczba
FROM dbo.KONTRAHENT k JOIN dbo.WFM_INT_KONTRAHENT X ON X.Id_Obiektu = k.ID_KONTRAHENTA
WHERE k.ID_KLASYFIKACJI IS NULL GROUP BY X.Id_Systemu, X.StatusObiektu;

SELECT cb_ObjectType, cb_State, COUNT(*) AS liczba FROM dbo.yfi_ChangeBuffer
GROUP BY cb_ObjectType, cb_State ORDER BY cb_ObjectType, cb_State;

SELECT COUNT(*) AS bez_klasyfikacji,
       SUM(CASE WHEN b.cb_ObjectId IS NOT NULL THEN 1 ELSE 0 END) AS juz_w_buforze
FROM dbo.KONTRAHENT k
LEFT JOIN dbo.yfi_ChangeBuffer b ON b.cb_ObjectId = k.ID_KONTRAHENTA AND b.cb_ObjectType = 210
WHERE k.ID_KLASYFIKACJI IS NULL;
```

Wzorce skryptów:
- Test jednego rekordu z `ROLLBACK`: `BEGIN TRY BEGIN TRAN` → stan przed do `@log` + migawka `sys.dm_db_index_usage_stats` do `#przed` → `UPDATE` → stan po + różnica `user_updates` → `ROLLBACK` w TRY, `ROLLBACK` w CATCH → stan po `ROLLBACK` → `SELECT * FROM @log`.
- Masowa zmiana: kopia ID do `ZZ_BACKUP_...` (`SELECT INTO`) → w jednej transakcji: dopisz brakujących do kopii, policz oczekiwane, `UPDATE ... WHERE ID_KLASYFIKACJI IS NULL AND EXISTS (kopia)`, `IF @@ROWCOUNT = oczekiwane AND BETWEEN 1 AND 600 COMMIT ELSE ROLLBACK`, wyniki do `@log`.

## Pułapki

- Masowy `UPDATE` tabeli kontrahentów odpala triggery UPDATE: oznacza w `WFM_INT_KONTRAHENT` kontrahentów jako zmienionych (status 2, system 57 `ABSM`) i dodaje wpisy do `yfi_ChangeBuffer`. Przed zmianą: kopia ID, test na 1 rekordzie.
- Pole „Klasyfikacja” jest obowiązkowe w UI, ale baza dopuszcza `NULL` — stąd kontrahenci bez klasyfikacji (np. z importu zamówień internetowych) **[HIPOTEZA]**.
- Integrator SellIntegro szuka towarów po kodzie kreskowym (nie po symbolu) — zmiana/usunięcie kodu kreskowego w WAPRO lub brak EAN/SKU w BaseLinkerze kończy się błędem powiązania towaru w zamówieniu.
