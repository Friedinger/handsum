# Handsum

A browser-based multiplayer card game prototype for 2 to 8 players. Players join a round via a shared link; the game runs peer-to-peer in the browser without a game server.

> **Unofficial fan project, not affiliated with the original publisher.**

## Status

Playable prototype: complete rules, online play via room links, animated card table.

## Development

Requires Node.js 24 (see `mise.toml`).

```bash
npm --prefix client install
npm run dev
```

To try it alone, open the room link in two browser windows.

| Command         | Purpose                                |
| --------------- | -------------------------------------- |
| `npm run dev`   | Start the dev server                   |
| `npm run build` | Type-check and build to `client/dist/` |
| `npm test`      | Run unit tests                         |
| `npm run lint`  | Type-check, check formatting and lint  |
| `npm run fix`   | Format, fix lint issues and type-check |

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

Open the game on GitHub Pages, create a room and share the link. Everyone who opens the link enters a name and joins the lobby; anyone in the lobby can start the game.

## How it works

The game runs entirely in the browser. Players connect directly via WebRTC using [Trystero](https://github.com/dmotz/trystero). Only moves are exchanged; every browser computes the same game state from the shared move log. Reloading the page rejoins the game. If every player leaves, the round is gone.

## Privacy

No accounts, no tracking, no external fonts or CDNs. A random player ID and your chosen name are stored in your browser's localStorage.

To find each other, browsers briefly exchange connection details through public Nostr relays, and public STUN servers help establish the direct connection. Game data itself travels directly and encrypted between the players.

## Contact

Questions, feedback or concerns: please open a [GitHub issue](https://github.com/Friedinger/handsum/issues).

## License

The code is licensed under the [MIT License](LICENSE).
