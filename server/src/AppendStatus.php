<?php

declare(strict_types=1);

namespace Handsum;

enum AppendStatus
{
    case Appended;
    case Conflict;
    case RoomFull;
}
