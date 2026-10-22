<?php

declare(strict_types=1);

namespace Handsum;

final class ClientAddress
{
    private const IPV6_BYTES = 16;
    private const IPV6_NETWORK_BYTES = 8;
    private const IPV4_MAPPED_PREFIX = "\0\0\0\0\0\0\0\0\0\0\xff\xff";

    /**
     * An IPv6 customer usually owns a whole /64, so counting single addresses would give every
     * address a fresh budget.
     */
    public static function rateLimitKey(string $ip): string
    {
        $packed = @inet_pton($ip);
        if ($packed === false || strlen($packed) !== self::IPV6_BYTES) {
            return $ip;
        }
        if (str_starts_with($packed, self::IPV4_MAPPED_PREFIX)) {
            return (string) inet_ntop(substr($packed, strlen(self::IPV4_MAPPED_PREFIX)));
        }
        return bin2hex(substr($packed, 0, self::IPV6_NETWORK_BYTES)) . '/64';
    }
}
