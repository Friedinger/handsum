<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Api;
use Handsum\Config;
use Handsum\RateLimiter;
use Handsum\RoomStore;
use Handsum\Tests\Support\DataDirTestCase;
use PHPUnit\Framework\Attributes\DataProvider;

final class ApiTest extends DataDirTestCase
{
    private Api $api;

    protected function setUp(): void
    {
        parent::setUp();
        $this->api = new Api(
            new RoomStore($this->dataDir, $this->clock()),
            new RateLimiter($this->dataDir, $this->clock()),
        );
    }

    public function testEmptyRoomReadsAsEmptyLog(): void
    {
        [$status, $body] = $this->call('GET', self::room(), [], '');

        self::assertSame(200, $status);
        self::assertSame(0, $body['length']);
        self::assertSame([], $body['moves']);
    }

    public function testReadingDoesNotCreateARoom(): void
    {
        $this->call('GET', self::room(), [], '');

        self::assertSame([], glob($this->dataDir . '/rooms/*.log'));
    }

    public function testFirstMoveIsAppended(): void
    {
        [$status, $body] = $this->postMove(0, 'startGame');

        self::assertSame(200, $status);
        self::assertSame(1, $body['length']);
    }

    public function testNextSequenceIsAppended(): void
    {
        $this->postMove(0, 'startGame');

        [$status] = $this->postMove(1);

        self::assertSame(200, $status);
    }

    public function testDuplicateSequenceConflicts(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        [$status, $body] = $this->postMove(1);

        self::assertSame(409, $status);
        self::assertSame(2, $body['length']);
    }

    public function testGapConflicts(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        [$status, $body] = $this->postMove(5);

        self::assertSame(409, $status);
        self::assertSame(2, $body['length']);
    }

    public function testSinceReturnsOnlyNewerMoves(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        [, $body] = $this->call('GET', self::room(), ['since' => '1'], '');

        self::assertCount(1, $body['moves']);
        self::assertSame('drawFromDeck', $body['moves'][0]->type);
    }

    public function testSinceAtTheEndReturnsNothing(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        [, $body] = $this->call('GET', self::room(), ['since' => '2'], '');

        self::assertSame([], $body['moves']);
        self::assertSame(2, $body['length']);
    }

    public function testMissingRoomIdIsRejected(): void
    {
        self::assertSame(400, $this->call('GET', [], [], '')[0]);
    }

    public function testPathTraversalRoomIdIsRejected(): void
    {
        $server = [Config::ROOM_ID_HEADER => '../../etc/passwd'];

        self::assertSame(400, $this->call('GET', $server, [], '')[0]);
    }

    public function testUppercaseHexRoomIdIsRejected(): void
    {
        $server = [Config::ROOM_ID_HEADER => strtoupper(hash('sha256', 'x'))];

        self::assertSame(400, $this->call('GET', $server, [], '')[0]);
    }

    public function testInvalidSinceIsRejected(): void
    {
        self::assertSame(400, $this->call('GET', self::room(), ['since' => '-1'], '')[0]);
    }

    public function testUnknownActionIsRejected(): void
    {
        self::assertSame(405, $this->call('POST', self::room(), ['action' => 'nope'], '{}')[0]);
    }

    /** @return array<string, array{string}> */
    public static function malformedMoveBodies(): array
    {
        return [
            'non-JSON body' => ['garbage'],
            'move without type' => ['{"sequence":2,"move":{}}'],
            'list as move' => ['{"sequence":2,"move":[1]}'],
            'string sequence' => ['{"sequence":"2","move":{"type":"a"}}'],
        ];
    }

    #[DataProvider('malformedMoveBodies')]
    public function testMalformedMoveIsRejected(string $body): void
    {
        self::assertSame(400, $this->call('POST', self::room(), ['action' => 'move'], $body)[0]);
    }

