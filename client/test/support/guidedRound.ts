import {
  applyMove,
  initialGameState,
  legalMoves,
  type Move,
  type PlayerResult,
  type StartedGame,
} from "@/engine";
import { guideFor } from "@/utils/tutorialGuide";
import {
  nextOpponentMove,
  TUTORIAL_DECK,
  TUTORIAL_OPPONENT,
  TUTORIAL_PLAYER,
  TUTORIAL_SEED,
} from "@/utils/tutorialScript";

import { expectStarted } from "@test/support/gameFixtures";

export interface PlayedMove {
  readonly move: Move;
  readonly stateBefore: StartedGame;
  readonly movesBefore: readonly Move[];
}

export interface GuidedRound {
  readonly moves: readonly Move[];
  readonly played: readonly PlayedMove[];
  readonly startingState: StartedGame;
  readonly finalState: StartedGame;
  readonly finished: boolean;
  readonly playerResult: PlayerResult | undefined;
  readonly opponentResult: PlayerResult | undefined;
}

export function playersMoves(round: GuidedRound): PlayedMove[] {
  return round.played.filter(
    ({ move }) => move.playerId === TUTORIAL_PLAYER.id,
  );
}

function resultOf(state: StartedGame, playerId: string) {
  return state.phase.kind === "finished"
    ? state.phase.results.find((result) => result.playerId === playerId)
    : undefined;
}

/**
 * Plays every way through the guided round that the tutorial allows the player, with the
 * opponent following its script, and returns one summary per way.
 */
export function guidedRounds(): GuidedRound[] {
  const startMove: Move = {
    type: "startGame",
    playerId: TUTORIAL_PLAYER.id,
    players: [TUTORIAL_PLAYER, TUTORIAL_OPPONENT],
    seed: TUTORIAL_SEED,
    deck: TUTORIAL_DECK,
  };
  const startingState = expectStarted(applyMove(initialGameState, startMove));

  const explore = (
    played: readonly PlayedMove[],
    state: StartedGame,
  ): GuidedRound[] => {
    const moves = [startMove, ...played.map(({ move }) => move)];
    const summary = (): GuidedRound => ({
      moves,
      played,
      startingState,
      finalState: state,
      finished: state.phase.kind === "finished",
      playerResult: resultOf(state, TUTORIAL_PLAYER.id),
      opponentResult: resultOf(state, TUTORIAL_OPPONENT.id),
    });
    if (state.phase.kind === "finished") {
      return [summary()];
    }
    const next = (move: Move): GuidedRound[] =>
      explore(
        [...played, { move, stateBefore: state, movesBefore: moves }],
        expectStarted(applyMove(state, move)),
      );
    const scripted = nextOpponentMove(state, moves);
    if (scripted) {
      return next(scripted);
    }
    const guide = guideFor(moves, state, TUTORIAL_PLAYER.id);
    const options = legalMoves(state, TUTORIAL_PLAYER.id).filter(
      (move) => guide.hintAgainst(move) === null,
    );
    return options.length === 0 ? [summary()] : options.flatMap(next);
  };

  return explore([], startingState);
}
