<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Config;
use Handsum\ErrorLog;
use Handsum\Tests\Support\DataDirTestCase;

final class ErrorLogTest extends DataDirTestCase
{
    public function testErrorsAreLoggedToTheDataDirectory(): void
    {
        ErrorLog::write(new \RuntimeException('boom'), $this->dataDir);

        self::assertStringContainsString('boom', (string) file_get_contents($this->dataDir . '/' . Config::ERROR_LOG_FILE));
    }
}
