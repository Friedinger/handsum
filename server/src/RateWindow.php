<?php

declare(strict_types=1);

namespace Handsum;

final class RateWindow
{
    public function __construct(public readonly int $start, public readonly int $count) {}

    public static function fromStored(mixed $stored): ?self
    {
        if (!is_array($stored) || !is_int($stored['start'] ?? null) || !is_int($stored['count'] ?? null)) {
            return null;
        }
        return new self($stored['start'], $stored['count']);
    }

    public function isOpenAt(int $now, int $windowSeconds): bool
    {
        return $this->start > $now - $windowSeconds;
    }

    public function withOneMoreHit(): self
    {
        return new self($this->start, $this->count + 1);
    }

    /** @return array{start: int, count: int} */
    public function toStored(): array
    {
        return ['start' => $this->start, 'count' => $this->count];
    }
}
