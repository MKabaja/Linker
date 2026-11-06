# Dokumentacja Linkera

Dokumenty wewnętrzne: zawierają informacje o infrastrukturze firmy, nie publikować poza repozytorium.

## Główne

| Plik | Co zawiera |
|---|---|
| `ARCHITECTURE.md` | Warstwy, kierunek zależności, nazwy plików, barrele (reguły w `biome.json`) |
| `kontekstProjektu.md` | Fakty o procesie, Primaverze, BaseLinkerze i WAPRO z rozpoznania |
| `planProjektu.md` | Plan faz projektu (produkty, zamówienia, listy zakupowe) |
| `planZwrotow.md` | Plan brancha `feat/returns`: moduł zwrotów |
| `decyzje.md` | Rejestr decyzji i świadomych pominięć |
| `PR_TEMPLATE.md` | Szablon opisu pull requesta |

## `referencje/`: mapy systemów (aktualizowane przy każdym badaniu)

| Plik | Co zawiera |
|---|---|
| `baselinker-api-map.md` | Metody API BaseLinkera, ID z konta, statusy, wyniki testów |
| `sellintegro-konfiguracja.md` | Ustawienia integratora SellIntegro (BaseLinker ↔ WAPRO) |
| `wapro-schema-map.md` | Struktura bazy WAPRO Mag |
| `PRIMAVERA_normalizacja_nazw_produktow.md` | Normalizacja nazw produktów (lokalnie, w `.gitignore`) |
| `etykiety/` | Próbki etykiet zwrotów i zrzuty z BaseLinkera (lokalnie, w `.gitignore`: dane osobowe) |

## `archiwum/`: nieaktualne, tylko do wglądu

| Plik | Zastąpiony przez |
|---|---|
| `ROADMAP_PVEX_NEXTJS_FAZA1_2.md` | `planProjektu.md` |
| `Integracja_PVEX_BaseLinker_dokumentacja.md` | `kontekstProjektu.md` (sekcje 3–4) i `referencje/baselinker-api-map.md` |
