<?php

declare(strict_types=1);

namespace Handsum;

use Handsum\Storage\AppendStatus;
use Handsum\Storage\Player;
use Handsum\Storage\RoomStore;

final class Api
{
    private const REQUEST_BUCKET = 'request';
    private const CREATION_BUCKET = 'creation';

    public function __construct(
        private readonly RoomStore $rooms,
        private readonly RateLimiter $limiter,
    ) {}

    /**
     * @param array<string, string> $server request meta data keyed like $_SERVER
     * @param array<string, string> $query
     */
    public function handle(string $method, array $server, array $query, string $body, string $ip): Response
    {
        $this->maybeCleanUp();
        if (!$this->limiter->allow($ip, self::REQUEST_BUCKET, Config::REQUESTS_PER_IP_PER_WINDOW, Config::REQUEST_WINDOW_SECONDS)) {
            return Response::error(429, ErrorCode::RateLimited);
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
        $log = $this->rooms->moves($roomId);
        return Response::ok([
            'length' => count($log),
            'moves' => array_map(
                static fn(string $line): mixed => json_decode($line),
                array_slice($log, (int) $since),
            ),
            'players' => $this->rooms->activePlayers($roomId),
        ]);
    }

    private function appendMove(string $roomId, string $body, string $ip): Response
    {
        $request = $this->decodeObject($body);
        $sequence = $request['sequence'] ?? null;
        $move = $request['move'] ?? null;
        if (!is_int($sequence) || $sequence < 0 || !$this->isMoveShaped($move)) {
            return Response::error(400, ErrorCode::InvalidMove);
        }
        $moveJson = json_encode($move, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (strlen($moveJson) > Config::MAX_BYTES_PER_MOVE) {
            return Response::error(413, ErrorCode::MoveTooLarge);
        }
        $denied = $this->denyIfCreationLimited($roomId, $ip);
        if ($denied !== null) {
            return $denied;
        }
        $result = $this->rooms->append($roomId, $sequence, $moveJson);
        return match ($result->status) {
            AppendStatus::Appended => Response::ok(['length' => $result->length]),
            AppendStatus::Conflict => Response::error(409, ErrorCode::Conflict, ['length' => $result->length]),
            AppendStatus::RoomFull => Response::error(413, ErrorCode::RoomFull),
        };
    }

    private function join(string $roomId, string $body, string $ip): Response
    {
        $player = $this->parsePlayer($this->decodeObject($body));
        if ($player === null) {
            return Response::error(400, ErrorCode::InvalidPlayer);
        }
        $denied = $this->denyIfCreationLimited($roomId, $ip);
        if ($denied !== null) {
            return $denied;
        }
        $players = $this->rooms->joinPlayer($roomId, $player);
        return $players === null ? Response::error(409, ErrorCode::RoomFull) : Response::ok(['players' => $players]);
    }

    private function denyIfCreationLimited(string $roomId, string $ip): ?Response
    {
        if ($this->rooms->exists($roomId)) {
            return null;
        }
        if ($this->rooms->roomCount() >= Config::MAX_ROOMS) {
            return Response::error(503, ErrorCode::TooManyRooms);
        }
        $allowed = $this->limiter->allow($ip, self::CREATION_BUCKET, Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, Config::ROOM_CREATION_WINDOW_SECONDS);
        return $allowed ? null : Response::error(429, ErrorCode::RateLimited);
    }

    /** @return array<string, mixed> */
    private function decodeObject(string $body): array
    {
        if (strlen($body) > Config::MAX_REQUEST_BYTES) {
            return [];
        }
        $decoded = json_decode($body, true);
        return is_array($decoded) && !array_is_list($decoded) ? $decoded : [];
    }

    private function isMoveShaped(mixed $move): bool
    {
        return is_array($move) && !array_is_list($move) && is_string($move['type'] ?? null);
    }

    /** @param array<string, mixed> $request */
    private function parsePlayer(array $request): ?Player
    {
        $playerId = $request['playerId'] ?? null;
        $name = $request['name'] ?? null;
        $valid = is_string($playerId)
            && preg_match(Config::PLAYER_ID_PATTERN, $playerId) === 1
            && is_string($name)
            && mb_strlen(trim($name)) >= 1
            && mb_strlen($name) <= Config::MAX_PLAYER_NAME_LENGTH;
        return $valid ? new Player($playerId, $name) : null;
    }

    private function maybeCleanUp(): void
    {
        if (random_int(1, 100) > Config::CLEANUP_PROBABILITY_PERCENT) {
            return;
        }
        $this->rooms->deleteIdleRooms();
        $this->limiter->deleteExpired();
    }
}
