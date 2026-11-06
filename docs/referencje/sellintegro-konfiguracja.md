# SellIntegro (BaseLinker ↔ WAPRO Mag) – konfiguracja integratora

Stan na: 05.11.2026 (zrzuty ekranu z panelu "Edytuj konfigurację", usługa zamówień; lista metod API ze Swagger UI).
Dokument opisuje, JAK integrator jest ustawiony, żeby przy problemach wyciągać wnioski bez ponownego przeklikiwania panelu.

## Zasady dla Claude (czytaj najpierw)
1. Nie zapisywać w tym pliku: klucza API BaseLinker, tokenu SellIntegro, loginu/hasła do bazy, danych osobowych. Wszystko takie = "[ukryte]".
2. Panel SellIntegro tylko do odczytu. Nie klikać "Kontynuuj"/zapisz w konfiguracji (wersja jest przestarzała; zapis może wymusić aktualizację i zmienić działanie).
3. Znaczniki: [POTWIERDZONE] = widoczne na zrzucie; [HIPOTEZA] = wniosek, wymaga sprawdzenia.
4. Powiązany plik: `wapro-schema-map.md` (struktura bazy), `baselinker-api-map.md` (API BaseLinker, ID statusów).

## Środowisko integratora
- [POTWIERDZONE] Wtyczki zamówień (WFG/BLK) uruchamiane automatycznie co ok. 15 s.
- [POTWIERDZONE] Wersja integracji przestarzała: v156.0 PRERTM, dostępna v167.0 RTM. Wersja bez wsparcia PREMIUM.
- [POTWIERDZONE] Usługi w panelu pokazywały "wygasa za 10 dni" (stan na 05.11.2026) – do wyjaśnienia z właścicielem/adminem, czy licencja jest odnawiana.
- [POTWIERDZONE] Okno pobierania zamówień: 14 dni wstecz (z wcześniejszych punktów konfiguracji).
- [POTWIERDZONE] Integrator łączy się z bazą WAPRO własnym kontem (dane [ukryte]). Dla Linkera NIE używać tego konta – poprosić admina o osobny login tylko do odczytu.

## API SellIntegro (Swagger UI) – stan na 05.11.2026
- [POTWIERDZONE] Mateusz wygenerował token w zakładce API panelu (token [ukryty], trzymać w zmiennej środowiskowej po stronie serwera, nigdy w kodzie przeglądarki ani w dokumentach). Dokumentacja Swagger UI: `https://public-api.sellintegro.com/index.html` (adres z linku w panelu). Autoryzacja: przycisk Authorize w Swaggerze (dokładny schemat nagłówka nieustalony).
- [POTWIERDZONE] To API zarządza platformą SellIntegro, NIE udostępnia danych z WAPRO. Brak metod dotyczących produktów, artykułów, stanów, kontrahentów. Lista produktów z WAPRO dla Linkera tym API nie będzie dostępna.
- Grupy metod widoczne w Swaggerze: AppGroups (GET), Beamer (GET /Beamer/GetPosts), Browser, ClientRuntime (POST RunNowProcess, GET GetRegistrationToken), CloudEndpoint (GET i POST /CloudEndpoint/endpoint), Documentation (GetDocumentationInfo), Frames, Logs (GET GetUserMessages, GetUserDebugsLogs), Scenario (GET GetUserConfig, POST AddUserConfig, PUT UpdateUserConfig), Status (GET /Status, WhoAmI, Apps, RunnerActivity), SubscriptionCustomer (GetSubscriptionPlan), Tokens (/api/Tokens/Refresh GET i POST), Translate, WebHooks (GET /WebHooks, GET i POST /WebHooks/EndPoints, POST SendTestMessage).
- [HIPOTEZA – z nazw, bez opisów] Przydatne dla Linkera (tylko odczyt): `Logs/GetUserMessages` (prawdopodobnie Dziennik błędów integracji – wyjaśnienie statusów 332591/332592), `Status*` (czy integrator działa), `WebHooks` (powiadomienia o zdarzeniach zamiast odpytywania).
- Ostrożnie: `GET Scenario/GetUserConfig` prawdopodobnie zwraca konfigurację z loginem/hasłem do bazy i kluczem BaseLinker – nie wywoływać z Linkera, odpowiedzi nie wklejać do czatu. `POST/PUT Scenario/*UserConfig` zmieniają konfigurację – nie używać. `POST ClientRuntime/RunNowProcess` wymusza uruchomienie procesu – nie testować na produkcji. Znaczenie `CloudEndpoint` nieustalone.
- Decyzja Mateusza 05.11.2026: na razie nie badamy dalej; ewentualne testy z Postmana lub z kodu Linkera później.
- Lista produktów z WAPRO dla Linkera: osobna ścieżka – bezpośrednio z bazy, osobny login tylko do odczytu, tabele `ARTYKUL` i `KOD_KRESKOWY` (patrz `wapro-schema-map.md`), klucz = kod kreskowy.

