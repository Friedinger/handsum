<?php

declare(strict_types=1);

namespace Handsum\Web;

use Handsum\Config;
use Handsum\Room\Player;

/** Turns the JSON body of a request into typed values; anything that does not fit becomes null. */
final class RequestBody
{
    public static function move(string $body): ?MoveRequest
    {
        $request = self::decodedAsObjects($body);
        $sequence = $request->sequence ?? null;
        $move = $request->move ?? null;
        if (!is_int($sequence) || $sequence < 0 || !$move instanceof \stdClass || !is_string($move->type ?? null)) {
            return null;
        }
        return new MoveRequest($sequence, json_encode($move, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /** Both values end up on every client's screen, so only IDs and names that match the fixed patterns are accepted. */
    public static function player(string $body): ?Player
    {
        $request = self::decodedAsObjects($body);
        $playerId = $request->playerId ?? null;
        $name = $request->name ?? null;
        $valid = is_string($playerId)
            && preg_match(Config::PLAYER_ID_PATTERN, $playerId) === 1
            && is_string($name)
            && preg_match(Config::PLAYER_NAME_PATTERN, $name) === 1;
        return $valid ? new Player($playerId, $name) : null;
    }

    /**
     * Decoded as objects, so empty objects and numeric keys survive the round trip into the log
     * unchanged; keys the decoder cannot represent make the whole request invalid.
     */
    private static function decodedAsObjects(string $body): ?\stdClass
    {
        if (strlen($body) > Config::MAX_REQUEST_BYTES) {
            return null;
        }
        try {
            $decoded = json_decode($body, false, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        return $decoded instanceof \stdClass ? $decoded : null;
    }
}
