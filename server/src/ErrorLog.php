<?php

declare(strict_types=1);

namespace Handsum;

final class ErrorLog
{
    public static function write(\Throwable $error, string $dataDir): void
    {
        $line = gmdate('c') . ' ' . $error::class . ': ' . $error->getMessage()
            . ' at ' . basename($error->getFile()) . ':' . $error->getLine() . "\n";
        $path = $dataDir . '/' . Config::ERROR_LOG_FILE;
        $size = is_file($path) ? @filesize($path) : false;
        $oversized = $size !== false && $size > Config::MAX_ERROR_LOG_BYTES;
        @file_put_contents($path, $line, $oversized ? LOCK_EX : FILE_APPEND | LOCK_EX);
    }
}
