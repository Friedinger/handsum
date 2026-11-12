import {
  isValidPlayerName,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Player,
} from "@/engine";

export const BOT_SPEEDS = ["instant", "fast", "normal"] as const;

export type BotSpeed = (typeof BOT_SPEEDS)[number];

export const BOT_DELAY_MS: Readonly<Record<BotSpeed, number>> = {
  instant: 0,
  fast: 300,
  normal: 1200,
};

const DEFAULT_PLAYER_COUNT = 4;
const DEFAULT_BOT_SPEED: BotSpeed = "fast";

export interface DevSettings {
  readonly playerCount: number;
  /** Always one name per possible seat, so changing the player count keeps the names. */
  readonly names: readonly string[];
  readonly botSpeed: BotSpeed;
}

export function defaultDevSettings(names: readonly string[]): DevSettings {
  return {
    playerCount: DEFAULT_PLAYER_COUNT,
    names,
    botSpeed: DEFAULT_BOT_SPEED,
  };
}

function isPlayerCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_PLAYERS &&
    value <= MAX_PLAYERS
  );
}

function isBotSpeed(value: unknown): value is BotSpeed {
  return BOT_SPEEDS.some((speed) => speed === value);
}

function isNameList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length === MAX_PLAYERS &&
    value.every((name) => typeof name === "string")
  );
}

/** Settings saved by an older version or edited by hand fall back to the defaults field by field. */
export function parseDevSettings(
  saved: unknown,
  defaults: DevSettings,
): DevSettings {
  if (typeof saved !== "object" || saved === null) {
    return defaults;
  }
  const { playerCount, names, botSpeed } = saved as Record<string, unknown>;
  return {
    playerCount: isPlayerCount(playerCount)
      ? playerCount
      : defaults.playerCount,
    names: isNameList(names) ? names : defaults.names,
    botSpeed: isBotSpeed(botSpeed) ? botSpeed : defaults.botSpeed,
  };
}

export function seatedNames(settings: DevSettings): string[] {
  return settings.names
    .slice(0, settings.playerCount)
    .map((name) => name.trim());
}

export function hasValidNames(settings: DevSettings): boolean {
  return seatedNames(settings).every(isValidPlayerName);
}

/** The first player is the person at the screen, everyone after them is a bot. */
export function devPlayers(settings: DevSettings): Player[] {
  return seatedNames(settings).map((name, index) => ({
    id: `dev-player-${String(index + 1)}`,
    name,
  }));
}
