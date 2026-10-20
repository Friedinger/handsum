<?php

declare(strict_types=1);

namespace Handsum;

use Handsum\Storage\Filesystem;
use Handsum\Storage\LockedJsonFile;

final class RateLimiter
{
    private readonly string $dir;

    /** @param \Closure(): int $clock */
    public function __construct(string $dataDir, private readonly \Closure $clock)
    {
        $this->dir = $dataDir . '/limits';
        Filesystem::ensureDirectory($this->dir);
    }

    /** Counts one hit and returns whether it is still within the limit. */
    public function allow(string $ip, string $bucket, int $limit, int $windowSeconds): bool
    {
        $path = $this->dir . '/' . $this->key($ip, $bucket);
        $now = ($this->clock)();
        $window = LockedJsonFile::update(
            $path,
            $now,
            static function (mixed $stored) use ($now, $windowSeconds): array {
                $inWindow = is_array($stored) && $stored['start'] > $now - $windowSeconds;
                return $inWindow
                    ? ['start' => $stored['start'], 'count' => $stored['count'] + 1]
                    : ['start' => $now, 'count' => 1];
            },
        );
        return $window['count'] <= $limit;
    }

    public function deleteExpired(): void
    {
        $threshold = ($this->clock)() - max(Config::REQUEST_WINDOW_SECONDS, Config::ROOM_CREATION_WINDOW_SECONDS);
        Filesystem::deleteFilesOlderThan($this->dir, $threshold);
    }

    /** The day is part of the hash so stored keys cannot be linked across days. */
    private function key(string $ip, string $bucket): string
    {
        return hash('sha256', $ip . '|' . gmdate('Y-m-d', ($this->clock)())) . '-' . $bucket;
    }
}
