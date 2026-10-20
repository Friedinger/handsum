<?php

declare(strict_types=1);

use PhpCsFixer\Config;
use PhpCsFixer\Finder;

return (new Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@PER-CS' => true,
        'declare_strict_types' => true,
        'no_unused_imports' => true,
        'ordered_imports' => true,
    ])
    ->setFinder(Finder::create()->in([__DIR__ . '/src', __DIR__ . '/tests'])->append([__DIR__ . '/index.php']))
    ->setCacheFile(__DIR__ . '/.php-cs-fixer.cache');
