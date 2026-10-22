<?php

declare(strict_types=1);

namespace Handsum\Storage;

use Handsum\Config;

final class InstallationSecret
{
    private const BYTES = 32;
    private const FILE_MODE = 0600;

    /**
     * Created once per installation. Requests only read it with a shared lock; the exclusive
     * update runs just the first time.
     */
    public static function load(string $dataDir, int $now): string
    {
        $path = $dataDir . '/' . Config::SECRET_FILE;
        $stored = LockedJsonFile::read($path);
        if (self::isValid($stored)) {
            return $stored;
        }
        $secret = null;
        LockedJsonFile::update(
            $path,
            $now,
            static function (mixed $current) use (&$secret): ?string {
                if (self::isValid($current)) {
                    $secret = $current;
                    return null;
                }
                $secret = bin2hex(random_bytes(self::BYTES));
                return $secret;
            },
        );
        @chmod($path, self::FILE_MODE);
        return (string) $secret;
    }

    /** @phpstan-assert-if-true string $value */
    private static function isValid(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[0-9a-f]{' . self::BYTES * 2 . '}\z/', $value) === 1;
    }
}
