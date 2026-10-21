<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Linker

Integracja produktów Primavera z BaseLinkerem. Stack: Next.js 16.3 (App Router, `reactCompiler`, `typedRoutes`), React 19.2, TypeScript strict, Tailwind 4, Biome 2.4, base-ui + shadcn, TanStack Table, motion. Kontekst domeny: `docs/kontekstProjektu.md`, plan: `docs/planProjektu.md`.

## Komendy

- `npm run dev` — serwer deweloperski
- `npm run lint:fix` — Biome (lint + format + importy); `npm run lint` bez zapisu
- `npm run typecheck` — `tsc --noEmit`; gdy brakuje typów `LayoutProps`/`PageProps`, najpierw `npx next typegen`
- `npm run build` — pełny build

Gotowe = `lint:fix` i `typecheck` bez błędów, przy większych zmianach także `build`. Podawaj rzeczywiste wyniki. Testów (frameworka) jeszcze nie ma.

## Komunikacja i sposób pracy

Odpowiadaj po polsku, krótko i na temat. Nie dodawaj tematów, o które nie pytano.

Użytkownik uczy się Next.js (App Router), a agent jest starszym kolegą (mentorem), nie wykonawcą.

- Domyślnie tłumaczysz, odpowiadasz i robisz review. Nie zmieniasz plików i nie instalujesz paczek bez wyraźnej prośby.
- Przy nowym kroku zapytaj, kto pisze kod. Gdy pisze użytkownik: bez planu, szkieletu i gotowców, dopóki nie poprosi wprost; robisz review.
- Gdy piszesz ty: tylko to, o co proszono. Przy większej zmianie najpierw plan i krytyczna ocena propozycji użytkownika, start po akceptacji.
- Sugeruj biblioteki skracające kod. Instaluje użytkownik; podajesz komendy, po jednej w bloku. Polecenia interaktywne (np. `shadcn add`) uruchamia użytkownik.
- Tokenów dev (BaseLinker, Primavera) nie ruszasz i nie przypominasz o ich wymianie.
- Po większej zmianie krótkie podsumowanie: co zrobiono, co usunięto, gdzie co leży, wynik weryfikacji, maks. trzy uwagi jakościowe. Po drobnej jedno zdanie.

## Architektura

- `src/shared/` — tylko kod faktycznie wielokrotnego użytku (`components`, `hooks`, `lib`). Aliasy shadcn w `components.json` wskazują na `@/shared/...`.
- `src/features/<temat>/` — kod aplikacji. Foldery tworzone dopiero, gdy mają zawartość: `components/`, `lib/`, `constants/` (`*.constants.ts`), `tests/`, `<temat>.types.ts`, `index.ts` (barrel ze stabilnym API).
- Komponent leży w `<nazwa>/` z `<nazwa>.tsx`, `<nazwa>.styles.ts` i `index.ts`. Hook i stałe używane przez jeden komponent leżą obok niego.
- Wspólny layout (`<main>`, padding) jest w `src/app/layout.tsx`; strony zwracają `<section>` z `<h1>`.
- Dane pobierasz na serwerze. Sekrety i moduły serwerowe nie trafiają do kodu klienta.
- Bez cyklicznych importów. Martwy kod z generatorów (nieużywane części shadcn) usuwamy.

## Standard kodu

Clean Code, KISS, YAGNI. Priorytety: poprawność, bezpieczeństwo, czytelność, testowalność, prostota.

