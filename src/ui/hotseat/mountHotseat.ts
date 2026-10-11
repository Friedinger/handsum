import { strings } from "../../data/strings";
import {
  validateMove,
  type GameState,
  type Move,
  type Player,
} from "../../engine";
import { element } from "./dom";
import { renderControls } from "./controlsView";
import { renderDebug } from "./debugView";
import {
  activePlayerId,
  gameOf,
  initialSession,
  type HotseatActions,
  type HotseatSession,
} from "./session";
import { renderSetup } from "./setupView";
import { renderTable } from "./tableView";

function hotseatPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `hotseat-${String(index + 1)}`,
    name: strings.hotseat.playerName(index + 1),
  }));
}

function validationMessage(state: GameState, move: Move): string | null {
  try {
    const rejection = validateMove(state, move);
    return rejection ? strings.rejectionMessages[rejection] : null;
  } catch (error) {
    return String(error);
  }
}

function render(session: HotseatSession, actions: HotseatActions): HTMLElement {
  const state = gameOf(session);
  if (state.status !== "started") {
    return element("main", {}, [
      element("h1", {}, [strings.hotseat.title]),
      renderSetup(actions),
      session.message &&
        element("p", { className: "message" }, [session.message]),
    ]);
  }
  return element("main", {}, [
    element("h1", {}, [strings.hotseat.title]),
    renderControls(state, session, actions),
    renderTable({
      state,
      viewerId: session.selectedPlayerId,
      revealAll: session.revealAll,
    }),
    renderDebug(state, session),
  ]);
}

export function mountHotseat(root: HTMLElement): void {
  let session = initialSession;

  const update = (changes: Partial<HotseatSession>) => {
    session = { ...session, ...changes };
    root.replaceChildren(render(session, actions));
  };

  const withMoves = (moves: readonly Move[]): Partial<HotseatSession> => {
    const state = gameOf({ ...session, moves });
    const followed = session.followTurn ? activePlayerId(state) : null;
    return {
      moves,
      message: null,
      selectedPlayerId: followed ?? session.selectedPlayerId,
    };
  };

  const actions: HotseatActions = {
    startGame: (playerCount, seed) => {
      const players = hotseatPlayers(playerCount);
      const creatorId = players[0]?.id ?? "";
      actions.submitMove({
        type: "startGame",
        playerId: creatorId,
        players,
        seed,
      });
    },
    submitMove: (move) => {
      const message = validationMessage(gameOf(session), move);
      update(message ? { message } : withMoves([...session.moves, move]));
    },
    undo: () => {
      update(withMoves(session.moves.slice(0, -1)));
    },
    reset: () => {
      update(initialSession);
    },
    selectPlayer: (selectedPlayerId) => {
      update({ selectedPlayerId, followTurn: false });
    },
    setRevealAll: (revealAll) => {
      update({ revealAll });
    },
    setFollowTurn: (followTurn) => {
      update({ followTurn });
    },
    showMessage: (message) => {
      update({ message });
    },
  };

  update({});
}
