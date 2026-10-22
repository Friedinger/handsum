<?php

declare(strict_types=1);

namespace Handsum\Room;

use Handsum\Config;
use Handsum\Storage\Filesystem;
use Handsum\Storage\LockedFile;
use Handsum\Storage\LockedJsonFile;

final class RoomStore
{
    private readonly string $roomsDir;

    /** @param \Closure(): int $clock */
    public function __construct(string $dataDir, private readonly \Closure $clock)
    {
        $this->roomsDir = $dataDir . '/rooms';
        Filesystem::ensureDirectory($this->roomsDir);
    }

    public function exists(string $roomId): bool
    {
        return is_file($this->logPath($roomId)) || is_file($this->playersPath($roomId));
    }

    public function roomCount(): int
    {
        return count($this->roomFiles());
    }

    /** @return list<string> the whole move log as JSON-encoded moves, the index in the list being the sequence number */
    public function moves(string $roomId): array
    {
        $raw = LockedFile::readShared($this->logPath($roomId));
        return $raw === null || $raw === '' ? [] : explode("\n", rtrim($raw, "\n"));
    }

    /** Appends only if $sequence is the next free index, so duplicates and gaps are rejected. */
    public function append(string $roomId, int $sequence, string $moveJson): AppendResult
    {
        $path = $this->logPath($roomId);
        return LockedFile::withExclusiveLock($path, function ($handle) use ($path, $sequence, $moveJson): AppendResult {
            $existing = LockedFile::contents($handle);
            $length = $existing === '' ? 0 : substr_count($existing, "\n");
            if ($sequence !== $length) {
                return new AppendResult(AppendStatus::Conflict, $length);
            }
            if ($length >= Config::MAX_MOVES_PER_ROOM || strlen($existing) + strlen($moveJson) + 1 > Config::MAX_BYTES_PER_ROOM) {
                return new AppendResult(AppendStatus::RoomFull, $length);
            }
            LockedFile::append($handle, $moveJson . "\n", $path);
            touch($path, ($this->clock)());
            return new AppendResult(AppendStatus::Appended, $length + 1);
        });
    }

    /** @return list<Player>|null null when the room is full */
    public function joinPlayer(string $roomId, Player $player): ?array
    {
        $now = ($this->clock)();
        $stored = LockedJsonFile::update(
            $this->playersPath($roomId),
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
    public function activePlayers(string $roomId): array
    {
        $stored = LockedJsonFile::read($this->playersPath($roomId));
        return $this->players($this->stillActive($stored, ($this->clock)()));
    }

    /** A room is idle only when all of its files are, so waiting players keep their room alive. */
    public function deleteIdleRooms(): void
    {
        $threshold = ($this->clock)() - Config::ROOM_IDLE_SECONDS;
        foreach ($this->roomFiles() as $paths) {
            $modified = array_filter(array_map(static fn(string $path): int|false => @filemtime($path), $paths), is_int(...));
            if ($modified !== [] && max($modified) < $threshold) {
                array_map(static fn(string $path): bool => @unlink($path), $paths);
            }
        }
    }

    /** @return array<string, non-empty-list<string>> file paths per room ID */
    private function roomFiles(): array
    {
        $files = [];
        foreach (glob($this->roomsDir . '/*') ?: [] as $path) {
            if (is_file($path)) {
                $files[pathinfo($path, PATHINFO_FILENAME)][] = $path;
            }
        }
        return $files;
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

    private function logPath(string $roomId): string
    {
        return $this->roomsDir . '/' . $roomId . '.log';
    }

    private function playersPath(string $roomId): string
    {
        return $this->roomsDir . '/' . $roomId . '.players';
    }
}
