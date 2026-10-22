<?php

declare(strict_types=1);

namespace Handsum\Web;

enum Action: string
{
    case Read = 'read';
    case Move = 'move';
    case Join = 'join';
}
