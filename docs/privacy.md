# Privacy

No accounts, no tracking, no external fonts or CDNs. A random player ID and your chosen name are stored in your browser's localStorage.

The server stores only:

| Data                                                             | Kept until                                          |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Room log: hashed room ID, moves, player names and IDs, game seed | 6 hours after the last move or join, then deleted   |
| Player list of a room: ID, name, last seen                       | Same as the room; entries vanish 90 seconds earlier |
| Rate limit counters: hash of IP address and day, request count   | At most 1 hour after the last request               |
| Error log: exception messages without IP addresses or room data  | Capped at 100 KB, deleted by hand                   |

IP addresses are never stored in clear text. Limits (rooms, moves, sizes, request rates, lifetimes) are constants in `server/src/Config.php`.
