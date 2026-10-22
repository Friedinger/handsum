<?php

declare(strict_types=1);

namespace Handsum\Web;

final class Response
{
    /** @param array<string, mixed> $payload */
    public function __construct(public readonly int $status, public readonly array $payload) {}

    /** @param array<string, mixed> $payload */
    public static function ok(array $payload): self
    {
        return new self(200, $payload);
    }

    /** @param array<string, mixed> $details */
    public static function error(int $status, ErrorCode $error, array $details = []): self
    {
        return new self($status, ['error' => $error->value, ...$details]);
    }
}
