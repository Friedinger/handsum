<?php

declare(strict_types=1);

namespace Handsum\RateLimit;

use Handsum\Config;
use Handsum\Storage\Filesystem;
use Handsum\Storage\InstallationSecret;
use Handsum\Storage\LockedJsonFile;

final class RateLimiter
{
    private readonly string $dir;
    private readonly string $secret;

    /** @param \Closure(): int $clock */
    public function __construct(string $dataDir, private readonly \Closure $clock)
    {
        $this->dir = $dataDir . '/limits';
        Filesystem::ensureDirectory($this->dir);
        $this->secret = InstallationSecret::load($dataDir, ($this->clock)());
    }

    /** Counts one hit and returns whether it is still within the limit. */
    public function allow(string $ip, string $bucket, int $limit, int $windowSeconds): bool
    {
        $path = $this->dir . '/' . $this->key($ip, $bucket);
        $now = ($this->clock)();
        $stored = LockedJsonFile::update(
            $path,
            $now,
            static function (mixed $stored) use ($now, $windowSeconds): array {
                $window = RateWindow::fromStored($stored);
                $current = $window !== null && $window->isOpenAt($now, $windowSeconds)
                    ? $window->withOneMoreHit()
                    : new RateWindow($now, 1);
                return $current->toStored();
            },
        );
        $window = RateWindow::fromStored($stored);
        return $window !== null && $window->count <= $limit;
    }

    public function deleteExpired(): void
    {
        $threshold = ($this->clock)() - max(Config::REQUEST_WINDOW_SECONDS, Config::ROOM_CREATION_WINDOW_SECONDS);
        Filesystem::deleteFilesOlderThan($this->dir, $threshold);
    }

    /** The day is part of the hash so stored keys cannot be linked across days. */
    private function key(string $ip, string $bucket): string
    {
        $day = gmdate('Y-m-d', ($this->clock)());
        return hash_hmac('sha256', ClientAddress::rateLimitKey($ip) . '|' . $day, $this->secret) . '-' . $bucket;
    }
}
