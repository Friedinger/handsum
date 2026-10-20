# Handsum – project conventions

Browser-based multiplayer card game prototype (2–8 players, join via link). Non-commercial hobby project, public on GitHub, hosted on the maintainer's shared hosting (PHP, Apache) in a sub-folder.

## Language

- Everything in the repo is English: code, identifiers, UI texts, README, docs, commit messages, issues, pull requests.
- Communication with the maintainer (milestone reports, questions) is in German.

## Code style

- Self-explanatory code: descriptive names, small single-purpose functions, clear module boundaries, early returns instead of deep nesting, named constants instead of magic numbers.
- Comments only for the non-obvious "why". No comments restating code, no commented-out code, no TODO leftovers, no JSDoc that only repeats types.
- TypeScript strict. No `any`, no non-null assertions without good reason. Immutable state.
- Prefer types over comments for documentation (e.g. discriminated unions for moves and events).
- All visible texts and game terms (including action names) live in `client/src/data/strings.ts`.

## Architecture (binding)

- `client/src/engine/`: pure, deterministic game logic. `applyMove(state, move) -> state` (immutable, no side effects) and `legalMoves(state, playerId)`. No `Math.random`, no `Date.now`. Randomness only from a seedable PRNG (mulberry32).
- Game state is derived solely from the move log. The first entry is a `startGame` move (player list with ID, name, order, plus seed). Any lobby member can start; the server orders all moves, so when two starts cross, the first one it accepts wins and the other is dropped after the client refetched the log.
- Only moves are synchronized, through the PHP server. A move's sequence number is its index in the log; the server appends only if it is the next free one (compare-and-append), otherwise the client refetches, checks the move again against the engine and retries or drops it. A client applies its own move only after the server accepted it, and every client validates every move it receives with the engine.
- The server is a dumb log store per room (`server/`, plain PHP, files instead of a database, no game rules). New or returning players fetch the full log from it and replay it. Presence (lobby, online status) is a per-room player list kept alive by the clients.
- Player identity: random player ID in localStorage, name entered on join. After game start only known players can rejoin.
- State technically contains everything; the UI only shows what a player may know. Console cheating is acceptable.
- Card data in `client/src/data/cards.json` (value, count, action per card type), separate from logic. Points = printed value.
- `client/src/net/`: polling transport against the PHP server (`ConnectTransport` interface), move log sync and player identity.
- `server/`: PHP move log server for shared hosting (Apache, PHP, no database, no APCu). Limits live as named constants in `server/src/Config.php`. It stores only hashed room IDs, player names and IDs, seed, moves and hashed IPs for rate limiting; rooms expire when inactive. The API uses no absolute paths so the app works in a sub-folder.
- The Vue 3 app (single-file components, no UI library) lives in `client/src/components/`, `views/` and `composables/`; Vue-free table logic in `client/src/utils/`. The UI never contains game rules. ESLint enforces the layering: `engine` and `data` import neither Vue nor `net`/UI folders, `net` and `utils` import no UI, composables and components import no views.
- Tests live in `client/test/`, mirroring the folder structure of `client/src/`. `client/test/support/` holds helpers shared by tests only (game fixtures, in-memory network).
- All imports use the `@/` alias (`@/engine`, `@/net/...`), tests import their helpers via `@test/support/...`; relative imports (`./`, `../`) are forbidden.

## Tech

- TypeScript (strict, `erasableSyntaxOnly`) + Vite + Vue 3, Vitest, ESLint (typescript-eslint strict type-checked, eslint-plugin-vue) + Prettier with default settings. Type checking via `vue-tsc`. Node version pinned in `mise.toml`.
- Config follows the maintainer's other projects (e.g. `Friedinger/imgsplit`): pinned action SHAs with version comments, shared workflows and Renovate presets from `Friedinger/configs`.
- Everything bundled locally: no CDNs, no external fonts, no tracking, no accounts. The server needs no ini settings, no mod_rewrite and no database.
- Vite `base` is relative (`./`) and the API URL is relative to the page, so the build works in any sub-folder.
- The server has no dependencies in production and must stay that way: Composer, PHPUnit, PHP-CS-Fixer (PER-CS) and PHPStan (exact versions, `server/composer.lock`) are for development only and run in containers (`compose.yaml`); `vendor/`, `tests/` and Composer files are never deployed. Server tests are in `server/tests/`, mirroring `server/src/`.
- `ci.yml` lints, tests and builds on every push; production is deployed by manually starting `ci.yml` on `main` (the deploy job runs only after all checks pass) or by hand via SFTP (see README).

## Workflow

- Work in milestones (M0–M4). After each milestone: stop, summarize in at most 10 lines, describe how to test, wait for approval.
- Ambiguous rules: choose the simplest solution and mention it in the milestone report (not documented in the repo).
- Before committing: `npm run lint` (type check, Prettier, ESLint) and `npm test`; `npm run fix` repairs formatting and lint issues.

## Git

- Gitmoji (gitmoji.dev) at the start of commit subjects, issue titles and PR titles. Not needed in bodies/descriptions.
- Never add Claude as co-author or mention Claude (no `Co-Authored-By` line, no session links) in commits, issues or PRs.
- Small, meaningful commits.

## Legal

- Never use the original game's name, text from its rulebook or its graphics — in code, README or UI. Rules only in our own words.
- This includes identifiers: use neutral own terms (e.g. card actions `viewOwn`, `viewOther`, `exchangeBlind`), not terms resembling the original rulebook.
- Cards are rendered with HTML/CSS only (number + neutral placeholder symbol) until own artwork exists.
