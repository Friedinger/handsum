<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Api;
use Handsum\Config;
use Handsum\ErrorCode;
use Handsum\RateLimiter;
use Handsum\Response;
use Handsum\Storage\RoomStore;
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
        $response = $this->call('GET', self::roomHeader(), [], '');

        self::assertSame(200, $response->status);
        self::assertSame(0, $response->payload['length']);
        self::assertSame([], $response->payload['moves']);
    }

    public function testReadingDoesNotCreateARoom(): void
    {
        $this->call('GET', self::roomHeader(), [], '');

        self::assertSame([], glob($this->dataDir . '/rooms/*.log'));
    }

    public function testFirstMoveIsAppended(): void
    {
        $response = $this->postMove(0, 'startGame');

        self::assertSame(200, $response->status);
        self::assertSame(1, $response->payload['length']);
    }

    public function testNextSequenceIsAppended(): void
    {
        $this->postMove(0, 'startGame');

        $response = $this->postMove(1);

        self::assertSame(200, $response->status);
    }

    public function testDuplicateSequenceConflicts(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->postMove(1);

        self::assertSame(409, $response->status);
        self::assertSame(2, $response->payload['length']);
    }

    public function testGapConflicts(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->postMove(5);

        self::assertSame(409, $response->status);
        self::assertSame(2, $response->payload['length']);
    }

    public function testSinceReturnsOnlyNewerMoves(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->call('GET', self::roomHeader(), ['since' => '1'], '');

        self::assertCount(1, $response->payload['moves']);
        self::assertSame('drawFromDeck', $response->payload['moves'][0]->type);
    }

    public function testSinceAtTheEndReturnsNothing(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->call('GET', self::roomHeader(), ['since' => '2'], '');

        self::assertSame([], $response->payload['moves']);
        self::assertSame(2, $response->payload['length']);
    }

    public function testMissingRoomIdIsRejected(): void
    {
        self::assertSame(400, $this->call('GET', [], [], '')->status);
    }

    public function testPathTraversalRoomIdIsRejected(): void
    {
        $server = [Config::ROOM_ID_HEADER => '../../etc/passwd'];

        self::assertSame(400, $this->call('GET', $server, [], '')->status);
    }

    public function testUppercaseHexRoomIdIsRejected(): void
    {
        $server = [Config::ROOM_ID_HEADER => strtoupper(hash('sha256', 'x'))];

        self::assertSame(400, $this->call('GET', $server, [], '')->status);
    }

    public function testInvalidSinceIsRejected(): void
    {
        self::assertSame(400, $this->call('GET', self::roomHeader(), ['since' => '-1'], '')->status);
    }

    public function testUnknownActionIsRejected(): void
    {
        self::assertSame(405, $this->call('POST', self::roomHeader(), ['action' => 'nope'], '{}')->status);
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
        self::assertSame(400, $this->call('POST', self::roomHeader(), ['action' => 'move'], $body)->status);
    }

    public function testOversizedMoveIsRejected(): void
    {
        $body = json_encode(['sequence' => 2, 'move' => ['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE)]]);

        self::assertSame(413, $this->call('POST', self::roomHeader(), ['action' => 'move'], $body)->status);
    }

    public function testOversizedRequestBodyIsRejected(): void
    {
        $body = str_repeat(' ', Config::MAX_REQUEST_BYTES + 1) . self::moveBody(2);

        self::assertSame(400, $this->call('POST', self::roomHeader(), ['action' => 'move'], $body)->status);
    }

    public function testPlayerJoins(): void
    {
        $response = $this->join('p1', 'Anna');

        self::assertSame(200, $response->status);
        self::assertSame([['playerId' => 'p1', 'name' => 'Anna']], $response->payload['players']);
    }

    public function testRejoiningUpdatesTheName(): void
    {
        $this->join('p1', 'Anna');

        $response = $this->join('p1', 'Anna B');

        self::assertSame([['playerId' => 'p1', 'name' => 'Anna B']], $response->payload['players']);
    }

    public function testPlayersAreListedOnRead(): void
    {
        $this->join('p1', 'Anna');

        $response = $this->call('GET', self::roomHeader(self::PLAYERS_ROOM_CODE), [], '');

        self::assertCount(1, $response->payload['players']);
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
        self::assertSame(400, $this->join($playerId, $name)->status);
    }

    public function testSilentPlayersDisappear(): void
    {
        $this->join('p1', 'Anna');
        $this->now += Config::PLAYER_ACTIVE_SECONDS + 1;

        $response = $this->call('GET', self::roomHeader(self::PLAYERS_ROOM_CODE), [], '');

        self::assertSame([], $response->payload['players']);
    }

    public function testPlayerBeyondTheLimitIsRefused(): void
    {
        for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
            $this->join("q$i", "P$i");
        }

        self::assertSame(409, $this->join('late', 'Late')->status);
    }

    public function testRoomCreationsWithinTheLimitSucceed(): void
    {
        for ($i = 0; $i < Config::ROOM_CREATIONS_PER_IP_PER_WINDOW; $i++) {
            self::assertSame(200, $this->postMoveFrom("R$i", 0, '2.2.2.2')->status);
        }
    }

    public function testRoomCreationLimitAppliesPerIp(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');

        self::assertSame(429, $this->postMoveFrom('RX', 0, '2.2.2.2')->status);
    }

    public function testOtherIpsMayStillCreateRooms(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');

        self::assertSame(200, $this->postMoveFrom('RY', 0, '3.3.3.3')->status);
    }

    public function testExistingRoomsAreNotLimited(): void
    {
        $this->createRooms(Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, '2.2.2.2');

        self::assertSame(200, $this->postMoveFrom('R0', 1, '2.2.2.2')->status);
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

        self::assertSame(200, $this->postMoveFrom('RX', 0, '2.2.2.2')->status);
    }

    public function testNoNewRoomIsCreatedOnceTheServerIsFull(): void
    {
        for ($i = 0; $i < Config::MAX_ROOMS; $i++) {
            $this->postMoveFrom("R$i", 0, "10.0.0.$i");
        }

        $response = $this->postMoveFrom('RX', 0, '10.1.0.1');

        self::assertSame(503, $response->status);
        self::assertSame(ErrorCode::TooManyRooms->value, $response->payload['error']);
    }

    public function testExistingRoomsStillWorkOnceTheServerIsFull(): void
    {
        for ($i = 0; $i < Config::MAX_ROOMS; $i++) {
            $this->postMoveFrom("R$i", 0, "10.0.0.$i");
        }

        self::assertSame(200, $this->postMoveFrom('R0', 1, '10.1.0.1')->status);
    }

    public function testJoinWithANonJsonBodyIsRejected(): void
    {
        $response = $this->call('POST', self::roomHeader(self::PLAYERS_ROOM_CODE), ['action' => 'join'], 'garbage');

        self::assertSame(400, $response->status);
        self::assertSame(ErrorCode::InvalidPlayer->value, $response->payload['error']);
    }

    public function testRequestRateLimitTriggers(): void
    {
        $status = 200;
        for ($i = 0; $i <= Config::REQUESTS_PER_IP_PER_WINDOW; $i++) {
            $response = $this->call('GET', self::roomHeader(), [], '', '4.4.4.4');
        }

        self::assertSame(429, $response->status);
    }

    /**
     * @param array<string, string> $server
     * @param array<string, string> $query
     */
    private function call(string $method, array $server, array $query, string $body, string $ip = '1.1.1.1'): Response
    {
        return $this->api->handle($method, $server, $query, $body, $ip);
    }

    private static function moveBody(int $sequence, string $type = 'drawFromDeck'): string
    {
        return json_encode(['sequence' => $sequence, 'move' => ['type' => $type, 'playerId' => 'p1']]);
    }

    private function postMove(int $sequence, string $type = 'drawFromDeck'): Response
    {
        return $this->call('POST', self::roomHeader(), ['action' => 'move'], self::moveBody($sequence, $type));
    }

    private function postMoveFrom(string $roomCode, int $sequence, string $ip): Response
    {
        return $this->call('POST', self::roomHeader($roomCode), ['action' => 'move'], self::moveBody($sequence), $ip);
    }

    private function createRooms(int $count, string $ip): void
    {
        for ($i = 0; $i < $count; $i++) {
            $this->postMoveFrom("R$i", 0, $ip);
        }
    }

    private function join(string $playerId, string $name): Response
    {
        $body = json_encode(['playerId' => $playerId, 'name' => $name]);
        return $this->call('POST', self::roomHeader(self::PLAYERS_ROOM_CODE), ['action' => 'join'], $body);
    }
}
