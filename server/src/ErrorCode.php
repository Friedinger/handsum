<?php

declare(strict_types=1);

namespace Handsum;

enum ErrorCode: string
{
    case RateLimited = 'rateLimited';
    case InvalidRoom = 'invalidRoom';
    case InvalidSince = 'invalidSince';
    case InvalidMove = 'invalidMove';
    case InvalidPlayer = 'invalidPlayer';
    case MoveTooLarge = 'moveTooLarge';
    case Conflict = 'conflict';
    case RoomFull = 'roomFull';
    case TooManyRooms = 'tooManyRooms';
    case MethodNotAllowed = 'methodNotAllowed';
    case StorageNotWritable = 'storageNotWritable';
    case ServerError = 'serverError';
}
