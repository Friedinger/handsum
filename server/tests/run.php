<?php

// Dependency-free tests: php server/tests/run.php
declare(strict_types=1);

namespace Handsum;

require __DIR__ . '/../src/Config.php';
require __DIR__ . '/../src/RoomStore.php';
require __DIR__ . '/../src/RateLimiter.php';
require __DIR__ . '/../src/Api.php';

$failures = [];
$now = 1_700_000_000;
$clock = static function () use (&$now): int {
    return $now;
};

function check(string $name, bool $condition): void
{
    global $failures;
    if (!$condition) {
        $failures[] = $name;
    }
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
}

function newApi(\Closure $clock, ?string &$dir = null): Api
{
    $dir = sys_get_temp_dir() . '/handsum-test-' . bin2hex(random_bytes(6));
    return new Api(new RoomStore($dir, $clock), new RateLimiter($dir, $clock));
}

function room(string $code = 'ABC234'): array
{
    return [Config::ROOM_ID_HEADER => hash('sha256', $code)];
}

function move(int $sequence, string $type = 'drawFromDeck'): string
{
    return json_encode(['sequence' => $sequence, 'move' => ['type' => $type, 'playerId' => 'p1']]);
}

function removeTree(string $dir): void
{
    foreach (glob($dir . '/*') ?: [] as $path) {
        is_dir($path) ? removeTree($path) : unlink($path);
    }
    rmdir($dir);
}

$api = newApi($clock, $dir);
$call = static fn(string $method, array $server, array $query, string $body, string $ip = '1.1.1.1') => $api->handle($method, $server, $query, $body, $ip);

[$status, $body] = $call('GET', room(), [], '');
check('empty room reads as empty log', $status === 200 && $body['length'] === 0 && $body['moves'] === []);
check('reading does not create a room', !glob($dir . '/rooms/*.log'));

[$status, $body] = $call('POST', room(), ['action' => 'move'], move(0, 'startGame'));
check('first move is appended', $status === 200 && $body['length'] === 1);
[$status] = $call('POST', room(), ['action' => 'move'], move(1));
check('next sequence is appended', $status === 200);
[$status, $body] = $call('POST', room(), ['action' => 'move'], move(1));
check('duplicate sequence conflicts', $status === 409 && $body['length'] === 2);
[$status, $body] = $call('POST', room(), ['action' => 'move'], move(5));
check('gap conflicts', $status === 409 && $body['length'] === 2);

[, $body] = $call('GET', room(), ['since' => '1'], '');
check('since returns only newer moves', count($body['moves']) === 1 && $body['moves'][0]->type === 'drawFromDeck');
[, $body] = $call('GET', room(), ['since' => '2'], '');
check('since at the end returns nothing', $body['moves'] === [] && $body['length'] === 2);

