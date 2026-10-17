<?php

declare(strict_types=1);

namespace Handsum;

require __DIR__ . '/src/Config.php';
require __DIR__ . '/src/RoomStore.php';
require __DIR__ . '/src/RateLimiter.php';
require __DIR__ . '/src/Api.php';

$clock = static fn(): int => time();
$api = new Api(
    new RoomStore(Config::DATA_DIR, $clock),
    new RateLimiter(Config::DATA_DIR, $clock),
);

$body = (string) stream_get_contents(fopen('php://input', 'r'), Config::MAX_REQUEST_BYTES + 1);
[$status, $payload] = $api->handle(
    $_SERVER['REQUEST_METHOD'] ?? 'GET',
    array_filter($_SERVER, 'is_string'),
    array_filter($_GET, 'is_string'),
    $body,
    $_SERVER['REMOTE_ADDR'] ?? '',
);

http_response_code($status);
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode($payload, JSON_THROW_ON_ERROR);
