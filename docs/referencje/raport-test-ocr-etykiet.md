# Raport: test OCR i kodów kreskowych na etykietach zwrotnych (zadanie 0)

> Data testu: 10.11.2026, branch `feat/returns`. Test jednorazowy (spike), nic nie trafiło do kodu Linkera ani do `package.json`. Skrypty leżały w katalogu tymczasowym sesji.
> Dane wejściowe: 4 zdjęcia z telefonu (`1–4.jpg`) i 6 etykiet PDF z `docs/referencje/etykiety/`. Raport nie zawiera danych osobowych klientów.

## 1. Wniosek

**Kody kreskowe działają na wszystkich 10 próbkach, a OCR wystarcza do jedynego przypadku, którego kody nie obejmują** (zwrot InPost „zwrot do nadawcy”). Plan B (AI) nie jest potrzebny do MVP. OCR ma jednak warunki:

1. Musi dostać **wycinek z polem „Uwagi nadawcy”**, a nie całe zdjęcie.
2. Trzeba spróbować **dwóch orientacji** (0° i 180°).
3. Wynik trzeba **dopasowywać odpornie na pomyłkę jednej cyfry**.

## 2. Kody kreskowe (zxing-wasm, ta sama biblioteka co w `barcode-detector`)

Wszystkie próbki zdekodowane w 0,1–1,3 s na komputerze, bez żadnej obróbki obrazu.

| Próbka | Odczytany kod | Co to jest | Pasuje do BaseLinkera |
|---|---|---|---|
| `1.jpg`, `2.jpg`, `3.jpg` (InPost, zwrot) | `620999669102333…` (Code128 / DataMatrix) | **numer zwrotny** | **Nie**, nie ma go w BL |
| `4.jpg` (DHL) | Code39 `31734506509` | numer paczki | Tak (3. z 3 paczek zamówienia 353637496) |
| DPD (`allegrokurier_…13-22-53`) | Aztec i Code128 zawierają `13549363258564` (wewnątrz dłuższego ciągu, np. `%0095174` + numer + `109703`) | numer paczki | Tak (351408797) |
| Erli PRO | `521000015923425073638449` | numer paczki | Tak (355575499) |
| Paczkomaty, TikTok | `620999669…` (24 cyfry) | numer paczki | do sprawdzenia po zbudowaniu indeksu |
| Allegro CZ (2 szt.) | `4008410966…` (24 cyfry), `A0065…` (Code128), QR `WCZ…A0065…` | numer paczki | do sprawdzenia po zbudowaniu indeksu |

**Wnioski:**

- Na zwrotach InPost („zwrot do nadawcy”) kod kreskowy prowadzi donikąd. To **nowy numer zwrotny**, a oryginalny numer jest tylko w tekście „Uwagi nadawcy: … Paczki: 620999669…”. Wszystkie trzy próbki mają ten sam początek `620999669102333`, więc taki kod rozpoznaje etykietę zwrotną i uruchamia OCR.
- Numer DPD siedzi **w środku** dłuższego kodu. Wyszukiwanie po paczce musi sprawdzać, czy kod *zawiera* numer znany indeksowi (albo wyciągać go z kodu), a nie tylko porównywać cały kod.
- DataMatrix i Code128 na tej samej etykiecie zwykle niosą ten sam numer, więc wystarczy jeden.

## 3. OCR (tesseract.js 7.0.0, język `pol+eng`)

### Zdjęcia InPost z „Uwagami nadawcy”

Poprawny numer to `courier_package_nr` zamówienia w BL (sprawdzone przez `getOrderPackages`, zamówienia 354695917, 354684769, 354807519).

| Próbka | Całe zdjęcie | Wycinek z polem „Uwagi nadawcy” (obrót 180°, powiększenie dowolne 1–3×) |
|---|---|---|
| `1.jpg` | nic (zdjęcie na kartonie z taśmą, etykieta mała w kadrze) | `…95344` poprawnie, **pierwsza cyfra błędnie** (`5` zamiast `6`) |
| `2.jpg` | tylko po obrocie 180°, z jedną błędną cyfrą w środku | **dokładnie** |
| `3.jpg` | **dokładnie** (bez obrotu) | nie testowano |

- Czas: wycinek 0,2–1 s, całe zdjęcie 2–20 s (komputer, Node). Na telefonie będzie wolniej, więc cały kadr odpada.
- Obracanie całego zdjęcia o 90° i 270° nic nie dało. Tekst w polu „Uwagi nadawcy” jest odwrócony o 180° na `1.jpg` i `2.jpg`, a na `3.jpg` nie. Kierunek różni się między zdjęciami, więc trzeba próbować obu.
- Automatyczne wykrywanie orientacji (`rotateAuto`) pomogło tylko na `4.jpg`. Na zdjęciach z „Uwagami” było bezużyteczne.
- Wskaźnik pewności tesseracta (30–58) nie ma związku z poprawnością cyfr. Nie opieramy na nim decyzji, tylko sprawdzamy wynik wyrażeniem regularnym i dopasowaniem do indeksu.

