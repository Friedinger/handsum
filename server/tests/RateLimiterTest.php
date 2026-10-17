<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Config;
use Handsum\RateLimiter;
use Handsum\Tests\Support\DataDirTestCase;

final class RateLimiterTest extends DataDirTestCase
{
    private const LIMIT = 2;
    private const WINDOW_SECONDS = 60;

    public function testHitsWithinTheLimitAreAllowed(): void
    {
        $limiter = new RateLimiter($this->dataDir, $this->clock());

        self::assertTrue($limiter->allow('1.1.1.1', 'requests', self::LIMIT, self::WINDOW_SECONDS));
        self::assertTrue($limiter->allow('1.1.1.1', 'requests', self::LIMIT, self::WINDOW_SECONDS));
        self::assertFalse($limiter->allow('1.1.1.1', 'requests', self::LIMIT, self::WINDOW_SECONDS));
    }

    public function testBucketsAndIpsAreCountedSeparately(): void
    {
        $limiter = new RateLimiter($this->dataDir, $this->clock());
        $limiter->allow('1.1.1.1', 'requests', 1, self::WINDOW_SECONDS);

        self::assertTrue($limiter->allow('1.1.1.1', 'rooms', 1, self::WINDOW_SECONDS));
        self::assertTrue($limiter->allow('2.2.2.2', 'requests', 1, self::WINDOW_SECONDS));
    }

    public function testTheCounterStartsOverAfterTheWindow(): void
    {
        $limiter = new RateLimiter($this->dataDir, $this->clock());
        $limiter->allow('1.1.1.1', 'requests', 1, self::WINDOW_SECONDS);
        $this->now += self::WINDOW_SECONDS + 1;

        self::assertTrue($limiter->allow('1.1.1.1', 'requests', 1, self::WINDOW_SECONDS));
    }

    public function testExpiredCountersAreDeleted(): void
    {
        $limiter = new RateLimiter($this->dataDir, $this->clock());
        $limiter->allow('1.1.1.1', 'requests', self::LIMIT, self::WINDOW_SECONDS);
        $this->now += max(Config::REQUEST_WINDOW_SECONDS, Config::ROOM_CREATION_WINDOW_SECONDS) + 1;

        $limiter->deleteExpired();

        self::assertSame([], glob($this->dataDir . '/limits/*'));
    }
}
