<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Application;
use Handsum\Config;
use Handsum\Tests\Support\WithDataDir;
use Handsum\Web\ErrorCode;
use PHPUnit\Framework\TestCase;

final class ApplicationTest extends TestCase
{
    use WithDataDir;

    public function testRequestsAreHandledByTheApi(): void
    {
        $application = new Application($this->dataDir, $this->clock());

        $response = $application->handle('GET', self::roomHeader(), [], '', '1.1.1.1');

        self::assertSame(200, $response->status);
    }

    public function testIdleRoomsAreCleanedUpAfterARequest(): void
    {
        $this->createIdleRoom();
        $cleaning = new Application($this->dataDir, $this->clock(), static fn(): int => 1);

        $cleaning->handle('GET', self::roomHeader('OTHER2'), [], '', '1.1.1.1');

        self::assertSame([], glob($this->dataDir . '/rooms/*'));
    }

    public function testRateLimitedRequestsDoNotTriggerACleanup(): void
    {
        $this->createIdleRoom();
        $cleaning = new Application($this->dataDir, $this->clock(), static fn(): int => 1);
        $limitFiller = new Application($this->dataDir, $this->clock(), static fn(): int => 100);
        for ($i = 0; $i < Config::REQUESTS_PER_IP_PER_WINDOW; $i++) {
            $limitFiller->handle('GET', self::roomHeader('OTHER2'), [], '', '2.2.2.2');
        }

        $limited = $cleaning->handle('GET', self::roomHeader('OTHER2'), [], '', '2.2.2.2');

        self::assertSame(429, $limited->status);
        self::assertNotSame([], glob($this->dataDir . '/rooms/*'));
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

    private function createIdleRoom(): void
    {
        $creator = new Application($this->dataDir, $this->clock(), static fn(): int => 100);
        $creator->handle('POST', self::roomHeader(), ['action' => 'move'], '{"sequence":0,"move":{"type":"a"}}', '9.9.9.9');
        foreach (glob($this->dataDir . '/rooms/*') ?: [] as $path) {
            touch($path, $this->now - Config::ROOM_IDLE_SECONDS - 1);
        }
    }
}
