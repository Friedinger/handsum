<?php

declare(strict_types=1);

namespace Handsum;

final class RateLimiter
{
    private readonly string $dir;

    /** @param \Closure(): int $clock */
    public function __construct(string $dataDir, private readonly \Closure $clock)
    {
        $this->dir = $dataDir . '/limits';
        ensureDirectory($this->dir);
    }

    /** Counts one hit and returns whether it is still within the limit. */
    public function allow(string $ip, string $bucket, int $limit, int $windowSeconds): bool
    {
        $path = $this->dir . '/' . $this->key($ip, $bucket);
        $handle = fopen($path, 'c+');
        if ($handle === false) {
            return false;
        }
        flock($handle, LOCK_EX);
        $now = ($this->clock)();
        $stored = json_decode((string) stream_get_contents($handle), true);
        $inWindow = is_array($stored) && $stored['start'] > $now - $windowSeconds;
        $windowStart = $inWindow ? $stored['start'] : $now;
        $count = $inWindow ? $stored['count'] : 0;
        $count++;
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode(['start' => $windowStart, 'count' => $count], JSON_THROW_ON_ERROR));
        fflush($handle);
        touch($path, $now);
        flock($handle, LOCK_UN);
        fclose($handle);
        return $count <= $limit;
    }

    public function deleteExpired(): void
    {
        $threshold = ($this->clock)() - max(Config::REQUEST_WINDOW_SECONDS, Config::ROOM_CREATION_WINDOW_SECONDS);
        foreach (glob($this->dir . '/*') ?: [] as $path) {
            if (is_file($path) && filemtime($path) < $threshold) {
                unlink($path);
            }
        }
    }

    // The day is part of the hash so stored keys cannot be linked across days.
    private function key(string $ip, string $bucket): string
    {
        return hash('sha256', $ip . '|' . gmdate('Y-m-d', ($this->clock)())) . '-' . $bucket;
    }
}
