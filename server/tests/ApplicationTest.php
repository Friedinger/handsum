<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Application;
use Handsum\Config;
use Handsum\ErrorCode;
use Handsum\Tests\Support\DataDirTestCase;

final class ApplicationTest extends DataDirTestCase
{
    public function testRequestsAreHandledByTheApi(): void
    {
        $application = new Application($this->dataDir, $this->clock());

        $response = $application->handle('GET', self::roomHeader(), [], '', '1.1.1.1');

        self::assertSame(200, $response->status);
    }

    public function testUnwritableStorageIsReportedAndLogged(): void
    {
        file_put_contents($this->dataDir . '/rooms', 'blocks the rooms directory');
        $application = new Application($this->dataDir, $this->clock());

        $response = $application->handle('GET', self::roomHeader(), [], '', '1.1.1.1');

        self::assertSame(500, $response->status);
        self::assertSame(ErrorCode::StorageNotWritable->value, $response->payload['error']);
        self::assertFileExists($this->dataDir . '/' . Config::ERROR_LOG_FILE);
    }
}
