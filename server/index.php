<?php

declare(strict_types=1);

namespace Handsum;

use Handsum\Storage\RoomStore;
use Handsum\Storage\StorageException;

require __DIR__ . '/src/autoload.php';

function failOnPhpErrors(): void
{
    ini_set('display_errors', '0');
    error_reporting(E_ALL);
    set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
        if ((error_reporting() & $severity) === 0) {
            return false;
        }
        throw new \ErrorException($message, 0, $severity, $file, $line);
    });
}

function respond(Response $response): void
{
    http_response_code($response->status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($response->payload, JSON_THROW_ON_ERROR);
}

failOnPhpErrors();
$dataDir = Config::dataDir();
ob_start();
try {
    $clock = static fn(): int => time();
    $api = new Api(new RoomStore($dataDir, $clock), new RateLimiter($dataDir, $clock));
    $body = (string) stream_get_contents(fopen('php://input', 'r'), Config::MAX_REQUEST_BYTES + 1);
    $response = $api->handle(
        $_SERVER['REQUEST_METHOD'] ?? 'GET',
        array_filter($_SERVER, 'is_string'),
        array_filter($_GET, 'is_string'),
        $body,
        $_SERVER['REMOTE_ADDR'] ?? '',
    );
} catch (\Throwable $error) {
    ErrorLog::write($error, $dataDir);
    $response = Response::error(500, $error instanceof StorageException ? ErrorCode::StorageNotWritable : ErrorCode::ServerError);
}
ob_end_clean();
respond($response);