check('missing room id is rejected', $call('GET', [], [], '')[0] === 400);
check('path traversal room id is rejected', $call('GET', [Config::ROOM_ID_HEADER => '../../etc/passwd'], [], '')[0] === 400);
check('uppercase hex room id is rejected', $call('GET', [Config::ROOM_ID_HEADER => strtoupper(hash('sha256', 'x'))], [], '')[0] === 400);
check('invalid since is rejected', $call('GET', room(), ['since' => '-1'], '')[0] === 400);
check('unknown action is rejected', $call('POST', room(), ['action' => 'nope'], '{}')[0] === 405);
check('non-JSON body is rejected', $call('POST', room(), ['action' => 'move'], 'garbage')[0] === 400);
check('move without type is rejected', $call('POST', room(), ['action' => 'move'], '{"sequence":2,"move":{}}')[0] === 400);
check('list as move is rejected', $call('POST', room(), ['action' => 'move'], '{"sequence":2,"move":[1]}')[0] === 400);
check('string sequence is rejected', $call('POST', room(), ['action' => 'move'], '{"sequence":"2","move":{"type":"a"}}')[0] === 400);
$huge = json_encode(['sequence' => 2, 'move' => ['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE)]]);
check('oversized move is rejected', $call('POST', room(), ['action' => 'move'], $huge)[0] === 413);
check('oversized request body is rejected', $call('POST', room(), ['action' => 'move'], str_repeat(' ', Config::MAX_REQUEST_BYTES + 1) . move(2))[0] === 400);

$player = static fn(string $id, string $name) => json_encode(['playerId' => $id, 'name' => $name]);
[$status, $body] = $call('POST', room('JOIN22'), ['action' => 'join'], $player('p1', 'Anna'));
check('player joins', $status === 200 && $body['players'] === [['playerId' => 'p1', 'name' => 'Anna']]);
[, $body] = $call('POST', room('JOIN22'), ['action' => 'join'], $player('p1', 'Anna B'));
check('rejoining updates the name', $body['players'] === [['playerId' => 'p1', 'name' => 'Anna B']]);
[, $body] = $call('GET', room('JOIN22'), [], '');
check('players are listed on read', count($body['players']) === 1);
check('invalid player id is rejected', $call('POST', room('JOIN22'), ['action' => 'join'], $player('../x', 'A'))[0] === 400);
check('empty name is rejected', $call('POST', room('JOIN22'), ['action' => 'join'], $player('p9', '  '))[0] === 400);
check('too long name is rejected', $call('POST', room('JOIN22'), ['action' => 'join'], $player('p9', str_repeat('n', 33)))[0] === 400);
$now += Config::PLAYER_ACTIVE_SECONDS + 1;
[, $body] = $call('GET', room('JOIN22'), [], '');
check('silent players disappear', $body['players'] === []);
for ($i = 0; $i < Config::MAX_PLAYERS_PER_ROOM; $i++) {
    $call('POST', room('JOIN22'), ['action' => 'join'], $player("q$i", "P$i"));
}
check('ninth player is refused', $call('POST', room('JOIN22'), ['action' => 'join'], $player('late', 'Late'))[0] === 409);

$now += Config::ROOM_IDLE_SECONDS + 1;
$store = new RoomStore($dir, $clock);
$store->deleteIdleRooms();
check('idle rooms are deleted', $store->roomCount() === 0 && !glob($dir . '/rooms/*'));
removeTree($dir);

$api = newApi($clock, $dir);
$store = new RoomStore($dir, $clock);
$limited = true;
for ($i = 0; $i < Config::ROOM_CREATIONS_PER_IP_PER_WINDOW; $i++) {
    $limited = $limited && $api->handle('POST', room("R$i"), ['action' => 'move'], move(0), '2.2.2.2')[0] === 200;
}
check('room creations within limit succeed', $limited);
check('room creation limit applies per IP', $api->handle('POST', room('RX'), ['action' => 'move'], move(0), '2.2.2.2')[0] === 429);
check('other IPs may still create rooms', $api->handle('POST', room('RY'), ['action' => 'move'], move(0), '3.3.3.3')[0] === 200);
check('existing rooms are not limited', $api->handle('POST', room('R0'), ['action' => 'move'], move(1), '2.2.2.2')[0] === 200);
check('IP is not stored in clear text', !str_contains(implode('', array_map('file_get_contents', glob($dir . '/limits/*') ?: [])) . implode('', glob($dir . '/limits/*') ?: []), '2.2.2.2'));
$now += Config::ROOM_CREATION_WINDOW_SECONDS + 1;
check('creation limit resets after the window', $api->handle('POST', room('RX'), ['action' => 'move'], move(0), '2.2.2.2')[0] === 200);
removeTree($dir);

$api = newApi($clock, $dir);
$status = 200;
for ($i = 0; $i <= Config::REQUESTS_PER_IP_PER_WINDOW; $i++) {
    [$status] = $api->handle('GET', room(), [], '', '4.4.4.4');
}
check('request rate limit triggers', $status === 429);
removeTree($dir);

$api = newApi($clock, $dir);
$room = room('FULL22');
$rooms = new RoomStore($dir, $clock);
$result = null;
$filler = json_encode(['type' => 'a', 'pad' => str_repeat('x', Config::MAX_BYTES_PER_MOVE - 40)]);
for ($i = 0; $i < Config::MAX_MOVES_PER_ROOM + 1; $i++) {
    $result = $rooms->append($room[Config::ROOM_ID_HEADER], $i, $filler);
    if ($result->status === AppendStatus::RoomFull) {
        break;
    }
}
check('room size is capped', $result !== null && $result->status === AppendStatus::RoomFull && $result->length * strlen($filler) <= Config::MAX_BYTES_PER_ROOM);
removeTree($dir);

echo $failures === [] ? "\nAll passed\n" : "\n" . count($failures) . " failed\n";
exit($failures === [] ? 0 : 1);
