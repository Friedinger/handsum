<?php

declare(strict_types=1);

namespace Handsum\Tests;

/**
 * An in-memory file for `failing://...` paths that can run out of space or refuse locks, so the
 * rollback of failed writes can be tested without a full disk.
 *
 * The `stream_*` method names are dictated by PHP for stream wrappers, hence the naming rule is silenced.
 */
final class FailingStream
{
    private const PROTOCOL = 'failing';

    public static string $contents = '';
    public static int $capacity = PHP_INT_MAX;
    public static bool $locksSucceed = true;

    /** @var resource|null */
    public $context;
    private int $position = 0;

    public static function register(string $contents = '', int $capacity = PHP_INT_MAX, bool $locksSucceed = true): void
    {
        self::unregister();
        stream_wrapper_register(self::PROTOCOL, self::class);
        self::$contents = $contents;
        self::$capacity = $capacity;
        self::$locksSucceed = $locksSucceed;
    }

    public static function unregister(): void
    {
        if (in_array(self::PROTOCOL, stream_get_wrappers(), true)) {
            stream_wrapper_unregister(self::PROTOCOL);
        }
    }

    public static function path(): string
    {
        return self::PROTOCOL . '://file';
    }

    public function stream_open(string $path, string $mode, int $options, ?string &$openedPath): bool // NOSONAR php:S100
    {
        $this->position = 0;
        return true;
    }

    public function stream_read(int $count): string // NOSONAR php:S100
    {
        $chunk = substr(self::$contents, $this->position, $count);
        $this->position += strlen($chunk);
        return $chunk;
    }

    public function stream_write(string $data): int // NOSONAR php:S100
    {
        $accepted = max(0, min(strlen($data), self::$capacity - $this->position));
        self::$contents = substr(self::$contents, 0, $this->position)
            . substr($data, 0, $accepted)
            . substr(self::$contents, $this->position + $accepted);
        $this->position += $accepted;
        return $accepted;
    }

    public function stream_eof(): bool // NOSONAR php:S100
    {
        return $this->position >= strlen(self::$contents);
    }

    public function stream_tell(): int // NOSONAR php:S100
    {
        return $this->position;
    }

    public function stream_seek(int $offset, int $whence): bool // NOSONAR php:S100
    {
        $this->position = match ($whence) {
            SEEK_SET => $offset,
            SEEK_CUR => $this->position + $offset,
            default => strlen(self::$contents) + $offset,
        };
        return true;
    }

    public function stream_truncate(int $size): bool // NOSONAR php:S100
    {
        self::$contents = substr(self::$contents, 0, $size);
        return true;
    }

    public function stream_flush(): bool // NOSONAR php:S100
    {
        return true;
    }

    public function stream_lock(int $operation): bool // NOSONAR php:S100
    {
        return self::$locksSucceed;
    }

    public function stream_set_option(int $option, int $arg1, ?int $arg2): bool // NOSONAR php:S100
    {
        return false;
    }

    /** @return array<string, int> */
    public function stream_stat(): array // NOSONAR php:S100
    {
        return ['size' => strlen(self::$contents)];
    }
}