## Statusy BaseLinker używane przez integrator (z punktów 1–10 i 11)
| ID statusu | Nazwa robocza | Znaczenie |
|---|---|---|
| 327879 | TworzZamowienie | zamówienie do przetworzenia przez integrator |
| 327889 | UtworzonoZK | dokument utworzony w WAPRO |
| 332591 | BladERP | błąd po stronie ERP |
| 332592 | BladPowiazaniaTowaru | nie znaleziono towaru w WAPRO |
| 327888 | BrakStanuTowaru | brak stanu towaru w WAPRO (ustawiany wg pkt 11) |

Uwaga: szczegółowe ustawienia punktów 1–10 (pobierane statusy, okno czasu itd.) zostały w poprzedniej części rozmowy zapisane tylko skrótowo – jeśli będą potrzebne, trzeba je ponownie odczytać z panelu i uzupełnić tutaj.

## Ustawienia punkt po punkcie (11–27)

| Pkt | Pytanie w panelu | Ustawienie | Wniosek |
|---|---|---|---|
| 11 | Status w Base przy braku stanu towaru | Ustaw status **327888** (BrakStanuTowaru) | [POTWIERDZONE] brak stanu = status 327888 |
| 12 | Korekty faktur / zwroty detaliczne | **Nie rób korekt** | [POTWIERDZONE] zwroty nie przechodzą przez integrator |
| 13 | Jakie dokumenty w WAPRO | **ZO w głównym rejestrze** (nie BZO); **rezerwacja towaru: Tak** | [POTWIERDZONE] każde zamówienie = ZO z rezerwacją stanu |
| 14 | Numer dokumentu do BaseLinkera | **Tak, do pola własnego nr 1** | [POTWIERDZONE] numer ZO wraca do pola własnego 1 w BL |
| 15 | Magazyn | **Jeden magazyn: KROLEX**, mapowanie wg pól puste | [POTWIERDZONE] wszystkie zamówienia na magazyn KROLEX |
| 16 | Dokumenty przypisz do | **Jeden stały pracownik** (konto administracyjne, nazwa [ukryta]) | [POTWIERDZONE] autor dokumentów w WAPRO = to konto, nie handlowiec |
| 17 | Kwoty netto/brutto | **Liczy od ceny brutto** | [POTWIERDZONE] |
| 18 | Kontrahent | **Utwórz lub powiąż kontrahenta stałego**, zachowaj dane do faktury **oraz do wysyłki**. Dopasowanie istniejącego: **NIP, następnie Email**. Aktualizacja danych istniejącego: **nie aktualizuj**. "Opcje zaawansowane" – nie sprawdzone | patrz sekcja "Kontrahenci" |
| 19 | Artykuły | Powiąż kartotekę: **EAN (Base) → Domyślny kod kreskowy (WAPRO)**; opcjonalnie w drugiej kolejności **SKU (Base) → Domyślny kod kreskowy**. Gdy nie znaleziono: **nie dodawaj do WAPRO**. "Opcje zaawansowane" – nie sprawdzone | patrz sekcja "Towary" |
| 20 | Koszty transportu | **Stała usługa "USŁUGI transportowa"**; rozbicie stawek VAT transportu: **Nie** | [POTWIERDZONE] transport zawsze jako jedna usługa |
| 21 | Stawki VAT | **Przypisuj wg mapowania** (tabela, ok. 20+ wierszy) | patrz sekcja "VAT" |
| 22 | Sposób płatności | **Przypisz zawsze: gotówka** | [POTWIERDZONE] niezależnie od metody w BL |
| 23 | Rodzaj transakcji transgranicznej | **Wg mapowania**: Czechy, Słowacja, Węgry (kraj dostawy) → OSS; TypTransakcji "OSS" → OSS | [POTWIERDZONE] |
| 24 | Informacje dodatkowe w dokumencie | Zaznaczone: **Uwagi sprzedawcy, Pole dodatkowe 2, Komentarz kupującego**. Separator: `*`. Nie umieszczać w "Uwagi" (idzie do "Informacje dodatkowe") | [POTWIERDZONE] telefon, e-mail, ID zamówienia, źródło, sposób płatności/dostawy NIE są przenoszone |
| 25 | Data wystawienia dokumentu | **Data zamówienia z BaseLinker** | [POTWIERDZONE] |
| 26 | Pole dodatkowe z datą dokumentu | **Wyłącz** | [POTWIERDZONE] |
| 27 | Numer oryginału w dokumencie | **Numer zamówienia Base (zalecane)** | [POTWIERDZONE] nie numer z oryginalnego źródła (Allegro itp.) |

