<?php

declare(strict_types=1);

namespace Handsum;

enum Action: string
{
    case Read = 'read';
    case Move = 'move';
    case Join = 'join';
}
