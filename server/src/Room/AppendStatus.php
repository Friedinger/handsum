<?php

declare(strict_types=1);

namespace Handsum\Room;

enum AppendStatus
{
    case Appended;
    case Conflict;
    case RoomFull;
}
