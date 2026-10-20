# Structure

This document describes how the repository is organized, how the game works and which commands exist.

## Repository layout

```text
client/            Vue 3 app (own package.json, Vite, Vitest, ESLint)
  src/engine/      pure game logic
  src/net/         move log sync and player identity
  src/data/        card data and UI texts
  src/components/  Vue components
  src/views/       page-level components
  src/composables/ Vue composables
  src/utils/       Vue-free table logic
  test/            tests, mirroring src/ (test/support/ holds shared helpers)
server/            PHP move log server
docs/              this documentation
```

The root `package.json` delegates to `client/`, runs the PHP helpers and formats the files outside `client/`. Install the dependencies with `npm install` and `npm --prefix client install`.

## How it works

The game logic runs entirely in the browser. The PHP server in `server/` is a dumb, ordered log store per room: it knows nothing about the rules. Clients append moves with a sequence number (accepted only if it is the next free one), poll for new moves (about every 1.5 seconds while something happens, slower when idle, paused while the tab is hidden) and compute the same game state from the log. Every client validates every move with the engine. Reloading the page rejoins the game because the server keeps the whole log.

Everyone who opens a room link enters a name and joins the lobby; anyone in the lobby can start the game.

The API has a single entry point, `api/index.php`. The room is identified by the SHA-256 hash of the room code in the `X-Room` header, so the code itself never reaches the server.

## Commands

| Command                  | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
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
| `npm test`               | Run client and server tests                                 |
| `npm run root:lint`      | Check the formatting of the files outside `client/`         |
| `npm run root:fix`       | Format the files outside `client/`                          |
| `npm run lint`           | Run all lint checks (client, other files, server)           |
| `npm run fix`            | Run all fixes (client, other files, server)                 |
