# Privacy

No accounts, no tracking, no external fonts or CDNs. A random player ID and your chosen name are stored in your browser's localStorage.

The server stores only:

| Data                                                             | Kept until                                          |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Room log: hashed room ID, moves, player names and IDs, game seed | 6 hours after the last move or join, then deleted   |
| Player list of a room: ID, name, last seen                       | Same as the room; entries vanish 90 seconds earlier |
| Rate limit counters: keyed hash of IP network and day, count     | At most 1 hour after the last request               |
| Error log: exception messages without IP addresses or room data  | Capped at 100 KB, deleted by hand                   |

Expired data is removed by a cleanup that runs with a small share of the requests, so it can stay a little longer when nobody is playing. IP addresses are never stored in clear text: the counters use an HMAC with a random secret that is created once in the data folder, and IPv6 addresses count per /64 network. The secret lives in the same data folder as the counters, so the keyed hash only protects against leaks of the counters alone (for example a partial backup), not against someone who can read the whole data folder. Limits (rooms, moves, sizes, request rates, lifetimes) are constants in `server/src/Config.php`.
