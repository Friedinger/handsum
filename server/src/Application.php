<?php

declare(strict_types=1);

namespace Handsum;

use Handsum\RateLimit\RateLimiter;
use Handsum\Room\MoveLog;
use Handsum\Room\PlayerList;
use Handsum\Room\Rooms;
use Handsum\Storage\Filesystem;
use Handsum\Storage\StorageException;
use Handsum\Web\Api;
use Handsum\Web\ErrorCode;
use Handsum\Web\Response;

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
            Filesystem::ensureDirectory($this->dataDir);
            Filesystem::denyWebAccess($this->dataDir);
            $rooms = new Rooms($this->dataDir, $this->clock);
            $api = new Api(
                $rooms,
                new MoveLog($rooms, $this->clock),
                new PlayerList($rooms, $this->clock),
                new RateLimiter($this->dataDir, $this->clock),
            );
            return $api->handle($method, $server, $query, $body, $ip);
        } catch (\Throwable $error) {
            ErrorLog::write($error, $this->dataDir);
            return Response::error(500, $error instanceof StorageException ? ErrorCode::StorageNotWritable : ErrorCode::ServerError);
        }
    }
}
