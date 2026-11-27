# Linker — wygląd

Źródło prawdy dla wyglądu UI. Inspiracja: zrzuty innej aplikacji w `docs/referencje/wyglad/`. Bierzemy klimat, kolory, proporcje i detale, **nie** treść, nazwy ani ikony tamtej aplikacji.

| Zrzut | Na co patrzeć |
|---|---|
| `01-rama-aplikacji.png` | Rama aplikacji, sidebar + panel, kafelki statystyk w pasku, tabela, plakietki statusu |
| `02-poswiata-rog.png`, `03-poswiata-gora.png` | Neonowa poświata na krawędzi ramy, idzie za kursorem |
| `04-karta-dwudzielna.png` | Karta z dwiema kolumnami (login), numerowana lista `01/02/03` w mono, pomarańczowy przycisk główny |
| `05-kolumny-i-gradient.png` | Etykiety sekcji, wiersze z ikoną, gradient niebieski → pomarańczowy, przełącznik segmentowy |
| `06-pole-z-przyciskiem.png` | Pole tekstowe z doklejonym przyciskiem |
| `07-sidebar.png` | Sidebar: grupy, aktywny link, licznik, stopka z użytkownikiem |

## 1. Charakter

- Ciemny, spokojny, „narzędziowy”. Mało koloru: szarości + dwa akcenty (chłodny indygo, ciepły pomarańcz).
- Hierarchia przez jasność tekstu i grubość fontu, nie przez ramki i tła. Ramki 1 px, ledwo widoczne.
- Zaokrąglone rogi (zmiana decyzji z 2026-11-27: wcześniej `0`).
- Jedyny „efekt”: poświata ramy za kursorem i delikatny niebieski gradient w tle panelu.

## 2. Typografia

Zostają obecne fonty z `next/font/google` (`src/app/layout.tsx`): **Inter** (`--font-sans`) i **JetBrains Mono** (`--font-mono`). Para jest sprawdzona: podobna wysokość x, oba mają polskie znaki (`latin-ext`). Referencja używa groteski w typie Inter, więc nie zmieniamy.

| Rola | Klasy |
|---|---|
| Tytuł strony (`h1` w nagłówku panelu) | `text-lg font-semibold tracking-tight` |
| Tytuł hero (tylko login) | `text-4xl font-semibold tracking-tight md:text-5xl` |
| Tytuł sekcji / karty | `text-base font-semibold` |
| Etykieta sekcji (zamiast obecnych `uppercase tracking-wider`) | `text-sm text-dim` — normalna wielkość liter |
| Tekst | `text-sm text-off`; ważny `text-main font-medium` |
| Wartość statystyki | `text-3xl font-semibold tabular-nums` |
| Kwoty, liczby w tabelach | Inter + `tabular-nums` (nie mono) |
| EAN, numery zamówień i przesyłek, `01/02/03`, skróty klawiszy | `font-mono` w rozmiarze o stopień mniejszym niż otoczenie (JetBrains Mono optycznie jest większy) |

Etykiety `text-[0.6875rem] font-semibold tracking-wider uppercase` powtarzają się w kilkunastu plikach. Zastąpić je jedną utility `section-label` w `src/styles/helpers.css`.

## 3. Kolory (tokeny w `src/styles/theme.css`)

Nazwy tokenów zostają (komponenty już ich używają), zmieniają się wartości. Nowe tokeny tylko tam, gdzie zaznaczono.

| Token | Wartość | Użycie |
|---|---|---|
| `--color-app` | `#08090b` | Tło strony poza ramą |
| `--color-surface` | `#0f1013` | Tło ramy i sidebara |
| `--color-card` | `#141519` | Panel treści, karty |
| `--color-field` | `#0c0d10` | Pola tekstowe, tło przełącznika segmentowego (ciemniejsze od panelu, jak w referencji) |
| `--color-hover` | `#1d1e23` | Hover wiersza / linku |
| `--color-active` *(nowy)* | `#26272d` | Aktywny link sidebara, aktywny segment, przycisk neutralny |
| `--color-main` | `#ededf0` | Tekst główny |
| `--color-off` | `#c5c7ce` | Tekst zwykły |
| `--color-dim` | `#8b8e98` | Etykiety, opisy (kontrast na `card` ≈ 5,5:1) |
| `--color-faint` *(nowy)* | `#5c5f68` | Tylko dekoracja i placeholdery ikon, nigdy jedyny nośnik treści |
| `--color-line` | `#22242a` | Ramki, linie wierszy |
| `--color-line-strong` | `#30323a` | Ramki przycisków, pól, przełącznika |
| `--color-brand` | `#7b8cf6` | Akcent chłodny: linki, fokus, aktywne wskaźniki, info |
| `--color-brand-hover` / `-active` | `#8d9cf8` / `#6a7bef` | |
| `--color-on-brand` | `#0b0c10` | Tekst na indygo |
| `--color-accent` *(nowy)* | `#d4643f` | Akcent ciepły: **jeden** główny przycisk na ekranie (np. „Zaloguj się”, „Zatwierdź”) |
| `--color-accent-hover` *(nowy)* | `#e0704a` | |
| `--color-brand-orange` | `#f08a5d` | Tekst ostrzegawczo-ciepły („czeka na ciebie”, liczniki) |
| `--color-success` | `#5fd39a` | |
| `--color-warning` | `#f0b45a` | |
| `--color-danger` | `#f0715f` | |
| `--color-info` | `= brand` | |

