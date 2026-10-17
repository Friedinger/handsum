<?php

declare(strict_types=1);

namespace Handsum;

final class Config
{
    public const DATA_DIR = __DIR__ . '/../data';

    public const ROOM_ID_PATTERN = '/^[0-9a-f]{64}$/';
    public const ROOM_ID_HEADER = 'HTTP_X_ROOM';

    public const MAX_ROOMS = 200;
    public const MAX_MOVES_PER_ROOM = 2000;
    public const MAX_BYTES_PER_ROOM = 1_000_000;
    public const MAX_BYTES_PER_MOVE = 4_000;
    public const MAX_REQUEST_BYTES = 8_000;

    public const MAX_PLAYERS_PER_ROOM = 8;
    public const MAX_PLAYER_ID_LENGTH = 64;
    public const MAX_PLAYER_NAME_LENGTH = 32;
    public const PLAYER_ACTIVE_SECONDS = 90;

    public const ROOM_IDLE_SECONDS = 6 * 3600;
    public const CLEANUP_PROBABILITY_PERCENT = 2;

    public const REQUESTS_PER_IP_PER_WINDOW = 300;
    public const REQUEST_WINDOW_SECONDS = 60;
    public const ROOM_CREATIONS_PER_IP_PER_WINDOW = 10;
    public const ROOM_CREATION_WINDOW_SECONDS = 3600;
}
