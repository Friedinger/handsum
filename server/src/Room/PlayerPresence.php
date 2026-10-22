<?php

declare(strict_types=1);

namespace Handsum\Room;

final class PlayerPresence
{
    public function __construct(public readonly Player $player, public readonly int $seen) {}

    public static function fromStored(mixed $stored): ?self
    {
        if (
            !is_array($stored)
            || !is_string($stored['playerId'] ?? null)
            || !is_string($stored['name'] ?? null)
            || !is_int($stored['seen'] ?? null)
        ) {
            return null;
        }
        return new self(new Player($stored['playerId'], $stored['name']), $stored['seen']);
    }

    /** @return array{playerId: string, name: string, seen: int} */
    public function toStored(): array
    {
        return ['playerId' => $this->player->playerId, 'name' => $this->player->name, 'seen' => $this->seen];
    }
}
