<?php

declare(strict_types=1);

namespace Handsum\Tests\Web;

use Handsum\Config;
use Handsum\RateLimit\RateLimiter;
use Handsum\Room\RoomStore;
use Handsum\Tests\Support\DataDirTestCase;
use Handsum\Web\Api;
use Handsum\Web\ErrorCode;
use Handsum\Web\Response;
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
        self::assertSame(0, self::wire($response)['length']);
        self::assertSame([], self::wire($response)['moves']);
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
        self::assertSame(1, self::wire($response)['length']);
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
        self::assertSame(2, self::wire($response)['length']);
    }

    public function testGapConflicts(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->postMove(5);

        self::assertSame(409, $response->status);
        self::assertSame(2, self::wire($response)['length']);
    }

    public function testSinceReturnsOnlyNewerMoves(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->call('GET', self::roomHeader(), ['since' => '1'], '');

        self::assertSame(['drawFromDeck'], array_column(self::wireList($response, 'moves'), 'type'));
    }

    public function testSinceAtTheEndReturnsNothing(): void
    {
        $this->postMove(0, 'startGame');
        $this->postMove(1);

        $response = $this->call('GET', self::roomHeader(), ['since' => '2'], '');

        self::assertSame([], self::wire($response)['moves']);
        self::assertSame(2, self::wire($response)['length']);
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
            'key the decoder cannot represent' => ['{"sequence":0,"move":{"type":"a","\\u0000b":1}}'],
        ];
    }

    #[DataProvider('malformedMoveBodies')]
    public function testMalformedMoveIsRejected(string $body): void
    {
        self::assertSame(400, $this->call('POST', self::roomHeader(), ['action' => 'move'], $body)->status);
    }

    public function testMovesAreStoredAndReturnedUnchanged(): void
    {
        $body = '{"sequence":0,"move":{"type":"a","empty":{},"numbered":{"0":"x","1":"y"},"list":[1,2],"name":"Zoë"}}';

        $this->call('POST', self::roomHeader(), ['action' => 'move'], $body);

        $logLine = (string) file_get_contents($this->dataDir . '/rooms/' . self::roomId() . '.log');
        self::assertSame('{"type":"a","empty":{},"numbered":{"0":"x","1":"y"},"list":[1,2],"name":"Zoë"}' . "\n", $logLine);
        $served = json_encode($this->call('GET', self::roomHeader(), [], '')->payload['moves'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        self::assertSame('[{"type":"a","empty":{},"numbered":{"0":"x","1":"y"},"list":[1,2],"name":"Zoë"}]', $served);
    }

    public function testRoomIdWithATrailingNewlineIsRejected(): void
    {
        $server = [Config::ROOM_ID_HEADER => self::roomId() . "\n"];

        self::assertSame(400, $this->call('GET', $server, [], '')->status);
    }

    public function testPlayerIdWithATrailingNewlineIsRejected(): void
    {
        self::assertSame(400, $this->join("abc\n", 'Anna')->status);
    }

    public function testOversizedMoveIsRejected(): void
    {
        $body = json_encode(['sequence' => 2, 'move' => ['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE)]], JSON_THROW_ON_ERROR);

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
        self::assertSame([['playerId' => 'p1', 'name' => 'Anna']], self::wire($response)['players']);
    }

    /** @return array<string, array{string}> */
    public static function validNames(): array
    {
        return [
            'umlaut' => ['Zoë'],
            'hyphen' => ['Jean-Luc'],
            'apostrophe' => ['O’Brien'],
            'cjk' => ['李雷'],
            'longest' => [str_repeat('n', Config::MAX_PLAYER_NAME_LENGTH)],
        ];
    }

    #[DataProvider('validNames')]
    public function testValidNamesAreAccepted(string $name): void
    {
        self::assertSame(200, $this->join('p1', $name)->status);
    }

    public function testRejoiningUpdatesTheName(): void
    {
        $this->join('p1', 'Anna');

        $response = $this->join('p1', 'Anna B');

        self::assertSame([['playerId' => 'p1', 'name' => 'Anna B']], self::wire($response)['players']);
    }

    public function testPlayersAreListedOnRead(): void
    {
        $this->join('p1', 'Anna');

        $response = $this->call('GET', self::roomHeader(self::PLAYERS_ROOM_CODE), [], '');

        self::assertCount(1, self::wireList($response, 'players'));
    }

    /** @return array<string, array{string, string}> */
    public static function invalidPlayers(): array
    {
        return [
            'invalid player id' => ['../x', 'A'],
            'empty name' => ['p9', '  '],
            'leading space' => ['p9', ' Anna'],
            'markup' => ['p9', '<b>Anna</b>'],
            'line break' => ['p9', "Anna\n"],
            'direction override' => ['p9', "Eve\u{202E}"],
            'zero-width space' => ['p9', "Zero\u{200B}width"],
            'emoji' => ['p9', "Anna \u{1F600}"],
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

        self::assertSame([], self::wire($response)['players']);
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

    public function testAnIpv6NetworkSharesOneRequestBudget(): void
    {
        $limit = Config::REQUESTS_PER_IP_PER_WINDOW;
        for ($i = 0; $i < $limit; $i++) {
            $this->call('GET', self::roomHeader(), [], '', '2001:db8:1:2::' . dechex($i + 1));
        }

        $response = $this->call('GET', self::roomHeader(), [], '', '2001:db8:1:2:ffff::1');

        self::assertSame(429, $response->status);
    }

    public function testAnotherIpv6NetworkHasItsOwnRequestBudget(): void
    {
        for ($i = 0; $i < Config::REQUESTS_PER_IP_PER_WINDOW + 1; $i++) {
            $this->call('GET', self::roomHeader(), [], '', '2001:db8:1:2::1');
        }

        $response = $this->call('GET', self::roomHeader(), [], '', '2001:db8:1:3::1');

        self::assertSame(200, $response->status);
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
        self::assertSame(ErrorCode::TooManyRooms->value, self::wire($response)['error']);
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
        self::assertSame(ErrorCode::InvalidPlayer->value, self::wire($response)['error']);
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

    /**
     * @return array<string, mixed> the response body as clients receive it
     */
    private static function wire(Response $response): array
    {
        $decoded = json_decode(json_encode($response->payload, JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($decoded);
        return $decoded;
    }

    /** @return array<mixed> */
    private static function wireList(Response $response, string $key): array
    {
        $list = self::wire($response)[$key] ?? null;
        self::assertIsArray($list);
        return $list;
    }

    private static function moveBody(int $sequence, string $type = 'drawFromDeck'): string
    {
        return json_encode(['sequence' => $sequence, 'move' => ['type' => $type, 'playerId' => 'p1']], JSON_THROW_ON_ERROR);
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
        $body = json_encode(['playerId' => $playerId, 'name' => $name], JSON_THROW_ON_ERROR);
        return $this->call('POST', self::roomHeader(self::PLAYERS_ROOM_CODE), ['action' => 'join'], $body);
    }
}
