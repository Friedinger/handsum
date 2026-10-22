<?php

declare(strict_types=1);

namespace Handsum\Room;

use Handsum\Config;
use Handsum\Storage\LockedFile;

/** The ordered moves of every room, one JSON-encoded move per line. */
final class MoveLog
{
    private const EXTENSION = 'log';

    /** @param \Closure(): int $clock */
    public function __construct(private readonly Rooms $rooms, private readonly \Closure $clock) {}

    /** @return list<string> the whole move log as JSON-encoded moves, the index in the list being the sequence number */
    public function moves(string $roomId): array
    {
        $raw = LockedFile::readShared($this->rooms->path($roomId, self::EXTENSION));
        return $raw === null || $raw === '' ? [] : explode("\n", rtrim($raw, "\n"));
    }

    /** Appends only if $sequence is the next free index, so duplicates and gaps are rejected. */
    public function append(string $roomId, int $sequence, string $moveJson): AppendResult
    {
        $path = $this->rooms->path($roomId, self::EXTENSION);
        return LockedFile::withExclusiveLock($path, function (LockedFile $file) use ($path, $sequence, $moveJson): AppendResult {
            $existing = $file->readAll();
            $length = $existing === '' ? 0 : substr_count($existing, "\n");
            if ($sequence !== $length) {
                return new AppendResult(AppendStatus::Conflict, $length);
            }
            if ($length >= Config::MAX_MOVES_PER_ROOM || strlen($existing) + strlen($moveJson) + 1 > Config::MAX_BYTES_PER_ROOM) {
                return new AppendResult(AppendStatus::RoomFull, $length);
            }
            $file->append($moveJson . "\n");
            touch($path, ($this->clock)());
            return new AppendResult(AppendStatus::Appended, $length + 1);
        });
    }
}
