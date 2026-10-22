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
        return LockedFile::withExclusiveLock($path, static function ($handle) use ($path, $now, $change): mixed {
            $updated = $change(json_decode(LockedFile::readAll($handle), true));
            if ($updated !== null) {
                LockedFile::replaceContents($handle, json_encode($updated, JSON_THROW_ON_ERROR), $path);
                touch($path, $now);
            }
            return $updated;
        });
    }

    public static function read(string $path): mixed
    {
        return json_decode((string) LockedFile::readShared($path), true);
    }
}
