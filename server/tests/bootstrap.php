<?php

declare(strict_types=1);

// The production code is loaded with plain requires, exactly like index.php does.
require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Config.php';
require __DIR__ . '/../src/ErrorLog.php';
require __DIR__ . '/../src/RoomStore.php';
require __DIR__ . '/../src/RateLimiter.php';
require __DIR__ . '/../src/Api.php';
