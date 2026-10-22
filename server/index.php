<?php

declare(strict_types=1);

namespace Handsum;

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

function respond(Response $response, string $dataDir): void
{
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    try {
        $json = json_encode($response->payload, JSON_THROW_ON_ERROR);
        http_response_code($response->status);
    } catch (\JsonException $error) {
        ErrorLog::write($error, $dataDir);
        $json = json_encode(Response::error(500, ErrorCode::ServerError)->payload, JSON_THROW_ON_ERROR);
        http_response_code(500);
    }
    echo $json;
}

umask(0077);
failOnPhpErrors();
ob_start();
$dataDir = Config::dataDir();
$application = new Application($dataDir, static fn(): int => time());
$body = (string) file_get_contents('php://input', length: Config::MAX_REQUEST_BYTES + 1);
$server = array_filter($_SERVER, 'is_string');
$response = $application->handle(
    $server['REQUEST_METHOD'] ?? 'GET',
    $server,
    array_filter($_GET, 'is_string'),
    $body,
    $server['REMOTE_ADDR'] ?? '',
);
ob_end_clean();
respond($response, $dataDir);