Fiolet `#8b4ff0` znika. Mapowanie shadcn w `src/styles/shadcn.css` zostaje, tylko `--primary` dalej wskazuje na `brand`.

Gradient podpisowy (pasek, akcent dekoracyjny): `linear-gradient(90deg, var(--color-brand), var(--color-brand-orange))`.

Tło panelu: `card` + delikatna niebieska poświata u góry, np. `radial-gradient(ellipse 80% 40% at 50% 0%, rgb(123 140 246 / 0.06), transparent)`. Rama: analogicznie przy lewej dolnej krawędzi.

## 4. Kształt i odstępy

| Token | Wartość | Gdzie |
|---|---|---|
| `--radius-frame` *(nowy)* | `1.25rem` | Zewnętrzna rama aplikacji i loginu |
| `--radius-panel` *(nowy)* | `0.875rem` | Panel treści w ramie |
| `--radius-card` | `0.75rem` | Karty, tabele, alerty |
| `--radius-control` | `0.5rem` | Przyciski, pola, linki sidebara, segmenty |
| `--radius` (shadcn) | `0.5rem` | |
| plakietka | `rounded-md` (6 px) | |
| klawisz `kbd` | `rounded` (4 px) | |

- Ramki zawsze 1 px. Cienie tylko w poświacie i popoverach.
- Wysokość przycisku i pola: 36 px (`h-9`), wiersz tabeli ok. 52 px (`py-3.5`), wiersz sidebara 36 px.
- Paddingi panelu: 24 px (`p-6`) na desktopie, 16 px na telefonie.

## 5. Układ aplikacji

```
tło app (#08090b)
└── rama (surface, radius-frame, ramka line, poświata)  m-3 na desktopie
    ├── sidebar (przezroczysty na tle ramy)
    └── panel (card, radius-panel, ramka line, gradient u góry)  m-2
        ├── nagłówek strony: h1 po lewej, akcje po prawej, border-b
        └── treść
```

- Desktop (`md+`): rama z marginesem `m-3`, wysokość `h-[calc(100svh-1.5rem)]`, przewija się panel, nie strona.
- Telefon: bez ramy i poświaty (pełny ekran, `rounded-none`, bez marginesów), panel bez ramki. Obecny `AppMobileHeader` zostaje.
- Skaner zwrotów (`returns-scanner`) jest pełnoekranowy i zostaje bez zmian, poza promieniami przycisków (`rounded-control`).
- Nagłówek strony: nowy komponent `PageHeader` w `src/shared/components/page-header/` (`title`, opcjonalne `actions`). Strony zwracają dalej `<section>`, a `h1` renderuje `PageHeader`.

## 6. Neonowa poświata

Rama ma na krawędzi jasną, niebieską linię, która jest najjaśniejsza najbliżej kursora i zanika wzdłuż krawędzi (`02`, `03`).

- Komponent `GlowFrame` w `src/shared/components/glow-frame/` (klient). Owija ramę w layoucie aplikacji i kartę logowania.
- Pozycja kursora w zmiennych CSS `--glow-x`, `--glow-y` (px względem ramy), ustawiana w `pointermove` na `window`, raz na klatkę (`requestAnimationFrame`). Bez stanu Reacta, bez re-renderów. `useEffect` z cleanup (listener + `cancelAnimationFrame`).
- Dwie warstwy z gradientem radialnym przy kursorze: `edge` to pierścień 2 px na krawędzi ramy (maska `content-box exclude`), `halo` to ta sama poświata rozmyta pod ramą (`-z-10` w ramie z `isolate`).
- Rama nie ma własnego tła. Tło (opake) ma jej zawartość (`shell` w layoucie, `card` w loginie), więc halo widać tylko na zewnątrz krawędzi, a nie w sidebarze.
- Gdy kursor jest daleko, krawędź zostaje lekko widoczna (stała, słaba poświata w lewym górnym rogu).
- Wyłączona: `pointer: coarse` (telefon) i `prefers-reduced-motion: reduce` (wtedy stała poświata bez śledzenia).
- Element dekoracyjny: `aria-hidden`, `pointer-events-none`. Bez nowych zależności (`motion` niepotrzebny).

