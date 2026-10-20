<?php

declare(strict_types=1);

namespace Handsum\Tests\Storage;

use Handsum\Config;
use Handsum\Storage\AppendStatus;
use Handsum\Storage\RoomStore;
use Handsum\Storage\StorageException;
use Handsum\Tests\Support\DataDirTestCase;

final class RoomStoreTest extends DataDirTestCase
{
    public function testIdleRoomsAreDeleted(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $store->append(hash('sha256', 'ABC234'), 0, '{"type":"a"}');
        $store->joinPlayer(hash('sha256', 'JOIN22'), ['playerId' => 'p1', 'name' => 'Anna']);
        $this->now += Config::ROOM_IDLE_SECONDS + 1;

        $store->deleteIdleRooms();

        self::assertSame(0, $store->roomCount());
        self::assertSame([], glob($this->dataDir . '/rooms/*'));
    }

    public function testUnknownRoomHasAnEmptyLog(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());

        self::assertSame([], $store->moves(hash('sha256', 'NONE22')));
    }

    public function testMovesAreReturnedInAppendOrder(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = hash('sha256', 'ABC234');
        $store->append($roomId, 0, '{"type":"a"}');
        $store->append($roomId, 1, '{"type":"b"}');

        self::assertSame(['{"type":"a"}', '{"type":"b"}'], $store->moves($roomId));
    }

    public function testRoomSizeIsCapped(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = hash('sha256', 'FULL22');
        $filler = json_encode(['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE - 40)]);

        $result = null;
        for ($sequence = 0; $sequence < Config::MAX_MOVES_PER_ROOM + 1; $sequence++) {
            $result = $store->append($roomId, $sequence, $filler);
            if ($result->status === AppendStatus::RoomFull) {
                break;
            }
        }

        self::assertSame(AppendStatus::RoomFull, $result->status);
        self::assertLessThanOrEqual(Config::MAX_BYTES_PER_ROOM, $result->length * strlen($filler));
    }

    public function testUnwritableDataDirectoryRaisesAClearError(): void
    {
        $this->expectException(StorageException::class);
        $this->expectExceptionMessageMatches('/nested/');

        new RoomStore('/dev/null/nested', $this->clock());
    }
}
