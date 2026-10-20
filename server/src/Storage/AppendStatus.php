<?php

declare(strict_types=1);

namespace Handsum\Storage;

enum AppendStatus
{
    case Appended;
    case Conflict;
    case RoomFull;
}
