<?php

declare(strict_types=1);

namespace Handsum\Tests;

use Handsum\Filesystem;
use Handsum\StorageException;
use Handsum\Tests\Support\DataDirTestCase;

final class FilesystemTest extends DataDirTestCase
{
    public function testMissingDirectoryIsCreatedRecursively(): void
    {
        Filesystem::ensureDirectory($this->dataDir . '/a/b');

        self::assertDirectoryExists($this->dataDir . '/a/b');
    }

    public function testUncreatableDirectoryRaisesAStorageError(): void
    {
        $this->expectException(StorageException::class);

        Filesystem::ensureDirectory('/dev/null/nested');
    }

    public function testOnlyFilesOlderThanTheThresholdAreDeleted(): void
    {
        touch($this->dataDir . '/old', $this->now - 10);
        touch($this->dataDir . '/fresh', $this->now);

        Filesystem::deleteFilesOlderThan($this->dataDir, $this->now - 5);

        self::assertFileDoesNotExist($this->dataDir . '/old');
        self::assertFileExists($this->dataDir . '/fresh');
    }

    public function testSubdirectoriesAreKept(): void
    {
        mkdir($this->dataDir . '/nested');
        touch($this->dataDir . '/nested', $this->now - 10);

        Filesystem::deleteFilesOlderThan($this->dataDir, $this->now);

        self::assertDirectoryExists($this->dataDir . '/nested');
    }
}
