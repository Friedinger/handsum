<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Config;
use Handsum\ErrorLog;
use Handsum\Tests\Support\WithDataDir;
use PHPUnit\Framework\TestCase;

final class ErrorLogTest extends TestCase
{
    use WithDataDir;

    public function testErrorsAreLoggedToTheDataDirectory(): void
    {
        ErrorLog::write(new \RuntimeException('boom'), $this->dataDir);

        self::assertStringContainsString('boom', (string) file_get_contents($this->dataDir . '/' . Config::ERROR_LOG_FILE));
    }

    public function testNothingIsWrittenOutsideTheDataDirectory(): void
    {
        $fallback = sys_get_temp_dir() . '/handsum-' . Config::ERROR_LOG_FILE;
        @unlink($fallback);

        ErrorLog::write(new \RuntimeException('boom'), $this->dataDir . '/missing');

        self::assertFileDoesNotExist($fallback);
    }

    public function testOversizedLogIsRestartedInsteadOfGrowing(): void
    {
        $path = $this->dataDir . '/' . Config::ERROR_LOG_FILE;
        file_put_contents($path, str_repeat('x', Config::MAX_ERROR_LOG_BYTES + 1));

        ErrorLog::write(new \RuntimeException('fresh'), $this->dataDir);

        self::assertLessThan(Config::MAX_ERROR_LOG_BYTES, filesize($path));
        self::assertStringContainsString('fresh', (string) file_get_contents($path));
    }
}
