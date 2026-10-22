# Structure

This document describes how the repository is organized, how the game works and which commands exist.

## Repository layout

```text
client/            Vue 3 app (own package.json, Vite, Vitest, ESLint)
  src/engine/      pure game logic
  src/net/         move log sync, player identity, polling and in-memory transports
  src/data/        card data and UI texts (strings/en and strings/de, one file per area)
  src/components/  Vue components
  src/views/       page-level components
  src/composables/ Vue composables (e.g. useTableIntent: the selection state of the table)
  src/utils/       Vue-free table and tutorial logic
  src/styles/      global CSS: tokens, base elements, shared controls, cards
  test/            tests, mirroring src/ (test/support/ holds shared helpers)
server/            PHP move log server
  index.php        entry point (api/index.php after the build)
  src/             Application (wiring), Housekeeping (cleanup), Config (all limits), ErrorLog
  src/Web/         request and response side: Api, RequestBody, Response, error codes
  src/Room/        per-room data: Rooms (files), MoveLog, RoomPlayers, Player
  src/RateLimit/   RateLimiter, per-network counters, client address handling
  src/Storage/     low-level files: LockedFile, LockedJsonFile, Filesystem, InstallationSecret
  tests/           tests, mirroring src/ (tests/support/ holds shared test helpers, loaded by tests/bootstrap.php)
docs/              this documentation
scripts/           dev.mjs: runs the PHP API and the Vite dev server together
```

The root `package.json` delegates to `client/`, runs the PHP helpers and formats the files outside `client/`. Install the dependencies with `npm install` and `npm --prefix client install`.

## How it works

The game logic runs entirely in the browser. The PHP server in `server/` is a dumb, ordered log store per room: it knows nothing about the rules. Clients append moves with a sequence number (accepted only if it is the next free one), poll for new moves (about every 1.5 seconds while something happens, slower when idle, paused while the tab is hidden) and compute the same game state from the log. Every client validates every move with the engine. Reloading the page rejoins the game because the server keeps the whole log.

Everyone who opens a room link enters a name and joins the lobby; anyone in the lobby can start the game. The `startGame` move carries the seed that shuffles the deck. It may instead carry an explicit card order (`deck`, the card values), which must be exactly the standard deck; only the tutorial uses it.

The API has a single entry point, `api/index.php`. The room is identified by the SHA-256 hash of the room code in the `X-Room` header, so the code itself never reaches the server.

## Tutorial

`#tutorial` opens a guided practice round that runs completely in the browser and never contacts the server. It uses the real game: the same session and table view, connected to an in-memory room (`net/localTransport.ts`) instead of the PHP server. A scripted opponent (`utils/tutorialScript.ts`) joins that room, looks at two of its cards, then keeps drawn cards of up to 4 on a card it has never seen and throws away higher ones, with a short delay so the player can follow. The `startGame` move of the tutorial carries a fixed deck (`TUTORIAL_DECK`), so the drawn cards fit the lessons.

`utils/tutorialScript.ts` holds the lesson plan: the fixed list of moves the player makes, each with its coach step and a hint. `utils/tutorialGuide.ts` only looks up how many moves the player has made to find the current step, and holds back every move that is not the planned one (the table then shows a hint instead of submitting it). The lessons are: look at the two cards on the left, draw and keep a low card, the three card powers (look at an own card, look at an opponent's card, blind exchange), replacing a group of equal cards, taking the top card of the discard pile, announcing the end once all own cards are known, and the results. `composables/useTutorial.ts` wires session, opponent and guide together, `views/TutorialView.vue` shows the coach (`components/TutorialCoach.vue`) inside the table, `utils/tutorialHighlight.ts` turns the expected move and the current selection into the single next click (`Highlight`: click targets plus the call-end button), which `GameTable` shows as a gently pulsing marker through its optional `highlight` prop (the same `card-ready` look as the confirming discard pile; the real game passes none). The tests play every allowed path through the round against the engine.

## Languages

The UI exists in English and German. `data/strings/en/` is the reference; `data/strings/de/` has the same file names, and the German object is typed `Strings`, which is the English object with its literals widened to `string` (`data/strings/types.ts`). A missing or extra key therefore fails the type check, and `test/data/strings/languages.test.ts` compares the structure at runtime. Each language has its own deck wording (`deckWording`), because joining numbers differs per language.

`main.ts` picks the language once at startup: a choice saved in `localStorage` (`net/identity.ts`) wins, otherwise the first of `navigator.languages` that the app speaks (`utils/pickLanguage.ts`), otherwise English. It calls `selectLanguage` and sets `<html lang>`, and only then imports `App.vue` dynamically, because `strings` is a live binding and many modules read it while loading. Tests never go through `main.ts`, so they always run in English. The footer switch saves the other language and reloads the page, so no string has to be reactive.

## Styles

Global CSS lives in `client/src/styles/` and is imported in order from `main.ts`: `tokens.css` (custom properties for colors, spacing and sizes), `base.css` (element defaults), `controls.css` (buttons, inputs, panels, notices, `.stack`) and `cards.css` (cards are rendered by several components). Everything else sits in a `<style scoped>` block of the component or view that renders it, together with its media queries. Slot content is styled with `:slotted()`.

## Server layers

`Application` (with `index.php`) wires everything together and turns exceptions into generic error responses. `Housekeeping` deletes expired data now and then after a request; it is skipped for rate limited requests, and a failing cleanup is only logged, so it never turns a successful request into an error. Below that the dependencies point one way: `Web` may use `Room` and `RateLimit`, both may use `Storage`, and `Storage` uses none of them. `Application`, `Housekeeping` and `index.php` may use everything, and everyone may read `Config`, where all limits and patterns live. The data files (rooms, counters, secret) are only ever opened through `LockedFile`, so locking and the rollback of failed writes exist once.

## Security model

Whoever knows a room link can read and write that room: the server does not authenticate players, and the room code (about 30 bits) is the only secret. Player IDs are visible to everyone in the room, and the rules are enforced only by the clients, which reject invalid moves. This matches the goal of a small game among friends and is a known limit, not a bug. What the server does enforce: size and count limits, the shape of requests and player names, ordered appends, and per-network rate limits.

## Commands

| Command                  | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `npm run dev`            | Start the PHP API and the Vite dev server together          |
| `npm run lint`           | Run all lint checks (client, other files, server)           |
| `npm run fix`            | Run all fixes (client, other files, server)                 |
| `npm test`               | Run client and server tests                                 |
| `npm run client:dev`     | Start the Vite dev server                                   |
| `npm run client:build`   | Type-check and build the deployable site to `client/dist/`  |
| `npm run client:test`    | Run the client unit tests                                   |
| `npm run client:lint`    | Type-check, check formatting and lint                       |
| `npm run client:fix`     | Format, fix lint issues and type-check                      |
| `npm run server:dev`     | Start the PHP API on port 8080 (Compose)                    |
| `npm run server:install` | Install the PHP test dependencies (Composer in a container) |
| `npm run server:lint`    | Check the PHP code style and static analysis (Compose)      |
| `npm run server:fix`     | Fix the PHP code style (Compose)                            |
| `npm run server:test`    | Run the PHP server tests (PHPUnit, Compose)                 |
| `npm run root:lint`      | Check the formatting of the files outside `client/`         |
| `npm run root:fix`       | Format the files outside `client/`                          |