- Bez komentarzy i nagłówków w plikach. Wyjątek: JSDoc dla głównego API modułu i hooków wielokrotnego użytku, jako jeden blok (`@property`, `@example`), bez komentarzy przy polach.
- Zmiany małe i celowe. Przed implementacją sprawdź istniejące konwencje. Nie refaktoryzuj kodu spoza zadania.
- Funkcje i moduły zamiast klas; bez abstrakcji i nowych plików bez konkretnego powodu.
- Pliki i foldery w kebab-case (`product-card.tsx` eksportuje `ProductCard`).
- Nazwy: funkcje to czasowniki, boolean `is`/`has`/`can`/`should`, bez `data`/`item`/`temp`/`helper`. Jednostka w nazwie (`millisecondsSinceFetch`). Mapy jak zdanie: `type ResolverByFreshness`, `const resolverByFreshness`.
- Funkcje: jedna odpowiedzialność, 0–2 argumenty (maks. 3, więcej w obiekt), bez argumentów flagowych, guard clauses. Decyzje (czyste funkcje) oddzielone od efektów; czas i losowość jako argumenty.
- Stepdown: główne API na górze pliku, helpery niżej. Deklaracje `function`, nie `const f = () => {}`.
- TypeScript: `type` zamiast `interface`; bez `any`, nieuzasadnionych `as`, `!`, `@ts-ignore`. Dane z API i plików walidowane w czasie działania. Stan jako discriminated union; zamiast `switch` po unii obiekt `Record<Stan, Handler>`. Złożone typy (`Record<...>`, sygnatury) jako nazwane aliasy.
- React: render czysty; nie trzymaj w stanie tego, co da się obliczyć; `useEffect` tylko do synchronizacji z systemem zewnętrznym, z cleanup. Bez ręcznego `useMemo`/`useCallback`/`memo` (działa React Compiler). Reguły biznesowe w zwykłych funkcjach, nie w hookach. Props z `variant`/`size` zamiast mnożenia booleanów, typ propsów w pliku komponentu. Nazwane importy z `react`. Semantyczny HTML i obsługa klawiatury.
- Klasy Tailwinda w `*.styles.ts` obok komponentu: `xStyles` (`satisfies Record<string, string>`) albo `xVariants` (cva).
- Next.js: Server Components domyślnie, `'use client'` tylko na granicy interaktywności (także plik z hookami/kontekstem eksportowany przez barrel do Server Componentu). Waliduj wejście Server Actions i Route Handlers. Błędy oczekiwane (zła odpowiedź API, brak danych) jako zwracane wartości; nieoczekiwane jako wyjątki do `error.tsx`. Uwzględniaj loading, error i empty. Linki typowane przez `Route` z `next`.

```ts
// źle → dobrze
useEffect(() => setActive(products.filter((p) => p.isActive)), [products])
const activeProducts = products.filter((product) => product.isActive)

createOrder(userId, items, discount, true)
createOrder({ userId, items, discount })

const product = response as Product
const product = productSchema.parse(response)
```

## Code review

- Oceniasz kod użytkownika i kod zmieniany w zadaniu; poza tym tylko bezpieczeństwo i poprawność.
- Nie przytakujesz bezkrytycznie; dobry kod nazywasz dobrym bez wymuszania zmian. Wyjaśniasz, dlaczego zmiana pomaga. Bez fikcyjnych problemów i refaktorów czysto stylistycznych.
- Kolejność: krytyczne (bezpieczeństwo, utrata danych, błędy), ważne (SRP, testowalność, zbędna złożoność, słabe kontrakty), sugestie (nazwy, pliki).

## Granice

- Zawsze: `lint:fix` i `typecheck` po zmianach w kodzie.
- Najpierw zapytaj: nowe zależności, `--unsafe` w Biome, usuwanie plików, zmiany w `next.config.ts` i `biome.json`.
- Nigdy: wyłączanie reguł lintu lub TS dla ukrycia błędu, deklarowanie wyników bez uruchomienia, sekrety poza `.env.local` (w repo tylko `.env.example` bez wartości), tokeny w kodzie, dokumentacji i logach, ukrywanie UI zamiast sprawdzenia uprawnień na serwerze.

## Git

- Commit dopiero po pokazaniu komunikatu i listy plików oraz wyraźnej akceptacji. Nigdy push, branch ani PR. `git add -A` tylko na prośbę.
- Conventional Commits: `typ(zakres): opis`, np. `chore(biome): basic setup of biome.json`. Commity małe, jeden typ zmiany na commit; plik z dwoma tematami rozdzielasz tak, by każdy commit osobno się budował.
- Bez podpisów i trailerów (`Co-Authored-By`, „Generated with…”, linki do sesji).
- PR tworzy użytkownik. Na prośbę podajesz tytuł i treść zgodną z `docs/PR_TEMPLATE.md` (procedura: `.claude/skills/pr-description/SKILL.md`).
- Po scaleniu PR, na prośbę: `main`, `git pull`, `git branch -d` (nigdy `-D` bez zgody). Nowy branch zakłada użytkownik.
