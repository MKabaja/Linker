<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Komunikacja

Odpowiadaj krótko i na temat, bez rozprawek. Nie dodawaj tematów, o które nie pytano.

# Git

Commity robi wyłącznie użytkownik. Agent nigdy nic nie commituje, nie pushuje i nie tworzy branchy ani PR. Może najwyżej zaproponować treść komunikatu commita.

Do not add any attribution or signature to commits or pull requests: no `Co-Authored-By` trailers, no "Generated with Claude Code" lines, no session links.

## Pull requesty

PR tworzy wyłącznie użytkownik, przez GitHuba. Na prośbę agent podaje sam tytuł (Conventional Commits) i treść do wklejenia, zgodną z `docs/PR_TEMPLATE.md`. Agent nie uruchamia `gh pr create` ani nie robi push.

## Conventional Commits

Format: `typ(zakres): opis`, np. `chore(biome): basic setup of biome.json`. Typy (słowa kluczowe):

- `feat`: nowa funkcjonalność dla użytkownika, np. nowy ekran albo endpoint API.
- `fix`: naprawa błędu w działającym kodzie.
- `docs`: zmiany wyłącznie w dokumentacji, np. README albo komentarzach dla innych programistów.
- `style`: zmiany wyglądu kodu bez wpływu na działanie, np. formatowanie, wcięcia, brakujące średniki.
- `refactor`: przebudowa kodu bez zmiany zachowania, np. wydzielenie funkcji czy zmiana nazw zmiennych.
- `perf`: zmiany poprawiające wydajność, np. dodanie indeksu do bazy albo cache'owanie wyniku.
- `test`: dodanie nowych testów lub poprawa istniejących.
- `build`: zmiany w systemie budowania lub zależnościach, np. w `package.json`, Dockerfile czy skryptach budowania.
- `ci`: zmiany w konfiguracji CI/CD, np. w workflow GitHub Actions.
- `chore`: drobne prace porządkowe, które nie dotykają kodu produkcyjnego, np. aktualizacja `.gitignore`.
- `revert`: wycofanie wcześniejszego commita.
