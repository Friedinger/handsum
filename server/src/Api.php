<?php

declare(strict_types=1);

namespace Handsum;

final class Api
{
    private const REQUEST_BUCKET = 'request';
    private const CREATION_BUCKET = 'creation';

    public function __construct(
        private readonly RoomStore $rooms,
        private readonly RateLimiter $limiter,
    ) {
    }

    /**
     * @param array<string, string> $server request meta data keyed like $_SERVER
     * @param array<string, string> $query
     * @return array{int, array<string, mixed>} status code and JSON body
     */
    public function handle(string $method, array $server, array $query, string $body, string $ip): array
    {
        $this->maybeCleanUp();
        if (!$this->limiter->allow($ip, self::REQUEST_BUCKET, Config::REQUESTS_PER_IP_PER_WINDOW, Config::REQUEST_WINDOW_SECONDS)) {
            return [429, ['error' => 'rateLimited']];
        }
        $roomId = $server[Config::ROOM_ID_HEADER] ?? '';
        if (preg_match(Config::ROOM_ID_PATTERN, $roomId) !== 1) {
            return [400, ['error' => 'invalidRoom']];
        }
        $action = $query['action'] ?? 'read';
        return match (true) {
            $method === 'GET' && $action === 'read' => $this->read($roomId, $query['since'] ?? '0'),
            $method === 'POST' && $action === 'move' => $this->appendMove($roomId, $body, $ip),
            $method === 'POST' && $action === 'join' => $this->join($roomId, $body, $ip),
            default => [405, ['error' => 'methodNotAllowed']],
        };
    }

    /** @return array{int, array<string, mixed>} */
    private function read(string $roomId, string $since): array
    {
        if (preg_match('/^\d{1,9}$/', $since) !== 1) {
            return [400, ['error' => 'invalidSince']];
        }
        $moves = array_map(
            static fn(string $line): mixed => json_decode($line),
            $this->rooms->movesSince($roomId, (int) $since),
        );
        return [200, [
            'length' => $this->rooms->length($roomId),
            'moves' => $moves,
            'players' => $this->rooms->activePlayers($roomId),
        ]];
    }

    /** @return array{int, array<string, mixed>} */
    private function appendMove(string $roomId, string $body, string $ip): array
    {
        $request = $this->decodeObject($body);
        $sequence = $request['sequence'] ?? null;
        $move = $request['move'] ?? null;
        if (!is_int($sequence) || $sequence < 0 || !$this->isMoveShaped($move)) {
            return [400, ['error' => 'invalidMove']];
        }
        $moveJson = json_encode($move, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (strlen($moveJson) > Config::MAX_BYTES_PER_MOVE) {
            return [413, ['error' => 'moveTooLarge']];
        }
        $denied = $this->denyIfCreationLimited($roomId, $ip);
        if ($denied) {
            return $denied;
        }
        $result = $this->rooms->append($roomId, $sequence, $moveJson);
        return match ($result->status) {
            AppendStatus::Appended => [200, ['length' => $result->length]],
            AppendStatus::Conflict => [409, ['error' => 'conflict', 'length' => $result->length]],
            AppendStatus::RoomFull => [413, ['error' => 'roomFull']],
            AppendStatus::Failed => [500, ['error' => 'storage']],
        };
    }

    /** @return array{int, array<string, mixed>} */
    private function join(string $roomId, string $body, string $ip): array
    {
        $player = $this->decodeObject($body);
        $playerId = $player['playerId'] ?? null;
        $name = $player['name'] ?? null;
        if (!$this->isPlayerShaped($playerId, $name)) {
            return [400, ['error' => 'invalidPlayer']];
        }
        $denied = $this->denyIfCreationLimited($roomId, $ip);
        if ($denied) {
            return $denied;
        }
        $players = $this->rooms->joinPlayer($roomId, ['playerId' => $playerId, 'name' => $name]);
        return $players === null ? [409, ['error' => 'roomFull']] : [200, ['players' => $players]];
    }

    /** @return array{int, array<string, mixed>}|null */
    private function denyIfCreationLimited(string $roomId, string $ip): ?array
    {
        if ($this->rooms->exists($roomId)) {
            return null;
        }
        if ($this->rooms->roomCount() >= Config::MAX_ROOMS) {
            return [503, ['error' => 'tooManyRooms']];
        }
        $allowed = $this->limiter->allow($ip, self::CREATION_BUCKET, Config::ROOM_CREATIONS_PER_IP_PER_WINDOW, Config::ROOM_CREATION_WINDOW_SECONDS);
        return $allowed ? null : [429, ['error' => 'rateLimited']];
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

    private function isPlayerShaped(mixed $playerId, mixed $name): bool
    {
        return is_string($playerId)
            && preg_match('/^[A-Za-z0-9-]{1,' . Config::MAX_PLAYER_ID_LENGTH . '}$/', $playerId) === 1
            && is_string($name)
            && mb_strlen(trim($name)) >= 1
            && mb_strlen($name) <= Config::MAX_PLAYER_NAME_LENGTH;
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