    public function testOversizedMoveIsRejected(): void
    {
        $body = json_encode(['sequence' => 2, 'move' => ['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE)]]);

        self::assertSame(413, $this->call('POST', self::room(), ['action' => 'move'], $body)[0]);
    }

    public function testOversizedRequestBodyIsRejected(): void
    {
        $body = str_repeat(' ', Config::MAX_REQUEST_BYTES + 1) . self::moveBody(2);

        self::assertSame(400, $this->call('POST', self::room(), ['action' => 'move'], $body)[0]);
    }

    public function testPlayerJoins(): void
    {
        [$status, $body] = $this->join('p1', 'Anna');

        self::assertSame(200, $status);
        self::assertSame([['playerId' => 'p1', 'name' => 'Anna']], $body['players']);
    }

    public function testRejoiningUpdatesTheName(): void
    {
        $this->join('p1', 'Anna');

        [, $body] = $this->join('p1', 'Anna B');

        self::assertSame([['playerId' => 'p1', 'name' => 'Anna B']], $body['players']);
    }

    public function testPlayersAreListedOnRead(): void
    {
        $this->join('p1', 'Anna');

        [, $body] = $this->call('GET', self::room('JOIN22'), [], '');

        self::assertCount(1, $body['players']);
    }

    /** @return array<string, array{string, string}> */
    public static function invalidPlayers(): array
    {
        return [
            'invalid player id' => ['../x', 'A'],
            'empty name' => ['p9', '  '],
            'too long name' => ['p9', str_repeat('n', Config::MAX_PLAYER_NAME_LENGTH + 1)],
        ];
    }

    #[DataProvider('invalidPlayers')]
    public function testInvalidPlayerIsRejected(string $playerId, string $name): void
    {
        self::assertSame(400, $this->join($playerId, $name)[0]);
    }

    public function testSilentPlayersDisappear(): void
    {
        $this->join('p1', 'Anna');
        $this->now += Config::PLAYER_ACTIVE_SECONDS + 1;

        [, $body] = $this->call('GET', self::room('JOIN22'), [], '');

        self::assertSame([], $body['players']);
    }

    public function testPlayerBeyondTheLimitIsRefused(): void
    {
        for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
            $this->join("q$i", "P$i");
        }

        self::assertSame(409, $this->join('late', 'Late')[0]);
    }

    public function testRoomCreationsWithinTheLimitSucceed(): void
    {
        for ($i = 0; $i < Config::ROOM_CREATIONS_PER_IP_PER_WINDOW; $i++) {
            self::assertSame(200, $this->postMoveFrom("R$i", 0, '2.2.2.2')[0]);
        }
    }

    public function testRoomCreationLimitAppliesPerIp(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');

        self::assertSame(429, $this->postMoveFrom('RX', 0, '2.2.2.2')[0]);
    }

    public function testOtherIpsMayStillCreateRooms(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');

        self::assertSame(200, $this->postMoveFrom('RY', 0, '3.3.3.3')[0]);
    }

    public function testExistingRoomsAreNotLimited(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');

        self::assertSame(200, $this->postMoveFrom('R0', 1, '2.2.2.2')[0]);
    }

    public function testIpIsNotStoredInClearText(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');
        $paths = glob($this->dataDir . '/limits/*') ?: [];
        $contents = implode('', array_map('file_get_contents', $paths));

        self::assertNotSame([], $paths);
        self::assertStringNotContainsString('2.2.2.2', $contents . implode('', $paths));
    }

    public function testCreationLimitResetsAfterTheWindow(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');
        $this->now += Config::ROOM_CREATION_WINDOW_SECONDS + 1;

        self::assertSame(200, $this->postMoveFrom('RX', 0, '2.2.2.2')[0]);
    }

    public function testRequestRateLimitTriggers(): void
    {
        $status = 200;
        for ($i = 0; $i <= Config::REQUESTS_PER_IP_PER_WINDOW; $i++) {
            [$status] = $this->call('GET', self::room(), [], '', '4.4.4.4');
        }

        self::assertSame(429, $status);
    }

    /**
     * @param array<string, string> $server
     * @param array<string, string> $query
     * @return array{int, array<string, mixed>}
     */
    private function call(string $method, array $server, array $query, string $body, string $ip = '1.1.1.1'): array
    {
        return $this->api->handle($method, $server, $query, $body, $ip);
    }

    /** @return array<string, string> */
    private static function room(string $code = 'ABC234'): array
    {
        return [Config::ROOM_ID_HEADER => hash('sha256', $code)];
    }

    private static function moveBody(int $sequence, string $type = 'drawFromDeck'): string
    {
        return json_encode(['sequence' => $sequence, 'move' => ['type' => $type, 'playerId' => 'p1']]);
    }

    /** @return array{int, array<string, mixed>} */
    private function postMove(int $sequence, string $type = 'drawFromDeck'): array
    {
        return $this->call('POST', self::room(), ['action' => 'move'], self::moveBody($sequence, $type));
    }

    /** @return array{int, array<string, mixed>} */
    private function postMoveFrom(string $roomCode, int $sequence, string $ip): array
    {
        return $this->call('POST', self::room($roomCode), ['action' => 'move'], self::moveBody($sequence), $ip);
    }

    private function createRooms(int $count, string $ip): void
    {
        for ($i = 0; $i < $count; $i++) {
            $this->postMoveFrom("R$i", 0, $ip);
        }
    }

    /** @return array{int, array<string, mixed>} */
    private function join(string $playerId, string $name): array
    {
        $body = json_encode(['playerId' => $playerId, 'name' => $name]);
        return $this->call('POST', self::room('JOIN22'), ['action' => 'join'], $body);
    }
}
