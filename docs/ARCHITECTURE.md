# Linker – konwencje architektury

Obowiązują w całej aplikacji. Każdy nowy feature budujemy według nich.

## A1. Filozofia

- **Feature-first (vertical slices).** Kod biznesowy żyje w `src/features/<feature>/`. Folder `src/app/` zawiera wyłącznie routing i cienkie „kontrolery”.
- **Warstwy wewnątrz feature'a.** Każdy feature dzieli się na: model, dostęp do danych, logikę biznesową i widoki. Patrząc na drzewo folderów, od razu widać, co jest gdzie.
- **Funkcje domyślnie.** Serwisy i repozytoria to moduły eksportujące funkcje. Klasy tylko dla własnych klas błędów albo klienta API, który trzyma stan (np. token, sesję). Serwisów i repozytoriów nie piszemy jako klas.
- **SRP na poziomie modułu, nie funkcji.** Jeden plik = jedna odpowiedzialność, ale może mieć kilka powiązanych funkcji. Nie tworzymy osobnego pliku dla każdej funkcji. Plik rozbijamy dopiero, gdy ma więcej niż jeden powód do zmiany albo przekracza ok. 200–250 linii.

## A2. Mapowanie pojęć (dla orientacji)

| Laravel / Symfony / .NET      | Linker (Next.js)                                               |
| ----------------------------- | -------------------------------------------------------------- |
| Routing + Controller          | `src/app/**/page.tsx`, `src/app/api/**/route.ts`, `actions.ts` |
| Model / Entity                | `model/*.types.ts`                                             |
| FormRequest / DTO / walidacja | `model/*.schemas.ts` (Zod)                                     |
| Repository                    | `server/repositories/*.repository.ts`                          |
| Service / Use case            | `server/services/*.service.ts`                                 |
| Infrastructure / HTTP client  | `server/sources/*.source.ts` lub `*.client.ts`                 |
| Konfiguracja źródła           | `server/sources/*.config.ts`                                   |
| Mapper / Transformer          | `server/mappers/*.mapper.ts`                                   |
| Views (Blade / Razor)         | `components/`                                                  |
| Helpers ogólne                | `src/shared/lib/`                                              |

## A3. Struktura feature'a

```text
src/features/<feature>/
├─ components/                  # widoki (Server i Client Components)
│  └─ <component>/              # każdy komponent = folder
│     ├─ index.ts               # eksportuje TYLKO publiczny komponent
│     ├─ <component>.tsx
│     ├─ <component>.styles.ts  # klasy Tailwinda
│     └─ <component>.<part>.tsx # części wewnętrzne, nieeksportowane z index.ts
│
├─ model/                       # kształt danych – bez logiki, bez I/O, bezpieczne na kliencie
│  ├─ <feature>.types.ts
│  ├─ <feature>.schemas.ts      # schematy Zod (+ typy przez z.input / z.output)
│  └─ <feature>.constants.ts    # stałe domeny i widoku (np. rozmiar strony)
│
├─ server/                      # TYLKO serwer – każdy plik zaczyna się od: import 'server-only';
│  ├─ sources/                  # surowy dostęp do zewnętrznych źródeł (fetch CSV, API) + *.config.ts
│  ├─ mappers/                  # surowe dane źródła → typy z model/ (walidacja, mapowanie)
│  ├─ repositories/             # "skąd biorę dane": source → mapper → cache → typ domenowy
│  └─ services/                 # "co z nimi robię": wyszukiwanie, filtrowanie, łączenie, paginacja
│
├─ actions.ts                   # Server Actions feature'a (opcjonalnie, 'use server')
└─ utils/                       # czyste funkcje specyficzne dla feature'a, bezpieczne na kliencie
```

Puste foldery nie są wymagane. Tworzymy tylko te warstwy, których feature faktycznie potrzebuje.

Stałe trafiają do warstwy, która je zna: konfiguracja źródła (URL, timeouty, czas życia cache) do `server/sources/*.config.ts`, stałe domeny i widoku do `model/*.constants.ts`.

`src/shared/lib/` – generyczne funkcje bez wiedzy o żadnym featurze (np. `paginate<T>`, formatowanie dat). Jeśli funkcja zna pojęcie „produkt”, „Primavera” albo reguły nazw produktów (jednostki `ml`, `szt`), **nie** należy do `shared`. Do `shared` przenosimy dopiero wtedy, gdy kod jest naprawdę potrzebny w drugim miejscu.

## A4. Kierunek zależności (najważniejsza zasada)

```text
app/page.tsx | route.ts | actions.ts
        ↓
server/services
        ↓
server/repositories
        ↓
server/sources  (+ server/mappers)

model/   ← może być importowany przez wszystkie warstwy
utils/, shared/lib/  ← może być importowany przez wszystkie warstwy
```

Zakazy:

- `components/` **nie importuje** niczego z `server/`. Dane dostaje przez propsy lub przez Server Actions.
- `utils/` nie importuje `server/` ani `components/`.
- `repositories/` nie importuje `services/`. `sources/` nie importuje `repositories/` ani `services/`.
- `model/` nie importuje niczego poza `zod` i innymi plikami z `model/`.
- `shared/` nie importuje niczego z `features/`.
- Feature A nie importuje wnętrza feature'a B. Wspólny kod trafia do `src/shared/`. Jeśli naprawdę trzeba, importujemy publiczny komponent lub typ, nigdy `server/` innego feature'a bez uzasadnienia.
- Repozytorium nie wie nic o UI (paginacja, sortowanie widoku), a serwis nie wie, czy dane pochodzą z CSV, API czy bazy.

