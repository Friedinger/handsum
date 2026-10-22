<?php

declare(strict_types=1);

namespace Handsum\Room;

final class Player
{
    public function __construct(public readonly string $playerId, public readonly string $name) {}
}