### Etykiety PDF (renderowane do PNG, 3× skala)

| Etykieta | Co OCR odczytał |
|---|---|
| DPD | `351408797` (`Reference 1`) i `13549363258564` poprawnie (też z wersji `354 9363 2585 64`) |
| Erli PRO | `355575499` i `261105x21790` poprawnie, długiego numeru paczki nie |
| Paczkomaty, TikTok, Allegro CZ | długie numery nie, to numery w kodach (czcionka kodowa). Z krótkich tylko `A0065ELTU5` (z jednym znakiem `O` zamiast `0`) |

To nie jest problem: te numery daje kod kreskowy. OCR potrzebny jest tylko tam, gdzie numer jest wyłącznie tekstem.

### DHL (`4.jpg`)

OCR całego zdjęcia (`rotateAuto`) odczytał `31734506509` poprawnie, ale po 13–20 s. Tego samego numeru dostajemy w ok. 0,2 s z Code39, więc OCR nie jest tu potrzebny.

## 4. Co zmienia się w planie (`docs/planZwrotow.md`)

1. **Zadanie 10 (skaner):** kody najpierw, jak w planie. OCR uruchamiamy, gdy kod zaczyna się od `620999669102333` (zwrot InPost) albo gdy po ok. 3 s nic nie trafiło. OCR robimy na **wycinku** (ramka na ekranie, w którą użytkownik ustawia pole „Uwagi nadawcy”) i próbujemy 0° i 180°. Cały kadr odpada: zbyt wolny i zawodny.
2. **Zadanie 8 (`extractSearchTraces`):** dodać trop „numer po `Paczki:`” (24 cyfry zaczynające się od `620999`). Dodać też wyszukiwanie kodu, który **zawiera** znany numer paczki (DPD).
3. **Zadania 7 i 9 (indeks i wyszukiwanie):** dla numerów z OCR dodać **dopasowanie odporne na jedną błędną cyfrę**. Najprostsze: porównanie po ostatnich 20 cyfrach (`LIKE '%…'`) albo odległość Levenshteina ≤ 1 na wynikach z tego samego prefiksu. Na próbce `1.jpg` błąd dotyczył pierwszej cyfry, więc sama suffix-owa część numeru wystarczyła.
4. **Golden set (sekcja 6 planu):** uzupełnione numery paczek. Pozostaje `order_id` dla paczkomatów, TikToka i Allegro CZ. API BL nie szuka po numerze paczki, więc ustalimy je dopiero na indeksie (zadanie 7). Poprawki w tabeli: `4.jpg` ma w kodzie Code39 sam numer `31734506509` (OCR niepotrzebny), a DPD ma `13549363258564` wewnątrz dłuższego kodu.
5. **`tesseract.js` w przeglądarce:** w teście użyłem `pol+eng`. Dla samych cyfr i słowa „Paczki” wystarczy zapewne `eng` (mniejszy pobierany plik językowy). Tego **nie** sprawdzałem, do ustalenia w zadaniu 10.

## 5. Ograniczenia testu

- Tylko 3 zdjęcia zwrotów InPost, wszystkie w dobrym świetle i płasko. Warunków magazynowych (zagięta folia, cień, ruch ręki) nie sprawdzaliśmy. **Trzeba powtórzyć na telefonie na prawdziwych zwrotach** (zadanie 10).
- Wycinki do OCR wskazałem ręcznie (współrzędne), a w aplikacji zrobi to ramka na ekranie. Czy użytkownik ustawi ją wystarczająco dokładnie, wyjdzie dopiero w praktyce.
- PDF-y były czyste cyfrowo, więc nie odpowiadają jakości zdjęcia z telefonu. Wnioski o nich dotyczą tylko tego, *który kanał* (kod czy tekst) niesie numer.
- Pomiary czasu z komputera przez Node, nie z telefonu w przeglądarce.

## 6. Weryfikacja w BaseLinkerze (tylko odczyt)

Wywołane wyłącznie `getOrders({ order_id })` i `getOrderPackages` dla sześciu zamówień z golden setu (354695917, 354684769, 354807519, 353637496, 351408797, 355575499). Potwierdzone:

- Trzy zwroty InPost to zamówienia TikTok (`tiktokeu`), a `courier_package_nr` jest tym numerem, który stoi w „Uwagach nadawcy” (przesyłka `tiktokshipping`).
- Zamówienie DHL ma 3 paczki, szukany numer jest trzeci.
- Zamówienie Erli ma paczkę `erlipro` o numerze z kodu kreskowego etykiety.
- Zamówienie DPD ma paczkę `13549363258564`.

## 7. Porządki

Folder `docs/referencje/etykiety/` jest w `.gitignore` (dane osobowe). Do usunięcia na koniec brancha, razem z odwołaniami do niego w `docs/planZwrotow.md` i `docs/referencje/baselinker-api-map.md`. Ten raport nie zawiera danych klientów i może zostać.
