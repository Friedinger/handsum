<?php

declare(strict_types=1);

namespace Handsum\Storage;

final class LockedJsonFile
{
    /**
     * Runs a read-modify-write cycle under an exclusive lock.
     *
     * @param \Closure(mixed): mixed $change receives the stored data (null if absent or unreadable) and returns the data to store, or null to leave the file untouched
     * @return mixed the data that was stored, or null if the file was left untouched
     */
    public static function update(string $path, int $now, \Closure $change): mixed
    {
        $handle = @fopen($path, 'c+');
        if ($handle === false) {
            throw new StorageException('Cannot open a file in ' . self::folderOf($path));
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new StorageException('Cannot lock a file in ' . self::folderOf($path));
            }
            $previous = (string) stream_get_contents($handle);
            $updated = $change(json_decode($previous, true));
            if ($updated !== null) {
                self::overwrite($handle, json_encode($updated, JSON_THROW_ON_ERROR), $previous, $path);
                touch($path, $now);
            }
            return $updated;
        } finally {
            fclose($handle);
        }
    }

    /** Waits for a running update, so a reader never sees a half-written file. */
    public static function readRaw(string $path): ?string
    {
        $handle = @fopen($path, 'r');
        if ($handle === false) {
            return null;
        }
        try {
            if (!flock($handle, LOCK_SH)) {
                throw new StorageException('Cannot lock a file in ' . self::folderOf($path));
            }
            $raw = stream_get_contents($handle);
            return $raw === false ? null : $raw;
        } finally {
            fclose($handle);
        }
    }

    public static function read(string $path): mixed
    {
        return json_decode((string) self::readRaw($path), true);
    }

    /**
     * Writes before truncating, so the file is never empty in between. If the write fails halfway, the
     * previous content is put back as well as possible.
     *
     * @param resource $handle
     */
    private static function overwrite($handle, string $json, string $previous, string $path): void
    {
        rewind($handle);
        if (Filesystem::writeFully($handle, $json) && Filesystem::truncateTo($handle, strlen($json))) {
            return;
        }
        rewind($handle);
        Filesystem::writeFully($handle, $previous);
        Filesystem::truncateTo($handle, strlen($previous));
        throw new StorageException('Cannot write a file in ' . self::folderOf($path));
    }

    /** Error messages are logged, so they name the folder and never the room or address hash in the file name. */
    private static function folderOf(string $path): string
    {
        return basename(dirname($path));
    }
}
