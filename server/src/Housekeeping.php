<?php

declare(strict_types=1);

namespace Handsum;

use Handsum\RateLimit\RateLimiter;
use Handsum\Room\Rooms;

/** Deletes expired rooms and counters now and then, because shared hosting has no cron job to do it. */
final class Housekeeping
{
    private const DICE_SIDES = 100;

    /** @param \Closure(): int $roll returns a number from 1 to 100; passed in so tests can decide when to clean up */
    public function __construct(
        private readonly Rooms $rooms,
        private readonly RateLimiter $limiter,
        private readonly \Closure $roll,
    ) {}

    public static function randomRoll(): int
    {
        return random_int(1, self::DICE_SIDES);
    }

    public function maybeRun(): void
    {
        if (($this->roll)() > Config::CLEANUP_PROBABILITY_PERCENT) {
            return;
        }
        $this->rooms->deleteIdle();
        $this->limiter->deleteExpired();
    }
}
