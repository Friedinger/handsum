# Handsum

A browser-based multiplayer card game prototype for 2 to 8 players. Players join a round via a shared link; the game runs peer-to-peer in the browser without a game server.

> **Unofficial fan project, not affiliated with the original publisher.**

## Status

Early prototype, work in progress.

## Development

```bash
npm install
npm run dev
```

A local debug page to control all players in one browser is available at `http://localhost:5173/hotseat.html` while the dev server runs.

| Command                | Purpose                       |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Start the dev server          |
| `npm run build`        | Type-check and build to dist/ |
| `npm test`             | Run unit tests                |
| `npm run lint`         | Lint with ESLint              |
| `npm run format`       | Format with Prettier          |
| `npm run format:check` | Check formatting              |

## Privacy

No accounts, no tracking, no external fonts or CDNs. A random player ID and your chosen name are stored in your browser's localStorage.

## Contact

Questions, feedback or concerns: please open a [GitHub issue](https://github.com/Friedinger/handsum/issues).

## License

The code is licensed under the [MIT License](LICENSE).
