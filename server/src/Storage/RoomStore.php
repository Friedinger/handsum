<?php

declare(strict_types=1);

namespace Handsum\Storage;

use Handsum\Config;

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
        $raw = @file_get_contents($this->logPath($roomId));
        return $raw === false || $raw === '' ? [] : explode("\n", rtrim($raw, "\n"));
    }

    /** Appends only if $sequence is the next free index, so duplicates and gaps are rejected. */
    public function append(string $roomId, int $sequence, string $moveJson): AppendResult
    {
        $handle = @fopen($this->logPath($roomId), 'c+');
        if ($handle === false) {
            throw new StorageException('Cannot open room log');
        }
        flock($handle, LOCK_EX);
        $existing = stream_get_contents($handle);
        $length = $existing === '' ? 0 : substr_count((string) $existing, "\n");
        $size = strlen((string) $existing);
        $result = match (true) {
            $sequence !== $length => new AppendResult(AppendStatus::Conflict, $length),
            $length >= Config::MAX_MOVES_PER_ROOM,
            $size + strlen($moveJson) + 1 > Config::MAX_BYTES_PER_ROOM => new AppendResult(AppendStatus::RoomFull, $length),
            default => $this->write($handle, $roomId, $moveJson, $length),
        };
        flock($handle, LOCK_UN);
        fclose($handle);
        return $result;
    }

    /** @param resource $handle */
    private function write($handle, string $roomId, string $moveJson, int $length): AppendResult
    {
        fseek($handle, 0, SEEK_END);
        fwrite($handle, $moveJson . "\n");
        fflush($handle);
        touch($this->logPath($roomId), ($this->clock)());
        return new AppendResult(AppendStatus::Appended, $length + 1);
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
        $raw = @file_get_contents($this->playersPath($roomId));
        $stored = json_decode($raw === false ? '' : $raw, true);
        return $this->players($this->stillActive($stored, ($this->clock)()));
    }

    /** A room is idle only when all of its files are, so waiting players keep their room alive. */
    public function deleteIdleRooms(): void
    {
        $threshold = ($this->clock)() - Config::ROOM_IDLE_SECONDS;
        foreach ($this->roomFiles() as $paths) {
            $lastChange = max(array_map(filemtime(...), $paths));
            if ($lastChange < $threshold) {
                array_map(unlink(...), $paths);
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
