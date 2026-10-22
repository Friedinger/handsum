<?php

declare(strict_types=1);

namespace Handsum\Tests\Room;

use Handsum\Config;
use Handsum\Room\MoveLog;
use Handsum\Room\Player;
use Handsum\Room\PlayerList;
use Handsum\Room\Rooms;
use Handsum\Storage\StorageException;
use Handsum\Tests\Support\WithDataDir;
use PHPUnit\Framework\TestCase;

final class RoomsTest extends TestCase
{
    use WithDataDir;

    public function testARoomExistsOnceItHasAnyFile(): void
    {
        $rooms = new Rooms($this->dataDir, $this->clock());
        (new PlayerList($rooms, $this->clock()))->join(self::roomId(self::PLAYERS_ROOM_CODE), new Player('p1', 'Anna'));

        self::assertTrue($rooms->exists(self::roomId(self::PLAYERS_ROOM_CODE)));
        self::assertFalse($rooms->exists(self::roomId('NONE22')));
    }

    public function testAFolderOrAForeignNameIsNoRoom(): void
    {
        $rooms = new Rooms($this->dataDir, $this->clock());
        mkdir($this->dataDir . '/rooms/' . self::roomId() . '.log');

        self::assertFalse($rooms->exists(self::roomId()));
    }

    public function testRoomsAreCountedOnceEvenWithSeveralFiles(): void
    {
        $rooms = new Rooms($this->dataDir, $this->clock());
        (new MoveLog($rooms, $this->clock()))->append(self::roomId(), 0, '{"type":"a"}');
        (new PlayerList($rooms, $this->clock()))->join(self::roomId(), new Player('p1', 'Anna'));

        self::assertSame(1, $rooms->count());
    }

    public function testIdleRoomsAreDeleted(): void
    {
        $rooms = new Rooms($this->dataDir, $this->clock());
        (new MoveLog($rooms, $this->clock()))->append(self::roomId(), 0, '{"type":"a"}');
        (new PlayerList($rooms, $this->clock()))->join(self::roomId(self::PLAYERS_ROOM_CODE), new Player('p1', 'Anna'));
        $this->now += Config::ROOM_IDLE_SECONDS + 1;

        $rooms->deleteIdle();

        self::assertSame(0, $rooms->count());
        self::assertSame([], glob($this->dataDir . '/rooms/*'));
    }

    public function testARoomWithActivePlayersKeepsItsOldLog(): void
    {
        $rooms = new Rooms($this->dataDir, $this->clock());
        $log = new MoveLog($rooms, $this->clock());
        $roomId = self::roomId();
        $log->append($roomId, 0, '{"type":"a"}');
        $this->now += Config::ROOM_IDLE_SECONDS - 1;
        (new PlayerList($rooms, $this->clock()))->join($roomId, new Player('p1', 'Anna'));
        $this->now += 2;

        $rooms->deleteIdle();

        self::assertSame(['{"type":"a"}'], $log->moves($roomId));
    }

    public function testRoomFilesGetTheRoomIdAndTheExtension(): void
    {
        $rooms = new Rooms($this->dataDir, $this->clock());

        self::assertSame($this->dataDir . '/rooms/abc.log', $rooms->path('abc', 'log'));
    }

    public function testUnwritableDataDirectoryRaisesAClearError(): void
    {
        $this->expectException(StorageException::class);
        $this->expectExceptionMessageMatches('/nested/');

        new Rooms('/dev/null/nested', $this->clock());
    }
}
