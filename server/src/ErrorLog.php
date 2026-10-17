<?php

declare(strict_types=1);

namespace Handsum;

final class ErrorLog
{
    public static function write(\Throwable $error, string $dataDir): void
    {
        $line = gmdate('c') . ' ' . $error::class . ': ' . $error->getMessage()
            . ' at ' . basename($error->getFile()) . ':' . $error->getLine() . "\n";
        foreach ([$dataDir . '/' . Config::ERROR_LOG_FILE, sys_get_temp_dir() . '/handsum-' . Config::ERROR_LOG_FILE] as $path) {
            if (self::append($path, $line)) {
                return;
            }
        }
    }

    private static function append(string $path, string $line): bool
    {
        $oversized = is_file($path) && filesize($path) > Config::MAX_ERROR_LOG_BYTES;
        return @file_put_contents($path, $line, $oversized ? LOCK_EX : FILE_APPEND | LOCK_EX) !== false;
    }
}
