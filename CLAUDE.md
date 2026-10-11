# Handsum – project conventions

Browser-based multiplayer card game prototype (2–8 players, join via link). Non-commercial hobby project, public on GitHub, hosted on GitHub Pages.

## Language

- Everything in the repo is English: code, identifiers, UI texts, README, docs, commit messages, issues, pull requests.
- Communication with the maintainer (milestone reports, questions) is in German.

## Code style

- Self-explanatory code: descriptive names, small single-purpose functions, clear module boundaries, early returns instead of deep nesting, named constants instead of magic numbers.
- Comments only for the non-obvious "why". No comments restating code, no commented-out code, no TODO leftovers, no JSDoc that only repeats types.
- TypeScript strict. No `any`, no non-null assertions without good reason. Immutable state.
- Prefer types over comments for documentation (e.g. discriminated unions for moves and events).
- All visible texts and game terms (including action names) live in `src/data/strings.ts`.

## Architecture (binding)

- `src/engine/`: pure, deterministic game logic. `applyMove(state, move) -> state` (immutable, no side effects) and `legalMoves(state, playerId)`. No `Math.random`, no `Date.now`. Randomness only from a seedable PRNG (mulberry32).
- Game state is derived solely from the move log. The first entry is a `startGame` move (player list with ID, name, order, plus seed). Any lobby member can start; if two starts cross, the one by the lower player ID wins on every client.
- Only moves are synchronized. Each move has a sequence number. Clients accept only moves with the expected number, from an authorized player, that are legal. Duplicates are ignored, invalid moves rejected.
- New or returning peers receive the full move log from a present peer and replay it.
- Player identity: random player ID in localStorage, name entered on join. Trystero peer IDs change, player IDs do not. After game start only known players can rejoin.
- State technically contains everything; the UI only shows what a player may know. Console cheating is acceptable.
- Card data in `src/data/cards.json` (value, count, action per card type), separate from logic. Points = printed value.
- `src/net/`: Trystero (WebRTC, no own server), move log sync and player identity. `src/ui/`: Vue 3 single-file components without a UI library; the hot-seat debug page (`hotseat.html`, `src/ui/hotseat/`) stays Vanilla DOM. UI never contains game rules.

## Tech

- TypeScript (strict) + Vite + Vue 3, Vitest, ESLint (typescript-eslint strict type-checked, eslint-plugin-vue) + Prettier. Type checking via `vue-tsc`.
- Everything bundled locally: no CDNs, no external fonts, no tracking, no accounts.
- Vite `base` is relative (`./`) so the build works under the GitHub Pages sub-path.
- Deployment via GitHub Actions to GitHub Pages.

## Workflow

- Work in milestones (M0–M4). After each milestone: stop, summarize in at most 10 lines, describe how to test, wait for approval.
- Ambiguous rules: choose the simplest solution and mention it in the milestone report (not documented in the repo).
- Before committing: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.

## Git

- Gitmoji (gitmoji.dev) at the start of commit subjects, issue titles and PR titles. Not needed in bodies/descriptions.
- Never add Claude as co-author or mention Claude (no `Co-Authored-By` line, no session links) in commits, issues or PRs.
- Small, meaningful commits.

## Legal

- Never use the original game's name, text from its rulebook or its graphics — in code, README or UI. Rules only in our own words.
- This includes identifiers: use neutral own terms (e.g. card actions `viewOwn`, `viewOther`, `exchangeBlind`), not terms resembling the original rulebook.
- Cards are rendered with HTML/CSS only (number + neutral placeholder symbol) until own artwork exists.
