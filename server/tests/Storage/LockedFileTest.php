<?php

declare(strict_types=1);

namespace Handsum\Tests\Storage;

use Handsum\Storage\LockedFile;
use Handsum\Storage\StorageException;
use Handsum\Tests\WithDataDir;
use PHPUnit\Framework\TestCase;

final class LockedFileTest extends TestCase
{
    use WithDataDir;

    private bool $errorHandlerInstalled = false;

    protected function tearDown(): void
    {
        if ($this->errorHandlerInstalled) {
            restore_error_handler();
        }
    }

    public function testAMissingFileCannotBeRead(): void
    {
        self::assertNull(LockedFile::readShared($this->path()));
    }

    public function testAppendedDataCanBeRead(): void
    {
        LockedFile::withExclusiveLock($this->path(), fn($handle) => LockedFile::append($handle, "one\n", $this->path()));
        LockedFile::withExclusiveLock($this->path(), fn($handle) => LockedFile::append($handle, "two\n", $this->path()));

        self::assertSame("one\ntwo\n", LockedFile::readShared($this->path()));
    }

    public function testReplacedContentsLeaveNoOldTail(): void
    {
        LockedFile::withExclusiveLock($this->path(), fn($handle) => LockedFile::replaceContents($handle, str_repeat('x', 50), $this->path()));

        LockedFile::withExclusiveLock($this->path(), fn($handle) => LockedFile::replaceContents($handle, 'short', $this->path()));

        self::assertSame('short', LockedFile::readShared($this->path()));
    }

    public function testTheLockIsReleasedWhenTheActionThrows(): void
    {
        try {
            LockedFile::withExclusiveLock($this->path(), static function (): never {
                throw new \RuntimeException('boom');
            });
        } catch (\RuntimeException) {
        }

        self::assertSame('done', LockedFile::withExclusiveLock($this->path(), static fn(): string => 'done'));
    }

    public function testAFailedAppendRaisesAStorageException(): void
    {
        $this->failOnPhpErrors();

        $this->expectException(StorageException::class);

        LockedFile::withExclusiveLock('/dev/full', fn($handle) => LockedFile::append($handle, 'data', '/dev/full'));
    }

    public function testAFileThatCannotBeOpenedRaisesAStorageException(): void
    {
        $this->expectException(StorageException::class);

        LockedFile::withExclusiveLock($this->dataDir . '/missing-folder/file', static fn(): null => null);
    }

    public function testErrorMessagesDoNotNameTheFile(): void
    {
        $name = hash('sha256', 'room');

        try {
            LockedFile::withExclusiveLock($this->dataDir . '/missing-folder/' . $name, static fn(): null => null);
            self::fail('Expected a StorageException');
        } catch (StorageException $error) {
            self::assertStringNotContainsString($name, $error->getMessage());
        }
    }

    private function path(): string
    {
        return $this->dataDir . '/file';
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
}
