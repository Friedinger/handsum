<?php

declare(strict_types=1);

namespace Handsum\Tests\Storage;

use Handsum\Storage\LockedFile;
use Handsum\Storage\StorageException;
use Handsum\Tests\FailingStream;
use Handsum\Tests\WithDataDir;
use PHPUnit\Framework\TestCase;

final class LockedFileTest extends TestCase
{
    use WithDataDir;

    private bool $errorHandlerInstalled = false;

    protected function tearDown(): void
    {
        FailingStream::unregister();
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
        LockedFile::withExclusiveLock($this->path(), fn(LockedFile $file) => $file->append("one\n"));
        LockedFile::withExclusiveLock($this->path(), fn(LockedFile $file) => $file->append("two\n"));

        self::assertSame("one\ntwo\n", LockedFile::readShared($this->path()));
    }

    public function testReplacedContentsLeaveNoOldTail(): void
    {
        LockedFile::withExclusiveLock($this->path(), fn(LockedFile $file) => $file->replace(str_repeat('x', 50)));

        LockedFile::withExclusiveLock($this->path(), fn(LockedFile $file) => $file->replace('short'));

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

        LockedFile::withExclusiveLock('/dev/full', fn(LockedFile $file) => $file->append('data'));
    }

    public function testAFailedAppendCutsOffTheWrittenPart(): void
    {
        FailingStream::register("one\n", capacity: 10);

        try {
            LockedFile::withExclusiveLock(FailingStream::path(), fn(LockedFile $file) => $file->append("two-too-long\n"));
            self::fail('Expected a StorageException');
        } catch (StorageException) {
            self::assertSame("one\n", FailingStream::$contents);
        }
    }

    public function testAFailedReplacementPutsTheOldContentsBack(): void
    {
        FailingStream::register('old-content', capacity: 12);

        try {
            LockedFile::withExclusiveLock(FailingStream::path(), fn(LockedFile $file) => $file->replace('new-and-much-longer'));
            self::fail('Expected a StorageException');
        } catch (StorageException) {
            self::assertSame('old-content', FailingStream::$contents);
        }
    }

    public function testAnAppendThatFitsIsKept(): void
    {
        FailingStream::register("one\n", capacity: 100);

        LockedFile::withExclusiveLock(FailingStream::path(), fn(LockedFile $file) => $file->append("two\n"));

        self::assertSame("one\ntwo\n", FailingStream::$contents);
    }

    public function testAnExclusiveLockThatCannotBeTakenRaisesAStorageException(): void
    {
        FailingStream::register(locksSucceed: false);

        $this->expectException(StorageException::class);

        LockedFile::withExclusiveLock(FailingStream::path(), static fn(): null => null);
    }

    public function testASharedLockThatCannotBeTakenRaisesAStorageException(): void
    {
        FailingStream::register('data', locksSucceed: false);

        $this->expectException(StorageException::class);

        LockedFile::readShared(FailingStream::path());
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
