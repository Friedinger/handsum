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

function respond(Response $response): void
{
    http_response_code($response->status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($response->payload, JSON_THROW_ON_ERROR);
}

failOnPhpErrors();
ob_start();
$application = new Application(Config::dataDir(), static fn(): int => time());
$body = (string) file_get_contents('php://input', length: Config::MAX_REQUEST_BYTES + 1);
$response = $application->handle(
    $_SERVER['REQUEST_METHOD'] ?? 'GET',
    array_filter($_SERVER, 'is_string'),
    array_filter($_GET, 'is_string'),
    $body,
    $_SERVER['REMOTE_ADDR'] ?? '',
);
ob_end_clean();
respond($response);
