<?php

declare(strict_types=1);

namespace Handsum\Room;

use Handsum\Config;

final class Player
{
    public function __construct(public readonly string $playerId, public readonly string $name) {}

    /** Both values end up on every client's screen, so only IDs and names that match the fixed patterns are accepted. */
    public static function tryFromInput(mixed $playerId, mixed $name): ?self
    {
        $valid = is_string($playerId)
            && preg_match(Config::PLAYER_ID_PATTERN, $playerId) === 1
            && is_string($name)
            && preg_match(Config::PLAYER_NAME_PATTERN, $name) === 1;
        return $valid ? new self($playerId, $name) : null;
    }
}
