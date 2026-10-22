<?php

declare(strict_types=1);

namespace Handsum\Room;

use Handsum\Config;
use Handsum\Storage\Filesystem;

/**
 * The folder of all rooms. A room has no file of its own: each kind of data lives in
 * `<room ID>.<extension>`, and this class owns that naming rule.
 */
final class Rooms
{
    private readonly string $directory;

    /** @param \Closure(): int $clock */
    public function __construct(string $dataDir, private readonly \Closure $clock)
    {
        $this->directory = $dataDir . '/rooms';
        Filesystem::ensureDirectory($this->directory);
    }

    /** The room ID is checked against a fixed pattern before it gets here, so it cannot leave the folder. */
    public function path(string $roomId, string $extension): string
    {
        return $this->directory . '/' . $roomId . '.' . $extension;
    }

    public function exists(string $roomId): bool
    {
        return glob($this->directory . '/' . $roomId . '.*') !== [];
    }

    public function count(): int
    {
        return count($this->filesPerRoom());
    }

    /** A room is idle only when all of its files are, so waiting players keep their room alive. */
    public function deleteIdle(): void
    {
        $threshold = ($this->clock)() - Config::ROOM_IDLE_SECONDS;
        foreach ($this->filesPerRoom() as $paths) {
            $modified = array_filter(array_map(static fn(string $path): int|false => @filemtime($path), $paths), is_int(...));
            if ($modified !== [] && max($modified) < $threshold) {
                array_map(static fn(string $path): bool => @unlink($path), $paths);
            }
        }
    }

    /** @return array<string, non-empty-list<string>> file paths per room ID */
    private function filesPerRoom(): array
    {
        $files = [];
        foreach (glob($this->directory . '/*') ?: [] as $path) {
            if (is_file($path)) {
                $files[pathinfo($path, PATHINFO_FILENAME)][] = $path;
            }
        }
        return $files;
    }
}
