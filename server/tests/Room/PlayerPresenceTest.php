<?php

declare(strict_types=1);

namespace Handsum\Tests\Room;

use Handsum\Room\Player;
use Handsum\Room\PlayerPresence;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PlayerPresenceTest extends TestCase
{
    public function testStoredFormRoundTrips(): void
    {
        $presence = new PlayerPresence(new Player('p1', 'Anna'), 100);

        self::assertEquals($presence, PlayerPresence::fromStored($presence->toStored()));
    }

    /** @return array<string, array{mixed}> */
    public static function malformedStoredPresences(): array
    {
        return [
            'not an array' => ['text'],
            'missing name' => [['playerId' => 'p1', 'seen' => 1]],
            'numeric id' => [['playerId' => 1, 'name' => 'Anna', 'seen' => 1]],
            'string seen' => [['playerId' => 'p1', 'name' => 'Anna', 'seen' => '1']],
        ];
    }

    #[DataProvider('malformedStoredPresences')]
    public function testMalformedStoredDataIsRejected(mixed $stored): void
    {
        self::assertNull(PlayerPresence::fromStored($stored));
    }
}
