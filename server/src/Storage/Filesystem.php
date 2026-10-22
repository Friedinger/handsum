<?php

declare(strict_types=1);

namespace Handsum\Storage;

use Handsum\Config;

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

    /** Ignores files another request has just deleted, because cleanups can run side by side. */
    public static function deleteFilesOlderThan(string $directory, int $threshold): void
    {
        foreach (glob($directory . '/*') ?: [] as $path) {
            $modified = @filemtime($path);
            if ($modified !== false && $modified < $threshold) {
                @unlink($path);
            }
        }
    }

    /** A second line of defence if the web server config is ever lost or ignored. */
    public static function denyWebAccess(string $directory): void
    {
        $file = $directory . '/' . Config::DATA_DIR_PROTECTION_FILE;
        if (is_file($file)) {
            return;
        }
        if (@file_put_contents($file, "Require all denied\n") !== false) {
            // The web server may run as another user than PHP and must read this file; it holds no secret.
            chmod($file, 0644); // NOSONAR php:S2612
        }
    }
}
