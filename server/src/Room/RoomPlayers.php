<?php

declare(strict_types=1);

namespace Handsum\Room;

use Handsum\Config;
use Handsum\Storage\LockedJsonFile;

/** Who is currently in each room; players keep their entry alive by joining again. */
final class RoomPlayers
{
    private const EXTENSION = 'players';

    /** @param \Closure(): int $clock */
    public function __construct(private readonly Rooms $rooms, private readonly \Closure $clock) {}

    /** @return list<Player>|null null when the room is full */
    public function join(string $roomId, Player $player): ?array
    {
        $now = ($this->clock)();
        $stored = LockedJsonFile::update(
            $this->rooms->path($roomId, self::EXTENSION),
            $now,
            function (mixed $stored) use ($player, $now): ?array {
                $others = array_filter(
                    $this->stillActive($stored, $now),
                    static fn(PlayerPresence $presence): bool => $presence->player->playerId !== $player->playerId,
                );
                if (count($others) >= Config::MAX_PLAYERS_PER_ROOM) {
                    return null;
                }
                return array_map(
                    static fn(PlayerPresence $presence): array => $presence->toStored(),
                    [...$others, new PlayerPresence($player, $now)],
                );
            },
        );
        return $stored === null ? null : $this->players($this->stillActive($stored, $now));
    }

    /** @return list<Player> */
    public function active(string $roomId): array
    {
        $stored = LockedJsonFile::read($this->rooms->path($roomId, self::EXTENSION));
        return $this->players($this->stillActive($stored, ($this->clock)()));
    }

    /** @return list<PlayerPresence> */
    private function stillActive(mixed $stored, int $now): array
    {
        $presences = array_map(PlayerPresence::fromStored(...), is_array($stored) ? $stored : []);
        return array_values(array_filter(
            $presences,
            static fn(?PlayerPresence $presence): bool => $presence !== null && $presence->seen > $now - Config::PLAYER_ACTIVE_SECONDS,
        ));
    }

    /**
     * @param list<PlayerPresence> $presences
     * @return list<Player>
     */
    private function players(array $presences): array
    {
        return array_map(static fn(PlayerPresence $presence): Player => $presence->player, $presences);
    }
}
