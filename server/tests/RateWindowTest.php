<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\RateWindow;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class RateWindowTest extends TestCase
{
    public function testStoredFormRoundTrips(): void
    {
        $window = new RateWindow(100, 3);

        self::assertEquals($window, RateWindow::fromStored($window->toStored()));
    }

    /** @return array<string, array{mixed}> */
    public static function malformedStoredWindows(): array
    {
        return [
            'not an array' => ['text'],
            'missing count' => [['start' => 1]],
            'string start' => [['start' => '1', 'count' => 1]],
            'null' => [null],
        ];
    }

    #[DataProvider('malformedStoredWindows')]
    public function testMalformedStoredDataIsRejected(mixed $stored): void
    {
        self::assertNull(RateWindow::fromStored($stored));
    }

    public function testWindowIsOpenUntilItsDurationHasPassed(): void
    {
        $window = new RateWindow(100, 1);

        self::assertTrue($window->isOpenAt(159, 60));
        self::assertFalse($window->isOpenAt(160, 60));
    }

    public function testHitsAreCountedWithoutMovingTheStart(): void
    {
        $window = (new RateWindow(100, 1))->withOneMoreHit();

        self::assertEquals(new RateWindow(100, 2), $window);
    }
}
