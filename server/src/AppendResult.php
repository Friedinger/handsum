<?php

declare(strict_types=1);

namespace Handsum;

final class AppendResult
{
    public function __construct(public readonly AppendStatus $status, public readonly int $length) {}
}
