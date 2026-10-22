<?php

declare(strict_types=1);

namespace Handsum\Storage;

/**
 * The one place that opens, locks and writes files, so every writer rolls back a failed write the
 * same way and every reader waits for a running update.
 */
final class LockedFile
{
    /**
     * @template T
     * @param \Closure(resource): T $action receives the handle while the exclusive lock is held
     * @return T
     */
    public static function withExclusiveLock(string $path, \Closure $action): mixed
    {
        $handle = @fopen($path, 'c+');
        if ($handle === false) {
            throw new StorageException('Cannot open a file in ' . self::folderOf($path));
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new StorageException('Cannot lock a file in ' . self::folderOf($path));
            }
            return $action($handle);
        } finally {
            fclose($handle);
        }
    }

    public static function readShared(string $path): ?string
    {
        $handle = @fopen($path, 'r');
        if ($handle === false) {
            return null;
        }
        try {
            if (!flock($handle, LOCK_SH)) {
                throw new StorageException('Cannot lock a file in ' . self::folderOf($path));
            }
            $contents = stream_get_contents($handle);
            return $contents === false ? null : $contents;
        } finally {
            fclose($handle);
        }
    }

    /** @param resource $handle */
    public static function contents($handle): string
    {
        rewind($handle);
        return (string) stream_get_contents($handle);
    }

    /**
     * Writes before truncating, so the file is never empty in between. If the write fails, the
     * previous content is put back as well as possible.
     *
     * @param resource $handle
     */
    public static function replaceContents($handle, string $data, string $path): void
    {
        $previous = self::contents($handle);
        rewind($handle);
        if (self::writeFully($handle, $data) && self::truncateTo($handle, strlen($data))) {
            return;
        }
        rewind($handle);
        self::writeFully($handle, $previous);
        self::truncateTo($handle, strlen($previous));
        throw new StorageException('Cannot write a file in ' . self::folderOf($path));
    }

    /**
     * A short write (full disk, quota) is cut off again, so the next line is never glued to half a one.
     *
     * @param resource $handle
     */
    public static function append($handle, string $data, string $path): void
    {
        fseek($handle, 0, SEEK_END);
        $sizeBefore = ftell($handle);
        if (self::writeFully($handle, $data)) {
            return;
        }
        self::truncateTo($handle, is_int($sizeBefore) ? max(0, $sizeBefore) : 0);
        throw new StorageException('Cannot write a file in ' . self::folderOf($path));
    }

    /**
     * The error handler of the entry point turns the notice of a failed write into an exception, so
     * a short write is only visible when it is caught here.
     *
     * @param resource $handle
     */
    private static function writeFully($handle, string $data): bool
    {
        try {
            return fwrite($handle, $data) === strlen($data) && fflush($handle);
        } catch (\ErrorException) {
            return false;
        }
    }

    /**
     * @param resource $handle
     * @param int<0, max> $size
     */
    private static function truncateTo($handle, int $size): bool
    {
        try {
            return ftruncate($handle, $size);
        } catch (\ErrorException) {
            return false;
        }
    }

    /** Error messages are logged, so they name the folder and never the room or address hash in the file name. */
    private static function folderOf(string $path): string
    {
        return basename(dirname($path));
    }
}
