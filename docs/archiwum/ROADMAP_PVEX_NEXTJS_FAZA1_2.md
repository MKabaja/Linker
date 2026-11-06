# Projekt: Integracja PVEX / Primavera -> Dashboard Next.js

## Cel biznesowy

Stworzenie aplikacji webowej wspomagającej analizę produktów dostępnych w hurtowni Primavera/PVEX.

Aktualna wersja projektu nie korzysta z API BaseLinkera.

Celem pierwszego etapu jest:

- pobranie danych z PVEX
- parsowanie CSV
- prezentacja danych w aplikacji Next.js
- nauka podstaw Next.js w praktyce

---

# Założenia

Posiadam:

- znajomość React
- znajomość TypeScript

Muszę nauczyć się:

- App Router
- Route Handlers
- Server Components
- Data Fetching
- podstaw pracy po stronie serwera

---

# Faza 1 - Pobieranie danych z PVEX

## Cel

Sprawdzić czy endpoint PVEX działa.

Pobrać dane CSV.

Zamienić CSV na dane aplikacyjne.

---

## Krok 1

Instalacja projektu Next.js

Dokumentacja:

https://nextjs.org/docs/getting-started/installation

Do poznania:

- create-next-app
- App Router
- TypeScript

---

## Krok 2

Uruchomienie projektu lokalnie.

Sprawdzenie:

- npm run dev
- struktura katalogów

Dokumentacja:

https://nextjs.org/docs/app

---

## Krok 3

Zrozumienie działania:

app/

page.tsx

layout.tsx

route.ts

Server Components

Client Components

Dokumentacja:

https://nextjs.org/docs/app/building-your-application/rendering/server-components

---

## Krok 4

Stworzenie własnego endpointu API.

Cel:

Poznanie Route Handlers.

Dokumentacja:

https://nextjs.org/docs/app/building-your-application/routing/route-handlers

Pytania kontrolne:

- czym Route Handler różni się od komponentu React?
- gdzie wykonywany jest kod?
- czy token może być przechowywany po stronie serwera?

---

## Krok 5

Pobieranie danych z zewnętrznego API.

Cel:

Pobrać CSV z PVEX.

Dokumentacja:

https://nextjs.org/docs/app/building-your-application/data-fetching/fetching

Do przećwiczenia:

- fetch
- async/await
- obsługa błędów

---

## Krok 6

Analiza formatu CSV.

Sprawdzić:

- separator
- kodowanie
- liczba kolumn

---

## Krok 7

Parsowanie CSV.

Do poznania:

- biblioteki CSV dla Node.js
- mapowanie danych
- typowanie DTO

---

## Krok 8

Przygotowanie warstwy typów.

Cel:

Zaprojektować:

- Product
- CsvProduct
- InventoryProduct

---

# Faza 2 - Dashboard

## Cel

Pokazać dane pobrane z PVEX w aplikacji.

---

## Krok 1

Utworzenie strony Dashboard.

Przykład adresu:

/dashboard

Dokumentacja:

https://nextjs.org/docs/app/building-your-application/routing

---

## Krok 2

Pobranie danych z endpointu utworzonego w Fazie 1.

Do zrozumienia:

- server-side fetching
- loading states
- error states

---

## Krok 3

Tabela produktów.

Wyświetlić:

- EAN
- Nazwa
- Cena
- Ilość

---

## Krok 4

Dodanie wyszukiwarki po EAN.

Scenariusze:

- produkt istnieje
- produkt nie istnieje
- pusty input

---

## Krok 5

Filtrowanie danych.

Przykłady:

- po EAN
- po nazwie
- po stanie magazynowym

---

## Krok 6

Refaktoryzacja.

Sprawdzić:

- oddzielenie logiki od UI
- typowanie
- podział komponentów

---

# Wiedza Next.js po Fazie 2

- App Router
- Route Handlers
- Server Components
- Fetch API
- Struktura projektu
- Typowanie odpowiedzi API

---

# Faza 3 (przyszłość)

BaseLinker API

Po otrzymaniu:

- X-BLToken

Do poznania:

- autoryzacja API
- pobieranie zamówień
- pobieranie statusów
- filtrowanie statusu BłądPowiązaniaTowaru

---

# Docelowy przepływ biznesowy

BaseLinker
↓
BłądPowiązaniaTowaru
↓
EAN
↓
PVEX
↓
Weryfikacja produktu
↓
Lista zakupowa
↓
CSV
↓
Wysłanie maila
