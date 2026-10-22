<?php

declare(strict_types=1);

namespace Handsum\Web;

final class MoveRequest
{
    public function __construct(public readonly int $sequence, public readonly string $moveJson) {}
}