## A5. Cienkie kontrolery

`page.tsx`, `route.ts` i Server Actions robią tylko trzy rzeczy:

1. walidują wejście (`searchParams`, `params`, body) schematem Zod z `model/`,
2. wywołują **jeden** serwis,
3. renderują komponent albo zwracają odpowiedź, obsługując każdy wariant wyniku (`ok`, `error`, pusty).

Zero logiki biznesowej, zero `fetch` do źródeł, zero mapowania danych w kontrolerze.

```tsx
// src/app/products/page.tsx
import { ProductsTable } from '@/features/products/components/products-table';
import { productsSearchParamsSchema } from '@/features/products/model/products.schemas';
import { getProductsPage } from '@/features/products/server/services/products.service';

export default async function ProductsPage(props: PageProps<'/products'>) {
	const { q, page } = productsSearchParamsSchema.parse(await props.searchParams);
	const productsPage = await getProductsPage({ query: q, page });

	if (productsPage.status === 'error') {
		return <p role="alert">{productsPage.message}</p>;
	}

	return <ProductsTable products={productsPage.products} />;
}
```

Granica server → client: obiekty przekazywane do Client Components i zwracane z Server Actions muszą być serializowalne (zwykłe obiekty, tablice, prymitywy). Instancji klas nie przekazujemy.

## A6. Nazewnictwo plików

- kebab-case, z sufiksem warstwy:
    - `*.types.ts`, `*.schemas.ts`, `*.constants.ts`
    - `*.source.ts` / `*.client.ts`, `*.config.ts`, `*.mapper.ts`, `*.repository.ts`, `*.cache.ts`, `*.service.ts`
- Komponenty: `kebab-case.tsx`, eksport nazwany w PascalCase (`export function ProductsTable`).
- Eksporty nazwane, bez `export default`. Wyjątek: pliki wymagane przez Next.js (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` itd.).
- Nazwy funkcji opisują intencję: `getProductsPage`, `searchProducts`, `findAllProducts`, `fetchPrimaveraCsv`.

## A7. Barrele (`index.ts`)

**Domyślnie: brak barreli. Importujemy bezpośrednio z pliku.**

```ts
// ✅
import { getProductsPage } from '@/features/products/server/services/products.service';
// ❌
import { getProductsPage } from '@/features/products';
```

Powody:

- barrel mieszający kod serwerowy i kliencki łatwo wciąga kod serwera (sekrety, `fs`, ciężkie zależności) do bundla przeglądarki,
- barrele spowalniają dev server/HMR i utrudniają tree-shaking,
- łatwo o cykliczne importy,
- bezpośrednia ścieżka mówi od razu, z której warstwy coś pochodzi, a to jest cel tej architektury.

**Jedyny dozwolony wyjątek:** folder komponentu `components/<component>/index.ts` (także w `src/shared/components/`), który eksportuje **wyłącznie** publiczny komponent (i ewentualnie jego typ propsów albo warianty stylów). Ukrywa części wewnętrzne, a nie agreguje całego feature'a.

```ts
// src/features/products/components/products-table/index.ts
export { ProductsTable } from './products-table';
```

Zakazane: `index.ts` w korzeniu feature'a, w `server/`, `model/`, `utils/`, `shared/lib/`.

## A8. Ochrona granicy serwera

- Zależność: `server-only`.
- Każdy plik w `server/` zaczyna się od `import 'server-only';`. Przypadkowy import w Client Component wywali build.
- Zmienne środowiskowe z sekretami czytamy tylko w `server/` (najlepiej w `sources/`).

## A9. Egzekwowanie

Zasady z A4 i A7 pilnuje Biome (`biome.json`, sekcja `overrides`), jak testy architektury w .NET:

- `noRestrictedImports` z `patterns` blokuje zakazane importy dla każdej warstwy (`components/` → `server/`, `utils/` → `server/`, `repositories/` → `services/`, `shared/` → `features/`, import z korzenia feature'a),
- `noBarrelFile` blokuje barrele poza wyjątkiem z A7.

Ograniczenia: Biome sprawdza tylko bezpośrednie importy. Zakazu „feature A nie importuje wnętrza feature'a B” nie da się zapisać ogólnie, więc pilnujemy go w review. Łańcuchy importów do kodu serwera domyka `server-only` w buildzie.

## A10. Checklista dla nowego feature'a

- [ ] Folder `src/features/<feature>/` ze strukturą z A3 (tylko potrzebne warstwy).
- [ ] Typy, schematy Zod i stałe domeny w `model/`.
- [ ] Dostęp do danych: `sources/` → `mappers/` → `repositories/`.
- [ ] Logika: `services/`.
- [ ] Cienki `page.tsx` / `route.ts` zgodny z A5.
- [ ] `import 'server-only'` w każdym pliku `server/`.
- [ ] Brak barreli poza wyjątkiem z A7.
- [ ] `npm run lint`, `npm run typecheck` i `npm run build` przechodzą.
