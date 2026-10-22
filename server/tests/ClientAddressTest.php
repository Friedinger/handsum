<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\ClientAddress;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ClientAddressTest extends TestCase
{
    public function testAnIpv4AddressIsKept(): void
    {
        self::assertSame('203.0.113.7', ClientAddress::rateLimitKey('203.0.113.7'));
    }

    public function testAnIpv4MappedAddressCountsAsIpv4(): void
    {
        self::assertSame('203.0.113.7', ClientAddress::rateLimitKey('::ffff:203.0.113.7'));
    }

    public function testAnIpv4MappedAddressInHexFormCountsAsIpv4(): void
    {
        self::assertSame('203.0.113.7', ClientAddress::rateLimitKey('::ffff:cb00:7107'));
    }

    public function testAddressesOfOneIpv6NetworkShareAKey(): void
    {
        self::assertSame(
            ClientAddress::rateLimitKey('2001:db8:1:2::1'),
            ClientAddress::rateLimitKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd'),
        );
    }

    public function testDifferentIpv6NetworksHaveDifferentKeys(): void
    {
        self::assertNotSame(
            ClientAddress::rateLimitKey('2001:db8:1:2::1'),
            ClientAddress::rateLimitKey('2001:db8:1:3::1'),
        );
    }

    /** @return array<string, array{string}> */
    public static function notAnAddress(): array
    {
        return [
            'empty' => [''],
            'text' => ['unknown'],
            'zone id' => ['fe80::1%eth0'],
        ];
    }

    #[DataProvider('notAnAddress')]
    public function testSomethingThatIsNoAddressIsKeptAsItIs(string $value): void
    {
        self::assertSame($value, ClientAddress::rateLimitKey($value));
    }
}