## Kontrahenci (pkt 18) – wnioski do problemu "brak klasyfikacji"
- [POTWIERDZONE] Integrator sam tworzy kontrahentów w WAPRO, gdy nie znajdzie istniejącego po NIP lub Email.
- [POTWIERDZONE] W widocznej części konfiguracji NIE ma ustawienia klasyfikacji, grupy ani innych domyślnych wartości kontrahenta. Może być w "Opcjach zaawansowanych" (nie sprawdzone).
- [HIPOTEZA] Kontrahenci utworzeni przez integrator dostawali ID_KLASYFIKACJI = NULL – to najbardziej prawdopodobne źródło 413 kontrahentów bez klasyfikacji (naprawionych 05.11.2026, patrz `wapro-schema-map.md`).
- [HIPOTEZA] Nie wiadomo, czy integrator korzysta z flagi DOMYSLNA w KLASYFIKACJA_KONTRAHENTA (ustawiona 05.11.2026 na INTERNET). Rozstrzygnie zapytanie kontrolne po kilku dniach: czy nowi kontrahenci (ID > 108780) mają ID_KLASYFIKACJI NULL czy 20.
- [HIPOTEZA] Dopasowanie po NIP/Email: klient detaliczny bez NIP i bez e-maila w zamówieniu może powodować tworzenie nowego kontrahenta przy każdym zamówieniu (duplikaty). Do sprawdzenia w danych.
- [POTWIERDZONE] Dane istniejącego kontrahenta nie są aktualizowane – zmiana adresu u klienta w BL nie trafi do WAPRO.

## Towary (pkt 19) – wnioski
- [POTWIERDZONE] Towar jest szukany po kodzie kreskowym: najpierw EAN, potem SKU – oba porównywane z **domyślnym kodem kreskowym** artykułu w WAPRO (tabele ARTYKUL / KOD_KRESKOWY).
- [POTWIERDZONE] Brak dopasowania = towar nie jest dodawany, zamówienie dostaje błąd powiązania (status 332592, BladPowiazaniaTowaru).
- [HIPOTEZA] Skoro SKU też jest porównywane z kodem kreskowym (nie z symbolem), produkt w BL bez EAN i ze SKU innym niż kod kreskowy w WAPRO będzie powodował błąd 332592.
- Dla Linkera: kluczem łączącym produkt BL ↔ WAPRO jest kod kreskowy, nie symbol artykułu.

## VAT (pkt 21) – wnioski
- [POTWIERDZONE] Stawki przypisywane tabelą z priorytetami, wg: **Kod kraju (dane do dostawy)** oraz **Identyfikator źródła zamówienia** (wartości 7726, 7727, 7728 – to ID źródeł w BL, np. sklepy/marketplace; nazwy do ustalenia).
- [POTWIERDZONE] PL: produkt 23/8/5 wg stawki z zamówienia; transport 23. CZ: 21 (produkt i transport). SK: 23. HU: 27. Priorytet 1–4 rozstrzyga konflikty.
- [POTWIERDZONE] Dla źródeł 7726 i 7727 oraz "Informacja o źródle zamówienia" 7728 są osobne wiersze (23/8/5) – prawdopodobnie wymuszają PL stawki niezależnie od kraju.
- [HIPOTEZA] Kraj spoza tabeli (np. DE, AT) nie ma reguły → ryzyko błędu lub stawki domyślnej. Do sprawdzenia w Dzienniku.

## Gdzie szukać przy problemach
| Objaw | Co sprawdzić |
|---|---|
| Zamówienie w statusie 332592 | Brak EAN/SKU w BL lub brak odpowiedniego kodu kreskowego w WAPRO (pkt 19) |
| Zamówienie w statusie 327888 | Brak stanu na magazynie KROLEX (pkt 11, 15, 13 – rezerwacja) |
| Zamówienie w statusie 332591 | Dziennik SellIntegro (nie oglądany; może być też dostępny przez API `Logs/GetUserMessages`), błąd po stronie ERP, np. VAT/kraj spoza tabeli |
| Kontrahent bez klasyfikacji | pkt 18; zapytanie kontrolne z `wapro-schema-map.md` |
| Brak numeru ZO w BL | pkt 14 (pole własne nr 1) |
| Błędna stawka VAT / OSS | pkt 21 i 23 (tabele mapowania) |
| Zmiana adresu klienta nie dotarła | pkt 18 – "Nie aktualizuj danych kontrahenta" |

## Do sprawdzenia / pytania otwarte
1. Zakładka "Opcje zaawansowane" w pkt 18 i 19 (klasyfikacja/grupa kontrahenta?).
2. Opisy metod API: `Logs/GetUserMessages`, `WebHooks`, `CloudEndpoint` (nie rozwijane); schemat autoryzacji (Bearer?).
3. Dziennik i Skrypty w panelu – nie oglądane.
4. Licencja "wygasa za 10 dni" – ktoś musi potwierdzić odnowienie.
5. Aktualizacja v156.0 → v167.0: kto decyduje, kiedy (ryzyko zmiany zachowania).
6. Klucz API BaseLinker został raz pokazany na zrzucie ekranu (niezamaskowany). Rotacja zepsułaby integrację, więc tylko po uzgodnieniu i z jednoczesnym podmienieniem klucza w konfiguracji.
7. Nazwy źródeł 7726/7727/7728 w BaseLinkerze.
8. Osobny login tylko do odczytu do bazy WAPRO dla Linkera – do uzgodnienia z adminem.
