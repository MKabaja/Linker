---
name: pr-description
description: Tytuł i treść pull requesta dla Linkera według docs/PR_TEMPLATE.md. Użyj, gdy użytkownik prosi o opis PR, treść PR, tytuł PR albo "przygotuj PR".
---

# Opis pull requesta

1. Zbierz zmiany: `git log --oneline main..HEAD` i `git diff --stat main...HEAD`.
2. Tytuł: Conventional Commits (`typ(zakres): opis`), po angielsku.
3. Treść po angielsku, Markdown, sekcje `##` w kolejności z `docs/PR_TEMPLATE.md`: What, Included (grupy zmian jako listy), Repo, CI (tylko gdy dotyczy), Why, Notes. Pustych sekcji nie dodawaj.
4. Nie odwołuj się do dokumentacji projektu ani planu (np. numerów faz).
5. Podaj tytuł i treść w osobnych blokach kodu do skopiowania.
6. Nie uruchamiaj `gh pr create` i nie rób push. PR tworzy użytkownik na GitHubie.
