<?php

declare(strict_types=1);

namespace Handsum\Tests\Room;

use Handsum\Config;
use Handsum\Room\AppendStatus;
use Handsum\Room\Player;
use Handsum\Room\RoomStore;
use Handsum\Storage\StorageException;
use Handsum\Tests\Support\DataDirTestCase;

final class RoomStoreTest extends DataDirTestCase
{
    public function testIdleRoomsAreDeleted(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $store->append(self::roomId(), 0, '{"type":"a"}');
        $store->joinPlayer(self::roomId(self::PLAYERS_ROOM_CODE), new Player('p1', 'Anna'));
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

    public function testRoomWithActivePlayersKeepsItsOldLog(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId();
        $store->append($roomId, 0, '{"type":"a"}');
        $this->now += Config::ROOM_IDLE_SECONDS - 1;
        $store->joinPlayer($roomId, new Player('p1', 'Anna'));
        $this->now += 2;

        $store->deleteIdleRooms();

        self::assertSame(['{"type":"a"}'], $store->moves($roomId));
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
        $store->joinPlayer($roomId, new Player('p1', 'Anna'));
        $this->now += Config::PLAYER_ACTIVE_SECONDS - 1;
        $store->joinPlayer($roomId, new Player('p2', 'Ben'));
        $this->now += 2;

        self::assertEquals([new Player('p2', 'Ben')], $store->activePlayers($roomId));
    }

    public function testSilentPlayersDoNotCountTowardsTheRoomLimit(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
            $store->joinPlayer($roomId, new Player("p$i", "P$i"));
        }
        $this->now += Config::PLAYER_ACTIVE_SECONDS + 1;

        self::assertNotNull($store->joinPlayer($roomId, new Player('late', 'Late')));
    }

    public function testCorruptedPlayerEntriesAreIgnored(): void
    {
        $store = new RoomStore($this->dataDir, $this->clock());
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        $store->joinPlayer($roomId, new Player('p1', 'Anna'));
        $valid = json_decode((string) file_get_contents($this->dataDir . '/rooms/' . $roomId . '.players'), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($valid);
        file_put_contents(
            $this->dataDir . '/rooms/' . $roomId . '.players',
            json_encode(['garbage', ['playerId' => 7], ...$valid], JSON_THROW_ON_ERROR),
        );

        self::assertEquals([new Player('p1', 'Anna')], $store->activePlayers($roomId));
    }

    public function testUnwritableDataDirectoryRaisesAClearError(): void
    {
        $this->expectException(StorageException::class);
        $this->expectExceptionMessageMatches('/nested/');

        new RoomStore('/dev/null/nested', $this->clock());
    }
}
