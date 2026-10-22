<?php

declare(strict_types=1);

namespace Handsum\Web;

use Handsum\Config;
use Handsum\RateLimit\RateLimiter;
use Handsum\Room\AppendStatus;
use Handsum\Room\MoveLog;
use Handsum\Room\RoomPlayers;
use Handsum\Room\Rooms;

final class Api
{
    private const REQUEST_BUCKET = 'request';
    private const CREATION_BUCKET = 'creation';

    public function __construct(
        private readonly Rooms $rooms,
        private readonly MoveLog $moveLog,
        private readonly RoomPlayers $roomPlayers,
        private readonly RateLimiter $limiter,
    ) {}

    /**
     * @param array<string, string> $server request meta data keyed like $_SERVER
     * @param array<string, string> $query
     */
    public function handle(string $method, array $server, array $query, string $body, string $ip): Response
    {
        if (!$this->limiter->allow($ip, self::REQUEST_BUCKET, Config::REQUESTS_PER_IP_PER_WINDOW, Config::REQUEST_WINDOW_SECONDS)) {
            return Response::rateLimited();
        }
        $roomId = $server[Config::ROOM_ID_HEADER] ?? '';
        if (preg_match(Config::ROOM_ID_PATTERN, $roomId) !== 1) {
            return Response::error(400, ErrorCode::InvalidRoom);
        }
        $action = Action::tryFrom($query['action'] ?? Action::Read->value);
        return match (true) {
            $method === 'GET' && $action === Action::Read => $this->read($roomId, $query['since'] ?? '0'),
            $method === 'POST' && $action === Action::Move => $this->appendMove($roomId, $body, $ip),
            $method === 'POST' && $action === Action::Join => $this->join($roomId, $body, $ip),
            default => Response::error(405, ErrorCode::MethodNotAllowed),
        };
    }

    private function read(string $roomId, string $since): Response
    {
        if (preg_match(Config::SINCE_PATTERN, $since) !== 1) {
            return Response::error(400, ErrorCode::InvalidSince);
        }
        $log = $this->moveLog->moves($roomId);
        return Response::ok([
            'length' => count($log),
            'moves' => array_map(
                static fn(string $line): mixed => json_decode($line),
                array_slice($log, (int) $since),
            ),
            'players' => $this->roomPlayers->active($roomId),
        ]);
    }

    private function appendMove(string $roomId, string $body, string $ip): Response
    {
        $move = RequestBody::move($body);
        if ($move === null) {
            return Response::error(400, ErrorCode::InvalidMove);
        }
        if (strlen($move->moveJson) > Config::MAX_BYTES_PER_MOVE) {
            return Response::error(413, ErrorCode::MoveTooLarge);
        }
        $denied = $this->denyIfCreationLimited($roomId, $ip);
        if ($denied !== null) {
            return $denied;
        }
        $result = $this->moveLog->append($roomId, $move->sequence, $move->moveJson);
        return match ($result->status) {
            AppendStatus::Appended => Response::ok(['length' => $result->length]),
            AppendStatus::Conflict => Response::error(409, ErrorCode::Conflict, ['length' => $result->length]),
            AppendStatus::RoomFull => Response::error(413, ErrorCode::RoomFull),
        };
    }

    private function join(string $roomId, string $body, string $ip): Response
    {
        $player = RequestBody::player($body);
        if ($player === null) {
            return Response::error(400, ErrorCode::InvalidPlayer);
        }
        $denied = $this->denyIfCreationLimited($roomId, $ip);
        if ($denied !== null) {
            return $denied;
        }
        $players = $this->roomPlayers->join($roomId, $player);
        return $players === null ? Response::error(409, ErrorCode::RoomFull) : Response::ok(['players' => $players]);
    }

    private function denyIfCreationLimited(string $roomId, string $ip): ?Response
    {
        if ($this->rooms->exists($roomId)) {
            return null;
        }
        if ($this->rooms->count() >= Config::MAX_ROOMS) {
            return Response::error(503, ErrorCode::TooManyRooms);
        }
        $allowed = $this->limiter->allow($ip, self::CREATION_BUCKET, Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, Config::ROOM_CREATION_WINDOW_SECONDS);
        return $allowed ? null : Response::rateLimited();
    }
}
