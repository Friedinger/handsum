# Handsum

A browser-based multiplayer card game prototype for 2 to 8 players. Players join a round via a shared link; the browser clients exchange moves through a small PHP server that only stores the move log.

> **Unofficial fan project, not affiliated with the original publisher.**

## Status

Playable prototype: complete rules, online play via room links, animated card table.

## Development

Requires Node.js 24 (see `mise.toml`).

```bash
npm --prefix client install
npm run server:dev   # PHP API on port 8080, in its own terminal
npm run client:dev   # Vite dev server
```

To try it alone, open the room link in two browser windows. The PHP commands run in containers through `docker compose`; with Podman enable the API socket once: `systemctl --user enable --now podman.socket`.

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run client:dev`   | Start the Vite dev server                |
| `npm run client:build` | Type-check and build to `client/dist/`   |
| `npm run client:test`  | Run the client unit tests                |
| `npm run client:lint`  | Type-check, check formatting and lint    |
| `npm run client:fix`   | Format, fix lint issues and type-check   |
| `npm run server:dev`   | Start the PHP API on port 8080 (Compose) |
| `npm run server:test`  | Run the PHP server tests (Compose)       |
| `npm run deploy:check` | Check the build in an Apache sub-folder  |
| `npm test`             | Run client and server tests              |
| `npm run lint`         | Same as `client:lint`                    |
| `npm run fix`          | Same as `client:fix`                     |

## Repository layout

```
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
scripts/           helper scripts
```

The root `package.json` only delegates to `client/` and runs the PHP helpers; install dependencies with `npm --prefix client install`.

## Play

Open the game, create a room and share the link. Everyone who opens the link enters a name and joins the lobby; anyone in the lobby can start the game.

## How it works

The game logic runs entirely in the browser. The PHP server in `server/` is a dumb, ordered log store per room: it knows nothing about the rules. Clients append moves with a sequence number (accepted only if it is the next free one), poll for new moves (about every 1.5 seconds while something happens, slower when idle, paused while the tab is hidden) and compute the same game state from the log. Every client validates every move with the engine. Reloading the page rejoins the game because the server keeps the whole log.

The API has a single entry point, `api/index.php`. The room is identified by the SHA-256 hash of the room code in the `X-Room` header, so the code itself never reaches the server.

## Privacy

No accounts, no tracking, no external fonts or CDNs. A random player ID and your chosen name are stored in your browser's localStorage.

The server stores only:

| Data                                                             | Kept until                                          |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Room log: hashed room ID, moves, player names and IDs, game seed | 6 hours after the last move or join, then deleted   |
| Player list of a room: ID, name, last seen                       | Same as the room; entries vanish 90 seconds earlier |
| Rate limit counters: hash of IP address and day, request count   | At most 1 hour after the last request               |
| Error log: exception messages without IP addresses or room data  | Capped at 100 KB, deleted by hand                   |

IP addresses are never stored in clear text. Limits (rooms, moves, sizes, request rates, lifetimes) are constants in `server/src/Config.php`.

## Deployment to shared hosting

The app runs in a sub-folder (for example `https://example.com/handsum/`), needs PHP 8.4 with Apache and no database. Build it and upload with SFTP:

```bash
npm run client:build
```

```
handsum/                  contents of client/dist/ (index.html, assets/)
  api/                    contents of server/ without tests/
    index.php
    smoke-test.php        delete after the first check
    .htaccess
    src/
    data/                 created and filled by the server
```

1. Upload `client/dist/*` to the sub-folder and `server/*` (without `tests/`) to its `api/` folder.
2. Optional: to keep the data outside the web root, create `api/config.local.php` returning `['dataDir' => '/absolute/path/to/data'];`. The folder must be writable by PHP. Otherwise the server uses `api/data/`, which `.htaccess` blocks.
3. Open `https://example.com/handsum/api/smoke-test.php`. It checks that the data folder is writable, that `flock` works, that 20 parallel appends for one sequence number yield exactly one winner and that sources and data are not served. All lines must say `OK`.
4. Delete `smoke-test.php` from the server.

Unexpected server errors never appear in responses; they are logged to `error.log` in the data folder.

### Optional password protection

To restrict the whole app, including the API, add a `.htaccess` to the sub-folder (the browser sends the credentials with every request automatically):

```apache
AuthType Basic
AuthName "Handsum"
AuthUserFile /absolute/path/to/.htpasswd
Require valid-user
```

Create the password file with `htpasswd -c .htpasswd name` and keep it outside the web root if possible.

## Contact

Questions, feedback or concerns: please open a [GitHub issue](https://github.com/Friedinger/handsum/issues).

## License

The code is licensed under the [MIT License](LICENSE).
