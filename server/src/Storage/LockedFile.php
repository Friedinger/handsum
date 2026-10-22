<?php

declare(strict_types=1);

namespace Handsum\Storage;

/**
 * The one place that opens, locks and writes the data files (rooms, counters, secret), so every writer
 * rolls back a failed write the same way and every reader waits for a running update.
 *
 * An instance is the file while its exclusive lock is held; it only exists inside `withExclusiveLock`.
 */
final class LockedFile
{
    /** @param resource $handle */
    private function __construct(private readonly mixed $handle, private readonly string $path) {}

    /**
     * @template T
     * @param \Closure(self): T $action receives the file while the exclusive lock is held
     * @return T
     */
    public static function withExclusiveLock(string $path, \Closure $action): mixed
    {
        $handle = @fopen($path, 'c+');
        if ($handle === false) {
            throw new StorageException('Cannot open a file in ' . self::folderOf($path));
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new StorageException('Cannot lock a file in ' . self::folderOf($path));
            }
            return $action(new self($handle, $path));
        } finally {
            fclose($handle);
        }
    }

    public static function readShared(string $path): ?string
    {
        $handle = @fopen($path, 'r');
        if ($handle === false) {
            return null;
        }
        try {
            if (!flock($handle, LOCK_SH)) {
                throw new StorageException('Cannot lock a file in ' . self::folderOf($path));
            }
            $contents = stream_get_contents($handle);
            return $contents === false ? null : $contents;
        } finally {
            fclose($handle);
        }
    }

    public function readAll(): string
    {
        rewind($this->handle);
        return (string) stream_get_contents($this->handle);
    }

    /**
     * Writes before truncating, so the file is never empty in between. If the write fails, the
     * previous content is put back as well as possible.
     */
    public function replace(string $data): void
    {
        $previous = $this->readAll();
        rewind($this->handle);
        if ($this->writeFully($data) && $this->truncateTo(strlen($data))) {
            return;
        }
        rewind($this->handle);
        $this->writeFully($previous);
        $this->truncateTo(strlen($previous));
        throw new StorageException('Cannot write a file in ' . self::folderOf($this->path));
    }

    /** A short write (full disk, quota) is cut off again, so the next line is never glued to half a one. */
    public function append(string $data): void
    {
        fseek($this->handle, 0, SEEK_END);
        $sizeBefore = ftell($this->handle);
        if ($sizeBefore === false) {
            throw new StorageException('Cannot write a file in ' . self::folderOf($this->path));
        }
        if (!$this->writeFully($data)) {
            $this->truncateTo(max(0, $sizeBefore));
            throw new StorageException('Cannot write a file in ' . self::folderOf($this->path));
        }
    }

    /**
     * The error handler of the entry point turns the notice of a failed write into an exception, so
     * a short write is only visible when it is caught here.
     */
    private function writeFully(string $data): bool
    {
        try {
            return fwrite($this->handle, $data) === strlen($data) && fflush($this->handle);
        } catch (\ErrorException) {
            return false;
        }
    }

    /** @param int<0, max> $size */
    private function truncateTo(int $size): bool
    {
        try {
            return ftruncate($this->handle, $size);
        } catch (\ErrorException) {
            return false;
        }
    }

    /** Error messages are logged, so they name the folder and never the room or address hash in the file name. */
    private static function folderOf(string $path): string
    {
        return basename(dirname($path));
    }
}
