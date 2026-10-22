<?php

declare(strict_types=1);

namespace Handsum\Tests\Room;

use Handsum\Config;
use Handsum\Room\AppendStatus;
use Handsum\Room\MoveLog;
use Handsum\Room\Rooms;
use Handsum\Tests\WithDataDir;
use PHPUnit\Framework\TestCase;

final class MoveLogTest extends TestCase
{
    use WithDataDir;

    private MoveLog $log;

    protected function setUp(): void
    {
        $this->log = new MoveLog(new Rooms($this->dataDir, $this->clock()), $this->clock());
    }

    public function testUnknownRoomHasAnEmptyLog(): void
    {
        self::assertSame([], $this->log->moves(self::roomId('NONE22')));
    }

    public function testMovesAreReturnedInAppendOrder(): void
    {
        $roomId = self::roomId();
        $this->log->append($roomId, 0, '{"type":"a"}');
        $this->log->append($roomId, 1, '{"type":"b"}');

        self::assertSame(['{"type":"a"}', '{"type":"b"}'], $this->log->moves($roomId));
    }

    public function testAMoveIsAppendedOnlyAtTheNextFreeSequence(): void
    {
        $roomId = self::roomId();
        $this->log->append($roomId, 0, '{"type":"a"}');

        self::assertSame(AppendStatus::Conflict, $this->log->append($roomId, 0, '{"type":"b"}')->status);
        self::assertSame(AppendStatus::Conflict, $this->log->append($roomId, 2, '{"type":"b"}')->status);
        self::assertSame(['{"type":"a"}'], $this->log->moves($roomId));
    }

    public function testAnAppendFollowsTheClock(): void
    {
        $roomId = self::roomId();
        $this->log->append($roomId, 0, '{"type":"a"}');

        self::assertSame($this->now, filemtime($this->dataDir . '/rooms/' . $roomId . '.log'));
    }

    public function testRoomSizeIsCapped(): void
    {
        $roomId = self::roomId('FULL22');
        $filler = json_encode(['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE - 40)], JSON_THROW_ON_ERROR);

        $result = null;
        for ($sequence = 0; $sequence < Config::MAX_MOVES_PER_ROOM + 1; $sequence++) {
            $result = $this->log->append($roomId, $sequence, $filler);
            if ($result->status === AppendStatus::RoomFull) {
                break;
            }
        }

        self::assertSame(AppendStatus::RoomFull, $result->status);
        self::assertLessThanOrEqual(Config::MAX_BYTES_PER_ROOM, $result->length * strlen($filler));
    }
}
