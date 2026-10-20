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
            throw new StorageException("Cannot open $path");
        }
        flock($handle, LOCK_EX);
        $updated = $change(json_decode((string) stream_get_contents($handle), true));
        if ($updated !== null) {
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($updated, JSON_THROW_ON_ERROR));
            fflush($handle);
            touch($path, $now);
        }
        flock($handle, LOCK_UN);
        fclose($handle);
        return $updated;
    }
}
