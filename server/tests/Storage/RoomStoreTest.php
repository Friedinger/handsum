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
        $store->append(self::roomId(), 0, '{"type":"a"}');
        $store->joinPlayer(self::roomId(self::PLAYERS_ROOM_CODE), ['playerId' => 'p1', 'name' => 'Anna']);
        $this->now += Config::ROOM_IDLE_SECONDS + 1;

        $store->deleteIdleRooms();

        self::assertSame(0, $store->roomCount());
        self::assertSame([], glob($this->dataDir . '/rooms/*'));
    }

    public function testUnknownRoomHasAnEmptyLog(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());

        self::assertSame([], $store->moves(self::roomId('NONE22')));
    }

    public function testMovesAreReturnedInAppendOrder(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId();
        $store->append($roomId, 0, '{"type":"a"}');
        $store->append($roomId, 1, '{"type":"b"}');

        self::assertSame(['{"type":"a"}', '{"type":"b"}'], $store->moves($roomId));
    }

    public function testRoomSizeIsCapped(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId('FULL22');
        $filler = json_encode(['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE - 40)], JSON_THROW_ON_ERROR);

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

    public function testSilentPlayersAreNotListed(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        $store->joinPlayer($roomId, ['playerId' => 'p1', 'name' => 'Anna']);
        $this->now += Config::PLAYER_ACTIVE_SECONDS - 1;
        $store->joinPlayer($roomId, ['playerId' => 'p2', 'name' => 'Ben']);
        $this->now += 2;

        self::assertSame([['playerId' => 'p2', 'name' => 'Ben']], $store->activePlayers($roomId));
    }

    public function testSilentPlayersDoNotCountTowardsTheRoomLimit(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
            $store->joinPlayer($roomId, ['playerId' => "p$i", 'name' => "P$i"]);
        }
        $this->now += Config::PLAYER_ACTIVE_SECONDS + 1;

        self::assertNotNull($store->joinPlayer($roomId, ['playerId' => 'late', 'name' => 'Late']));
    }

    public function testUnwritableDataDirectoryRaisesAClearError(): void
    {
        $this->expectException(StorageException::class);
        $this->expectExceptionMessageMatches('/nested/');

        new RoomStore('/dev/null/nested', $this->clock());
    }
}
