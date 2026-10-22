<?php

declare(strict_types=1);

namespace Handsum\Tests\Storage;

use Handsum\Storage\Filesystem;
use Handsum\Storage\StorageException;
use Handsum\Tests\Support\DataDirTestCase;

final class FilesystemTest extends DataDirTestCase
{
    private bool $errorHandlerInstalled = false;

    protected function tearDown(): void
    {
        if ($this->errorHandlerInstalled) {
            restore_error_handler();
        }
        parent::tearDown();
    }

    /** Like the entry point, which turns every notice and warning into an exception. */
    private function failOnPhpErrors(): void
    {
        $this->errorHandlerInstalled = true;
        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if ((error_reporting() & $severity) === 0) {
                return false;
            }
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });
    }

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

    public function testWebAccessIsDeniedForTheDirectory(): void
    {
        Filesystem::denyWebAccess($this->dataDir);

        self::assertSame("Require all denied\n", file_get_contents($this->dataDir . '/.htaccess'));
        self::assertSame(0644, fileperms($this->dataDir . '/.htaccess') & 0777);
    }

    public function testAnExistingProtectionFileIsNotOverwritten(): void
    {
        file_put_contents($this->dataDir . '/.htaccess', 'custom');

        Filesystem::denyWebAccess($this->dataDir);

        self::assertSame('custom', file_get_contents($this->dataDir . '/.htaccess'));
    }

    public function testAFileThatVanishedDuringTheCleanupIsSkipped(): void
    {
        symlink($this->dataDir . '/gone', $this->dataDir . '/dangling');
        $this->failOnPhpErrors();

        Filesystem::deleteFilesOlderThan($this->dataDir, PHP_INT_MAX);

        self::assertTrue(is_link($this->dataDir . '/dangling'));
    }

    public function testFilesDeletedByAnotherCleanupAreSkipped(): void
    {
        file_put_contents($this->dataDir . '/old', 'x');
        touch($this->dataDir . '/old', 100);

        Filesystem::deleteFilesOlderThan($this->dataDir, 200);
        Filesystem::deleteFilesOlderThan($this->dataDir, 200);

        self::assertFileDoesNotExist($this->dataDir . '/old');
    }

    public function testSubdirectoriesAreKept(): void
    {
        mkdir($this->dataDir . '/nested');
        touch($this->dataDir . '/nested', $this->now - 10);

        Filesystem::deleteFilesOlderThan($this->dataDir, $this->now);

        self::assertDirectoryExists($this->dataDir . '/nested');
    }
}
