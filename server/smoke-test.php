<?php

// One-off check after the first upload: open https://<host>/<path>/smoke-test.php, then DELETE this file.
declare(strict_types=1);

namespace Handsum;

require __DIR__ . '/src/Config.php';
require __DIR__ . '/src/RoomStore.php';

const PARALLEL_POSTS = 20;
const PROBE_FILE = 'smoke-probe.txt';
const FORBIDDEN_PATHS = ['src/Config.php', 'config.local.php', 'composer.json'];

header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', '1');
error_reporting(E_ALL);

function report(string $name, bool $ok, string $detail = ''): void
{
    echo ($ok ? 'OK    ' : 'FAIL  ') . $name . ($detail === '' ? '' : " ($detail)") . "\n";
}

function baseUrl(): string
{
    $scheme = ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
    return $scheme . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/';
}

/** @return list<string> */
function authHeaders(): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    return $authorization === null ? [] : ['Authorization: ' . $authorization];
}

/** @return array{int, string} the status code and a description that includes the curl error when there was no response */
function probe(string $url): array
{
    $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => authHeaders(), CURLOPT_TIMEOUT => 10]);
    curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    return [$status, $status === 0 ? 'no response: ' . curl_error($curl) . ' (' . $url . ')' : "HTTP $status"];
}

echo 'PHP ' . PHP_VERSION . ' (' . PHP_SAPI . ")\n";
$dataDir = Config::dataDir();
echo "Data directory: $dataDir\n\n";

$store = null;
try {
    $store = new RoomStore($dataDir, static fn(): int => time());
    report('data directory is writable', true);
} catch (StorageException $error) {
    report('data directory is writable', false, $error->getMessage());
    exit(1);
}

$lockFile = $dataDir . '/smoke-lock.tmp';
$first = fopen($lockFile, 'c');
$second = fopen($lockFile, 'c');
$firstLocked = flock($first, LOCK_EX);
$secondBlocked = !flock($second, LOCK_EX | LOCK_NB);
report('flock excludes a second writer', $firstLocked && $secondBlocked);
fclose($first);
fclose($second);
unlink($lockFile);

if (!function_exists('curl_multi_init')) {
    report('curl extension available', false, 'parallel and HTTP checks skipped');
    exit(1);
}

$roomId = hash('sha256', 'smoke-' . bin2hex(random_bytes(8)));
$store->append($roomId, 0, '{"type":"smoke"}');
$url = baseUrl() . 'index.php';
$multi = curl_multi_init();
$handles = [];
for ($i = 0; $i < PARALLEL_POSTS; $i++) {
    $curl = curl_init($url . '?action=move');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['sequence' => 1, 'move' => ['type' => 'smoke', 'client' => $i]]),
        CURLOPT_HTTPHEADER => [...authHeaders(), 'X-Room: ' . $roomId],
        CURLOPT_TIMEOUT => 20,
    ]);
    curl_multi_add_handle($multi, $curl);
    $handles[] = $curl;
}
do {
    curl_multi_exec($multi, $running);
    curl_multi_select($multi, 0.2);
} while ($running > 0);
$statuses = array_map(static fn($curl): int => (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE), $handles);
$counts = array_count_values($statuses);
report(
    PARALLEL_POSTS . ' parallel POSTs for one sequence: exactly one wins',
    ($counts[200] ?? 0) === 1 && ($counts[409] ?? 0) === PARALLEL_POSTS - 1 && $store->length($roomId) === 2,
    json_encode($counts) . ', log length ' . $store->length($roomId),
);
foreach (glob($dataDir . '/rooms/' . $roomId . '.*') ?: [] as $path) {
    unlink($path);
}

$probe = $dataDir . '/' . PROBE_FILE;
file_put_contents($probe, 'secret');
$documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: '';
$realDataDir = realpath($dataDir) ?: $dataDir;
if ($documentRoot !== '' && str_starts_with($realDataDir, $documentRoot)) {
    $probeUrl = 'http' . (str_starts_with(baseUrl(), 'https') ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . substr($realDataDir, strlen($documentRoot)) . '/' . PROBE_FILE;
    [$status, $detail] = probe($probeUrl);
    report('data directory is not served over HTTP', $status === 403 || $status === 404, $detail);
} else {
    report('data directory is outside the web root', true);
}
unlink($probe);
foreach (FORBIDDEN_PATHS as $path) {
    [$status, $detail] = probe(baseUrl() . $path);
    report("$path is not served", $status === 403 || $status === 404, $detail);
}

echo "\nAll OK means: delete smoke-test.php from the server now.\n";