## 7. Komponenty

**Sidebar** (`07`, `src/features/app-sidebar/`, `src/shared/components/sidebar/`)
- Nagłówek: logo jako kwadrat 24 px (`rounded-md bg-active`, litera „L” w `text-main`) + „Linker” `font-semibold`.
- Linki: `h-9 rounded-control px-2.5 text-sm text-off`, ikona `size-4 text-dim`. Hover `bg-hover text-main`. Aktywny `bg-active text-main`, ikona `text-main`.
- Grupy z etykietą (`text-sm text-dim`, `mt-4 mb-1 px-2.5`): **Sprzedaż** (Zamówienia, Zwroty), **Magazyn** (Produkty z Primavery). „Lista zakupów” wraca do nawigacji, gdy moduł będzie gotowy.
- Licznik przy linku (jeśli kiedyś będzie): `rounded-md bg-brand-orange/15 px-1.5 text-xs text-brand-orange tabular-nums`.
- Stopka: Ustawienia, linia, blok użytkownika (kwadrat z inicjałami `size-8 rounded-md bg-active text-xs`, nazwa `text-sm text-main`, rola `text-xs text-dim`), wylogowanie.
- Tryb zwinięty (ikony) zostaje.

**Przyciski** (`button.styles.ts`)
- `default` → neutralny: `bg-active border-line-strong text-main hover:bg-[#2e2f36]` (jak „Export”, „New invoice”).
- `accent` *(nowy wariant)* → `bg-accent text-white hover:bg-accent-hover`. Jeden na ekran.
- `outline`, `ghost`, `destructive`, `link` zostają, z nowymi promieniami. `link` w kolorze `brand`.
- Skrót klawiszowy w przycisku: `kbd` `rounded bg-white/10 px-1 font-mono text-[0.6875rem] text-off`.

**Pola** (`input.styles.ts`) — `h-9 rounded-control border-line-strong bg-field`, fokus: `border-brand ring-3 ring-brand/20`. Pole z doklejonym przyciskiem (`06`): wspólna ramka, przycisk wewnątrz po prawej `bg-active`, ten sam promień.

**Kafelki statystyk** (`stat-tile`, `returns-day-summary`, `scan-stats-view`) — zamiast osobnych kart jeden pasek: `grid` w karcie, komórki rozdzielone `divide-x divide-line`, `p-6`. Etykieta `text-sm text-dim` (bez uppercase), wartość `text-3xl font-semibold`, podpis `text-sm text-dim`. Wartość ostrzegawcza w `text-brand-orange`.

**Tabele** (`products-table`, `returns-day-table`, `scan-stats-view`)
- Karta `rounded-card` z `overflow-hidden` (albo tabela wprost w panelu bez karty, jak w `01`).
- Nagłówek: `text-sm font-normal text-dim`, bez uppercase, `py-3`.
- Wiersze: `border-t border-line`, `py-3.5`, hover `bg-hover`. Kolumna główna `text-main font-medium`, reszta `text-off`, liczby do prawej z `tabular-nums`.
- Wartość z dopiskiem (jak „Nov 12 likely”): wartość `text-brand`, dopisek `text-sm text-dim` albo `text-brand-orange` przy ryzyku.

**Plakietki** (`return-kind-chip`, `importMark`) — `inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium` + kropka `size-1.5 rounded-full`. Warianty jako tło 15% + tekst w kolorze: neutralny (`bg-white/5 text-off`, kropka `dim`), `info` (brand), `success`, `warning`, `danger`, `accent` (brand-orange). Bez ramek.

**Przełącznik segmentowy** (`05`, jeśli pojawi się filtr) — kontener `rounded-control border-line-strong bg-field p-0.5`, segment `rounded-md px-3 h-8 text-sm text-dim`, aktywny `bg-active text-main`.

**Alerty** (`duplicate-return-alert`, `deleted-return-banner`) — zostają mocne (to ważne komunikaty na magazynie), ale: `rounded-card`, ramka 1 px w kolorze 40%, tło 10%, tytuł w kolorze.

**Karty i listy** (`return-header`, `return-packages`, `return-history`, `return-editor`) — `card` (`rounded-card border-line bg-card`), wiersze z `border-t border-line`, etykiety przez `section-label`. Wiersz z ikoną jak w `05`: ikona `size-4 text-dim`, tekst `text-main`, dopisek pod spodem `text-sm text-brand-orange` lub `text-dim`.

