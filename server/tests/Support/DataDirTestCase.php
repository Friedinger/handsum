<?php

declare(strict_types=1);

namespace Handsum\Tests\Support;

use PHPUnit\Framework\TestCase;

abstract class DataDirTestCase extends TestCase
{
    protected const START_TIME = 1_700_000_000;

    protected string $dataDir;
    protected int $now = self::START_TIME;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/handsum-test-' . bin2hex(random_bytes(6));
        mkdir($this->dataDir);
    }

    protected function tearDown(): void
    {
        self::removeTree($this->dataDir);
    }

    /** @return \Closure(): int */
    protected function clock(): \Closure
    {
        return fn(): int => $this->now;
    }

    private static function removeTree(string $dir): void
    {
        foreach (glob($dir . '/*') ?: [] as $path) {
            is_dir($path) ? self::removeTree($path) : unlink($path);
        }
        rmdir($dir);
    }
}
