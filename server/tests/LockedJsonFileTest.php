<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\LockedJsonFile;
use Handsum\StorageException;
use Handsum\Tests\Support\DataDirTestCase;

final class LockedJsonFileTest extends DataDirTestCase
{
    public function testChangeReceivesNullForAMissingFile(): void
    {
        $received = 'unset';

        LockedJsonFile::update($this->path(), $this->now, static function (mixed $stored) use (&$received): null {
            $received = $stored;
            return null;
        });

        self::assertNull($received);
    }

    public function testReturnedDataIsStoredAndPassedToTheNextChange(): void
    {
        LockedJsonFile::update($this->path(), $this->now, static fn(): array => ['count' => 1]);

        $stored = LockedJsonFile::update($this->path(), $this->now, static fn(mixed $current): array => [
            'count' => $current['count'] + 1,
        ]);

        self::assertSame(['count' => 2], $stored);
        self::assertSame('{"count":2}', file_get_contents($this->path()));
    }

    public function testNullLeavesTheFileUntouched(): void
    {
        LockedJsonFile::update($this->path(), $this->now, static fn(): array => ['count' => 1]);

        $stored = LockedJsonFile::update($this->path(), $this->now, static fn(): null => null);

        self::assertNull($stored);
        self::assertSame('{"count":1}', file_get_contents($this->path()));
    }

    public function testModificationTimeFollowsTheClock(): void
    {
        LockedJsonFile::update($this->path(), $this->now, static fn(): array => []);

        clearstatcache();
        self::assertSame($this->now, filemtime($this->path()));
    }

    public function testUnopenableFileRaisesAStorageError(): void
    {
        $this->expectException(StorageException::class);

        LockedJsonFile::update($this->dataDir . '/missing/state.json', $this->now, static fn(): array => []);
    }

    private function path(): string
    {
        return $this->dataDir . '/state.json';
    }
}