**Szczegóły zwrotu** (`/returns/[returnId]`) — kolejno: nawigacja „Poprzedni / Następny” (chronologicznie, bez usuniętych; na końcu przycisk nieaktywny, na desktopie dodatkowo klawisze ← →), nagłówek, „Skanuj następną” (tylko `pointer-fine:hidden`, czyli na urządzeniach dotykowych), karty **WAPRO** (WMS w `font-mono`, ZO; kliknięcie kopiuje), przesyłki, **Klient** i **Wysyłka** (dane na żywo z BaseLinkera, pamiętane 10 minut; ładują się w `Suspense`, a przy braku tokenu lub błędzie karta pokazuje komunikat), edytor, historia. Karty informacyjne to `ReturnInfoSection` (etykieta `section-label` + `card p-4` z siatką `dl`). Lista zwrotów ma kolumny WMS i ZO z tym samym kopiowaniem.

**Tooltip, toaster, sheet** — promienie z tokenów, tło `bg-active`/`card`, ramka `line-strong`, tekst `main` (tooltip nie w odwróconych kolorach).

## 8. Ekran logowania (`src/app/login/page.tsx`, `src/features/auth/components/login-form/`)

Wzór: karta dwudzielna z `04`.

```
md+                                              telefon
┌─ GlowFrame, max-w-4xl, wyśrodkowana w svh ─┐   ┌──────────────┐
│ lewa (surface + gradient)  │ prawa (card)   │   │ [L] Linker   │
│ [L] Linker                 │ Zaloguj się    │   │ E-mail       │
│                            │ E-mail [     ] │   │ Hasło        │
│     ilustracja SVG         │ Hasło  [     ] │   │ [Zaloguj]    │
│  (orbity indygo→pomarańcz) │ [Zaloguj się]  │   └──────────────┘
│                            │ błąd           │
└────────────────────────────┴────────────────┘
```

- Strona: `min-h-svh grid place-items-center p-4`, tło `app`.
- Desktop: `grid md:grid-cols-[1.1fr_1fr]`, lewa kolumna `p-10` z delikatnym gradientem indygo u góry, prawa `p-10 border-l border-line` z delikatnym ciepłym gradientem (jak prawa część `04`).
- Lewa kolumna: logo i dekoracyjna ilustracja SVG (`login-illustration.tsx`, `aria-hidden`, kolory z tokenów). Bez opisu modułów, dopóki nie są gotowe.
- Formularz: etykiety `text-sm text-dim`, pola z §7, przycisk wariantu `accent` na całą szerokość, błąd `text-sm text-danger` z `role="alert"` (jak teraz).
- Telefon: jedna kolumna, z lewej części zostaje samo logo, ilustracja ukryta. Bez poświaty, karta `rounded-card`.
- `h1` dalej na stronie („Zaloguj się”), logika `LoginForm` bez zmian.

## 9. Dostępność

- Fokus: `outline-2 outline-offset-2 outline-brand` (obecne `global.css`), widoczny na każdym tle.
- Kolor nie jest jedynym nośnikiem informacji: plakietki mają tekst, kropka to dodatek.
- `text-faint` tylko dla dekoracji. Tekst czytany min. `text-dim`.
- Animacje i poświata respektują `prefers-reduced-motion`.

## 10. Zlecenie dla agenta implementującego

Przeczytaj ten plik, obejrzyj zrzuty z `docs/referencje/wyglad/`, potem `AGENTS.md` i `docs/ARCHITECTURE.md`. Kolejność, każdy krok osobno weryfikowalny (`npm run lint:fix`, `npm run typecheck`):

1. Tokeny: `theme.css` (kolory, promienie, nowe tokeny), `shadcn.css` (`--radius`), utility `section-label` w `helpers.css`.
2. Prymitywy w `src/shared/components/`: `button` (wariant `accent`, `default` neutralny), `input`, `tooltip`, `toaster`, `sheet`, `stat-tile`, `sidebar` (promienie, kolory linków).
3. Nowe: `glow-frame`, `page-header`.
4. Layout aplikacji `src/app/(app)/layout.tsx` + `features/app-sidebar` (rama, panel, grupy, logo, stopka).
5. Strony: `PageHeader` zamiast własnych `h1`, tabele, kafelki, plakietki, karty zwrotów.
6. Login (§8).
7. Na końcu `npm run build` i przegląd w przeglądarce: desktop 1440 px i telefon 390 px, oba z klawiaturą.

Granice: bez nowych zależności, bez zmian logiki, danych i akcji serwera, bez zmian w `next.config.ts` i `biome.json`. Klasy tylko w `*.styles.ts`. Skaner zwrotów tylko promienie.
