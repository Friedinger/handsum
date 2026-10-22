<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/autoload.php';
foreach (glob(__DIR__ . '/support/*.php') ?: [] as $helper) {
    require $helper;
}
