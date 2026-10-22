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

    public function testTheMoveCountIsCapped(): void
    {
        $roomId = self::roomId('MANY22');
        for ($sequence = 0; $sequence < Config::MAX_MOVES_PER_ROOM; $sequence++) {
            self::assertSame(AppendStatus::Appended, $this->log->append($roomId, $sequence, '{"type":"a"}')->status);
        }

        $result = $this->log->append($roomId, Config::MAX_MOVES_PER_ROOM, '{"type":"a"}');

        self::assertSame(AppendStatus::RoomFull, $result->status);
    }

    public function testTheByteLimitAcceptsTheExactSizeAndRefusesOneByteMore(): void
    {
        $lineBytes = 1000;
        self::assertSame(0, Config::MAX_BYTES_PER_ROOM % $lineBytes);
        $fitting = json_encode(['type' => 'a', 'pad' => str_repeat('x', $lineBytes - 1 - strlen('{"type":"a","pad":""}'))], JSON_THROW_ON_ERROR);
        self::assertSame($lineBytes - 1, strlen($fitting));
        $roomId = self::roomId('EDGE22');
        $moves = Config::MAX_BYTES_PER_ROOM / $lineBytes;
        for ($sequence = 0; $sequence < $moves - 1; $sequence++) {
            $this->log->append($roomId, $sequence, $fitting);
        }
        $oneByteTooMuch = $fitting . ' ';

        self::assertSame(AppendStatus::RoomFull, $this->log->append($roomId, $moves - 1, $oneByteTooMuch)->status);
        self::assertSame(AppendStatus::Appended, $this->log->append($roomId, $moves - 1, $fitting)->status);
        self::assertSame(AppendStatus::RoomFull, $this->log->append($roomId, $moves, '{"type":"a"}')->status);
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
