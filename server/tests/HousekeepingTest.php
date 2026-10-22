<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Config;
use Handsum\Housekeeping;
use Handsum\RateLimit\RateLimiter;
use Handsum\Room\MoveLog;
use Handsum\Room\Rooms;
use Handsum\Tests\Support\WithDataDir;
use PHPUnit\Framework\TestCase;

final class HousekeepingTest extends TestCase
{
    use WithDataDir;

    private Rooms $rooms;
    private RateLimiter $limiter;

    protected function setUp(): void
    {
        $this->rooms = new Rooms($this->dataDir, $this->clock());
        $this->limiter = new RateLimiter($this->dataDir, $this->clock());
        (new MoveLog($this->rooms, $this->clock()))->append(self::roomId(), 0, '{"type":"a"}');
        $this->limiter->allow('1.1.1.1', 'requests', 1, 60);
        $this->now += Config::ROOM_IDLE_SECONDS + Config::ROOM_CREATION_WINDOW_SECONDS + 1;
    }

    public function testExpiredDataIsDeletedWhenTheRollIsLow(): void
    {
        (new Housekeeping($this->rooms, $this->limiter, static fn(): int => Config::CLEANUP_PROBABILITY_PERCENT))->maybeRun();

        self::assertSame(0, $this->rooms->count());
        self::assertSame([], glob($this->dataDir . '/limits/*'));
    }

    public function testNothingHappensWhenTheRollIsHigh(): void
    {
        (new Housekeeping($this->rooms, $this->limiter, static fn(): int => Config::CLEANUP_PROBABILITY_PERCENT + 1))->maybeRun();

        self::assertSame(1, $this->rooms->count());
    }

    public function testTheRandomRollStaysWithinTheDice(): void
    {
        for ($i = 0; $i < 200; $i++) {
            self::assertGreaterThanOrEqual(1, Housekeeping::randomRoll());
            self::assertLessThanOrEqual(100, Housekeeping::randomRoll());
        }
    }
}
