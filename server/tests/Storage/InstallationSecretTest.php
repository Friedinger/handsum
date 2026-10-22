<?php

declare(strict_types=1);

namespace Handsum\Tests\Storage;

use Handsum\Storage\InstallationSecret;
use Handsum\Tests\WithDataDir;
use PHPUnit\Framework\TestCase;

final class InstallationSecretTest extends TestCase
{
    use WithDataDir;

    public function testASecretIsCreatedOnFirstUse(): void
    {
        $secret = InstallationSecret::load($this->dataDir, $this->now);

        self::assertSame(64, strlen($secret));
        self::assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $secret);
    }

    public function testTheSecretStaysTheSame(): void
    {
        $first = InstallationSecret::load($this->dataDir, $this->now);

        self::assertSame($first, InstallationSecret::load($this->dataDir, $this->now + 1));
    }

    public function testTheSecretFileIsReadableByTheOwnerOnly(): void
    {
        InstallationSecret::load($this->dataDir, $this->now);

        self::assertSame(0600, fileperms($this->dataDir . '/secret.key') & 0777);
    }

    public function testASecretWithTheWrongCharactersIsReplaced(): void
    {
        $invalid = str_repeat('A', 64);
        file_put_contents($this->dataDir . '/secret.key', json_encode($invalid));

        self::assertNotSame($invalid, InstallationSecret::load($this->dataDir, $this->now));
    }

    public function testASpoiledSecretIsReplaced(): void
    {
        file_put_contents($this->dataDir . '/secret.key', '"short"');

        self::assertSame(64, strlen(InstallationSecret::load($this->dataDir, $this->now)));
    }
}
