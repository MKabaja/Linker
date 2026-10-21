@AGENTS.md

# Tylko dla Claude Code

- Pisanie i review kodu React/TS → skill `react-clean-code` (AGENTS.md ma pierwszeństwo).
- Next.js App Router → `modern-best-practice-nextjs`; Tailwind → `modern-tailwind`; dostępność → `modern-accessible-html-jsx`; bezpieczeństwo → `web-security`.
- Zmiany w `AGENTS.md`, `CLAUDE.md` i `.claude/` → skill `claude-md-guide`.
- Hook `PostToolUse` uruchamia `biome check --write` na każdym edytowanym pliku; błędy, których nie da się naprawić automatycznie, wracają do ciebie.
