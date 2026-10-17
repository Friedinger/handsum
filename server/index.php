<?php

declare(strict_types=1);

namespace Handsum;

require __DIR__ . '/src/Config.php';
require __DIR__ . '/src/ErrorLog.php';
require __DIR__ . '/src/RoomStore.php';
require __DIR__ . '/src/RateLimiter.php';
require __DIR__ . '/src/Api.php';

// Errors must never leak into the JSON response, so they are turned into exceptions and logged.
ini_set('display_errors', '0');
error_reporting(E_ALL);
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if ((error_reporting() & $severity) === 0) {
        return false;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_THROW_ON_ERROR);
}

$dataDir = Config::dataDir();
ob_start();
try {
    $clock = static fn(): int => time();
    $api = new Api(new RoomStore($dataDir, $clock), new RateLimiter($dataDir, $clock));
    $body = (string) stream_get_contents(fopen('php://input', 'r'), Config::MAX_REQUEST_BYTES + 1);
    [$status, $payload] = $api->handle(
        $_SERVER['REQUEST_METHOD'] ?? 'GET',
        array_filter($_SERVER, 'is_string'),
        array_filter($_GET, 'is_string'),
        $body,
        $_SERVER['REMOTE_ADDR'] ?? '',
    );
} catch (\Throwable $error) {
    ErrorLog::write($error, $dataDir);
    $status = 500;
    $payload = ['error' => $error instanceof StorageException ? 'storageNotWritable' : 'serverError'];
}
ob_end_clean();
respond($status, $payload);
