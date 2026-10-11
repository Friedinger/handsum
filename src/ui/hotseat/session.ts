import {
  replayMoves,
  type GameState,
  type Move,
  type PlayerId,
} from "@/engine";

export interface HotseatSession {
  readonly moves: readonly Move[];
  readonly selectedPlayerId: PlayerId | null;
  readonly followTurn: boolean;
  readonly revealAll: boolean;
  readonly message: string | null;
}

export interface HotseatActions {
  readonly startGame: (playerCount: number, seed: number) => void;
  readonly submitMove: (move: Move) => void;
  readonly undo: () => void;
  readonly reset: () => void;
  readonly selectPlayer: (playerId: PlayerId) => void;
  readonly setRevealAll: (revealAll: boolean) => void;
  readonly setFollowTurn: (followTurn: boolean) => void;
  readonly showMessage: (message: string) => void;
}

export const initialSession: HotseatSession = {
  moves: [],
  selectedPlayerId: null,
  followTurn: true,
  revealAll: true,
  message: null,
};

export function gameOf(session: HotseatSession): GameState {
  return replayMoves(session.moves);
}

export function activePlayerId(state: GameState): PlayerId | null {
  if (state.status !== "started") {
    return null;
  }
  switch (state.phase.kind) {
    case "startingView": {
      const { viewedPlayerIds } = state.phase;
      const waiting = state.seats.find(
        (seat) => !viewedPlayerIds.includes(seat.player.id),
      );
      return waiting?.player.id ?? null;
    }
    case "playing":
      return state.phase.currentPlayerId;
    case "finished":
      return null;
  }
}
