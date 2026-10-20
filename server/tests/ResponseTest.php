<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Response;
use PHPUnit\Framework\TestCase;

final class ResponseTest extends TestCase
{
    public function testOkCarriesThePayloadWithStatus200(): void
    {
        $response = Response::ok(['length' => 3]);

        self::assertSame(200, $response->status);
        self::assertSame(['length' => 3], $response->payload);
    }

    public function testErrorNamesTheErrorAndKeepsDetails(): void
    {
        $response = Response::error(409, 'conflict', ['length' => 3]);

        self::assertSame(409, $response->status);
        self::assertSame(['error' => 'conflict', 'length' => 3], $response->payload);
    }
}
