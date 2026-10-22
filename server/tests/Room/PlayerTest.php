<?php

declare(strict_types=1);

namespace Handsum\Tests\Room;

use Handsum\Config;
use Handsum\Room\Player;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PlayerTest extends TestCase
{
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
        self::assertEquals(new Player('p1', $name), Player::tryFromInput('p1', $name));
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
        self::assertNull(Player::tryFromInput('p1', $name));
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
        self::assertNull(Player::tryFromInput($playerId, 'Anna'));
    }

    public function testNamesThatAreNoStringAreRejected(): void
    {
        self::assertNull(Player::tryFromInput('p1', ['Anna']));
        self::assertNull(Player::tryFromInput('p1', null));
    }
}
