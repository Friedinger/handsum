<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Config;
use PHPUnit\Framework\Attributes\After;
use PHPUnit\Framework\Attributes\Before;

/** Gives a test its own temporary data folder and a fixed clock; use it in a test class next to extending `TestCase`. */
trait WithDataDir
{
    protected const START_TIME = 1_700_000_000;
    protected const MOVES_ROOM_CODE = 'ABC234';
    protected const PLAYERS_ROOM_CODE = 'JOIN22';

    protected string $dataDir;
    protected int $now = self::START_TIME;

    #[Before]
    protected function createDataDir(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/handsum-test-' . bin2hex(random_bytes(6));
        mkdir($this->dataDir);
    }

    #[After]
    protected function removeDataDir(): void
    {
        self::removeTree($this->dataDir);
    }

    /** @return \Closure(): int */
    protected function clock(): \Closure
    {
        return fn(): int => $this->now;
    }

    protected static function roomId(string $code = self::MOVES_ROOM_CODE): string
    {
        return hash('sha256', $code);
    }

    /** @return array<string, string> */
    protected static function roomHeader(string $code = self::MOVES_ROOM_CODE): array
    {
        return [Config::ROOM_ID_HEADER => self::roomId($code)];
    }

    protected static function removeTree(string $dir): void
    {
        foreach (array_diff(scandir($dir) ?: [], ['.', '..']) as $entry) {
            $path = $dir . '/' . $entry;
            is_dir($path) ? self::removeTree($path) : unlink($path);
        }
        rmdir($dir);
    }
}
