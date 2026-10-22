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
    private readonly \Closure $roll;

    /**
     * @param \Closure(): int $clock
     * @param (\Closure(): int)|null $roll decides when the housekeeping runs, see {@see Housekeeping}
     */
    public function __construct(private readonly string $dataDir, private readonly \Closure $clock, ?\Closure $roll = null)
    {
        $this->roll = $roll ?? Housekeeping::randomRoll(...);
    }

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
            $limiter = new RateLimiter($this->dataDir, $this->clock);
            $api = new Api(
                $rooms,
                new MoveLog($rooms, $this->clock),
                new PlayerList($rooms, $this->clock),
                $limiter,
            );
            $response = $api->handle($method, $server, $query, $body, $ip);
            if (!$response->isRateLimited()) {
                $this->runHousekeeping(new Housekeeping($rooms, $limiter, $this->roll));
            }
            return $response;
        } catch (\Throwable $error) {
            ErrorLog::write($error, $this->dataDir);
            return Response::error(500, $error instanceof StorageException ? ErrorCode::StorageNotWritable : ErrorCode::ServerError);
        }
    }

    /**
     * A request that was turned away for sending too much must not cause extra work, and a failing
     * cleanup must not turn a request that already succeeded into an error.
     */
    private function runHousekeeping(Housekeeping $housekeeping): void
    {
        try {
            $housekeeping->maybeRun();
        } catch (\Throwable $error) {
            ErrorLog::write($error, $this->dataDir);
        }
    }
}
