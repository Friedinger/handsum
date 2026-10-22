<?php

declare(strict_types=1);

namespace Handsum\Tests\Web;

use Handsum\Config;
use Handsum\Room\Player;
use Handsum\Web\RequestBody;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class RequestBodyTest extends TestCase
{
    public function testAMoveKeepsItsSequenceAndItsJsonUnchanged(): void
    {
        $move = RequestBody::move('{"sequence":3,"move":{"type":"a","empty":{},"numbered":{"0":"x","1":"y"},"list":[1,2],"name":"Zoë","path":"a/b"}}');

        self::assertNotNull($move);
        self::assertSame(3, $move->sequence);
        self::assertSame('{"type":"a","empty":{},"numbered":{"0":"x","1":"y"},"list":[1,2],"name":"Zoë","path":"a/b"}', $move->moveJson);
    }

    /** @return array<string, array{string}> */
    public static function invalidMoves(): array
    {
        return [
            'not JSON' => ['garbage'],
            'a list' => ['[1]'],
            'no move' => ['{"sequence":1}'],
            'move without type' => ['{"sequence":2,"move":{}}'],
            'move that is a list' => ['{"sequence":2,"move":[1]}'],
            'type that is no string' => ['{"sequence":2,"move":{"type":5}}'],
            'text as sequence' => ['{"sequence":"2","move":{"type":"a"}}'],
            'fraction as sequence' => ['{"sequence":2.5,"move":{"type":"a"}}'],
            'negative sequence' => ['{"sequence":-1,"move":{"type":"a"}}'],
            'key the decoder cannot represent' => ['{"sequence":0,"move":{"type":"a","\u0000b":1}}'],
            'body above the limit' => ['{"sequence":0,"move":{"type":"a","pad":"' . '%PAD%' . '"}}'],
        ];
    }

    #[DataProvider('invalidMoves')]
    public function testAnInvalidMoveIsRejected(string $body): void
    {
        $body = str_replace('%PAD%', str_repeat('x', Config::MAX_REQUEST_BYTES), $body);

        self::assertNull(RequestBody::move($body));
    }

    public function testAPlayerIsReadFromTheBody(): void
    {
        self::assertEquals(new Player('p1', 'Anna'), RequestBody::player('{"playerId":"p1","name":"Anna"}'));
    }

    /** @return array<string, array{string}> */
    public static function validNames(): array
    {
        return [
            'plain' => ['Anna'],
            'umlaut' => ['Zoë'],
            'hyphen' => ['Jean-Luc'],
            'apostrophe' => ['O’Brien'],
            'space' => ['Max Mustermann'],
            'cjk' => ['李雷'],
            'longest' => [str_repeat('n', Config::MAX_PLAYER_NAME_LENGTH)],
        ];
    }

    #[DataProvider('validNames')]
    public function testAValidNameIsAccepted(string $name): void
    {
        self::assertEquals(new Player('p1', $name), RequestBody::player(self::playerBody('p1', $name)));
    }

    /** @return array<string, array{string}> */
    public static function invalidNames(): array
    {
        return [
            'empty' => [''],
            'only spaces' => ['  '],
            'leading space' => [' Anna'],
            'trailing space' => ['Anna '],
            'too long' => [str_repeat('n', Config::MAX_PLAYER_NAME_LENGTH + 1)],
            'markup' => ['<b>Anna</b>'],
            'line break' => ["Anna\n"],
            'direction override' => ["Eve\u{202E}"],
            'zero-width space' => ["Zero\u{200B}width"],
            'emoji' => ["Anna \u{1F600}"],
        ];
    }

    #[DataProvider('invalidNames')]
    public function testAnInvalidNameIsRejected(string $name): void
    {
        self::assertNull(RequestBody::player(self::playerBody('p1', $name)));
    }

    /** @return array<string, array{mixed}> */
    public static function invalidIds(): array
    {
        return [
            'path traversal' => ['../x'],
            'empty' => [''],
            'trailing newline' => ["abc\n"],
            'too long' => [str_repeat('a', Config::MAX_PLAYER_ID_LENGTH + 1)],
            'a number' => [7],
            'null' => [null],
        ];
    }

    #[DataProvider('invalidIds')]
    public function testAnInvalidIdIsRejected(mixed $playerId): void
    {
        self::assertNull(RequestBody::player(self::playerBody($playerId, 'Anna')));
    }

    /** @return array<string, array{string}> */
    public static function invalidPlayers(): array
    {
        return [
            'not JSON' => ['garbage'],
            'a list' => ['["p1","Anna"]'],
            'no name' => ['{"playerId":"p1"}'],
            'a name that is no string' => ['{"playerId":"p1","name":7}'],
            'a key the decoder cannot represent' => ['{"playerId":"p1","name":"Anna","\u0000x":1}'],
        ];
    }

    #[DataProvider('invalidPlayers')]
    public function testAnInvalidPlayerBodyIsRejected(string $body): void
    {
        self::assertNull(RequestBody::player($body));
    }

    private static function playerBody(mixed $playerId, mixed $name): string
    {
        return json_encode(['playerId' => $playerId, 'name' => $name], JSON_THROW_ON_ERROR);
    }
}
