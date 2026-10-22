<?php

declare(strict_types=1);

namespace Handsum\Tests\Room;

use Handsum\Config;
use Handsum\Room\Player;
use Handsum\Room\PlayerList;
use Handsum\Room\Rooms;
use Handsum\Tests\WithDataDir;
use PHPUnit\Framework\TestCase;

final class PlayerListTest extends TestCase
{
    use WithDataDir;

    private PlayerList $players;

    protected function setUp(): void
    {
        $this->players = new PlayerList(new Rooms($this->dataDir, $this->clock()), $this->clock());
    }

    public function testSilentPlayersAreNotListed(): void
    {
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        $this->players->join($roomId, new Player('p1', 'Anna'));
        $this->now += Config::PLAYER_ACTIVE_SECONDS - 1;
        $this->players->join($roomId, new Player('p2', 'Ben'));
        $this->now += 2;

        self::assertEquals([new Player('p2', 'Ben')], $this->players->active($roomId));
    }

    public function testSilentPlayersDoNotCountTowardsTheRoomLimit(): void
    {
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
            $this->players->join($roomId, new Player("p$i", "P$i"));
        }
        $this->now += Config::PLAYER_ACTIVE_SECONDS + 1;

        self::assertNotNull($this->players->join($roomId, new Player('late', 'Late')));
    }

    public function testAFullRoomRefusesANewPlayer(): void
    {
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
            $this->players->join($roomId, new Player("p$i", "P$i"));
        }

        self::assertNull($this->players->join($roomId, new Player('late', 'Late')));
    }

    public function testRejoiningReplacesTheEntry(): void
    {
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        $this->players->join($roomId, new Player('p1', 'Anna'));

        $this->players->join($roomId, new Player('p1', 'Anna B'));

        self::assertEquals([new Player('p1', 'Anna B')], $this->players->active($roomId));
    }

    public function testCorruptedPlayerEntriesAreIgnored(): void
    {
        $roomId = self::roomId(self::PLAYERS_ROOM_CODE);
        $this->players->join($roomId, new Player('p1', 'Anna'));
        $valid = json_decode((string) file_get_contents($this->dataDir . '/rooms/' . $roomId . '.players'), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($valid);
        file_put_contents(
            $this->dataDir . '/rooms/' . $roomId . '.players',
            json_encode(['garbage', ['playerId' => 7], ...$valid], JSON_THROW_ON_ERROR),
        );

        self::assertEquals([new Player('p1', 'Anna')], $this->players->active($roomId));
    }
}
