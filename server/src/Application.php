<?php

declare(strict_types=1);

namespace Handsum;

use Handsum\Storage\RoomStore;
use Handsum\Storage\StorageException;

final class Application
{
    /** @param \Closure(): int $clock */
    public function __construct(private readonly string $dataDir, private readonly \Closure $clock) {}

    /**
     * Never throws: unexpected failures are logged and reported as generic errors.
     *
     * @param array<string, string> $server
     * @param array<string, string> $query
     */
    public function handle(string $method, array $server, array $query, string $body, string $ip): Response
    {
        try {
            $api = new Api(
                new RoomStore($this->dataDir, $this->clock),
                new RateLimiter($this->dataDir, $this->clock),
            );
            return $api->handle($method, $server, $query, $body, $ip);
        } catch (\Throwable $error) {
            ErrorLog::write($error, $this->dataDir);
            return Response::error(500, $error instanceof StorageException ? ErrorCode::StorageNotWritable : ErrorCode::ServerError);
        }
    }
}
