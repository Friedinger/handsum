<?php

declare(strict_types=1);

namespace Handsum;

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
        $ids = array_map(
            static fn(string $path): string => pathinfo($path, PATHINFO_FILENAME),
            glob($this->roomsDir . '/*') ?: [],
        );
        return count(array_unique($ids));
    }

    /** @return list<string> JSON-encoded moves from index $since on */
    public function movesSince(string $roomId, int $since): array
    {
        return array_slice($this->readLines($roomId), $since);
    }

    public function length(string $roomId): int
    {
        return count($this->readLines($roomId));
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

    /**
     * @param array{playerId: string, name: string} $player
     * @return list<array{playerId: string, name: string}>|null null when the room is full
     */
    public function joinPlayer(string $roomId, array $player): ?array
    {
        $now = ($this->clock)();
        $stored = LockedJsonFile::update(
            $this->playersPath($roomId),
            $now,
            function (mixed $stored) use ($player, $now): ?array {
                $others = array_filter(
                    is_array($stored) ? $stored : [],
                    static fn(array $entry): bool => $entry['playerId'] !== $player['playerId']
                        && $entry['seen'] > $now - Config::PLAYER_ACTIVE_SECONDS,
                );
                return count($others) < Config::MAX_PLAYERS_PER_ROOM
                    ? [...$others, [...$player, 'seen' => $now]]
                    : null;
            },
        );
        return $stored === null ? null : $this->publicPlayers($stored);
    }

    /** @return list<array{playerId: string, name: string}> */
    public function activePlayers(string $roomId): array
    {
        $raw = @file_get_contents($this->playersPath($roomId));
        $stored = json_decode($raw === false ? '' : $raw, true);
        $now = ($this->clock)();
        return $this->publicPlayers(array_filter(
            is_array($stored) ? $stored : [],
            static fn(array $entry): bool => $entry['seen'] > $now - Config::PLAYER_ACTIVE_SECONDS,
        ));
    }

    public function deleteIdleRooms(): void
    {
        $threshold = ($this->clock)() - Config::ROOM_IDLE_SECONDS;
        foreach (glob($this->roomsDir . '/*') ?: [] as $path) {
            if (is_file($path) && filemtime($path) < $threshold) {
                unlink($path);
            }
        }
    }

    /**
     * @param list<array{playerId: string, name: string, seen: int}> $entries
     * @return list<array{playerId: string, name: string}>
     */
    private function publicPlayers(array $entries): array
    {
        return array_map(
            static fn(array $entry): array => ['playerId' => $entry['playerId'], 'name' => $entry['name']],
            $entries,
        );
    }

    /** @return list<string> */
    private function readLines(string $roomId): array
    {
        $raw = @file_get_contents($this->logPath($roomId));
        return $raw === false || $raw === '' ? [] : explode("\n", rtrim($raw, "\n"));
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
