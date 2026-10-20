<?php

declare(strict_types=1);

namespace Handsum;

final class Filesystem
{
    public static function ensureDirectory(string $path): void
    {
        if (!is_dir($path) && !@mkdir($path, 0700, true) && !is_dir($path)) {
            throw new StorageException("Cannot create directory $path");
        }
        if (!is_writable($path)) {
            throw new StorageException("Directory $path is not writable");
        }
    }

    public static function deleteFilesOlderThan(string $directory, int $threshold): void
    {
        foreach (glob($directory . '/*') ?: [] as $path) {
            if (is_file($path) && filemtime($path) < $threshold) {
                unlink($path);
            }
        }
    }
}
