import { strings } from "@/data/strings";
import {
  legalMoves,
  type Move,
  type PlayerId,
  type StartedGame,
} from "@/engine";
import { describeMove, playerName } from "@/ui/describe";
import { button, checkbox, element } from "./dom";
import type { HotseatActions, HotseatSession } from "./session";

function renderStatus(state: StartedGame): HTMLElement {
  const { phase, endCallerId } = state;
  const rows: [string, string][] = [
    [strings.hotseat.phase, strings.phaseNames[phase.kind]],
    [
      strings.hotseat.currentPlayer,
      phase.kind === "playing"
        ? playerName(state, phase.currentPlayerId)
        : strings.hotseat.nobody,
    ],
    [
      strings.hotseat.endCaller,
      endCallerId ? playerName(state, endCallerId) : strings.hotseat.nobody,
    ],
    [strings.hotseat.moveCount, String(state.moveCount)],
  ];
  return element(
    "dl",
    {},
    rows.flatMap(([term, value]) => [
      element("dt", {}, [term]),
      element("dd", {}, [value]),
    ]),
  );
}

function renderPlayerPicker(
  state: StartedGame,
  selectedPlayerId: PlayerId | null,
  actions: HotseatActions,
): HTMLElement {
  const select = element(
    "select",
    {},
    state.seats.map(({ player }) =>
      element("option", { attributes: { value: player.id } }, [player.name]),
    ),
  );
  select.value = selectedPlayerId ?? "";
  select.addEventListener("change", () => {
    actions.selectPlayer(select.value);
  });
  return element("label", {}, [`${strings.hotseat.actingAs} `, select]);
}

function groupByType(moves: readonly Move[]): Move[][] {
  const groups = new Map<Move["type"], Move[]>();
  for (const move of moves) {
    groups.set(move.type, [...(groups.get(move.type) ?? []), move]);
  }
  return [...groups.values()];
}

function renderLegalMoves(
  state: StartedGame,
  playerId: PlayerId | null,
  actions: HotseatActions,
): HTMLElement {
  const moves = playerId ? legalMoves(state, playerId) : [];
  if (moves.length === 0) {
    return element("p", {}, [strings.hotseat.noLegalMoves]);
  }
  return element(
    "div",
    { className: "move-groups" },
    groupByType(moves).map((group) =>
      element(
        "div",
        { className: "move-group" },
        group.map((move) =>
          button(describeMove(state, move), () => {
            actions.submitMove(move);
          }),
        ),
      ),
    ),
  );
}

function parseMove(text: string): Move | null {
  try {
    // Deliberately unchecked: the engine's own validation is what this debug input is for.
    return JSON.parse(text) as Move;
  } catch {
    return null;
  }
}

function renderManualMove(actions: HotseatActions): HTMLElement {
  const input = element("textarea", { attributes: { rows: "3", cols: "60" } });
  const submit = () => {
    const move = parseMove(input.value);
    if (move) {
      actions.submitMove(move);
    } else {
      actions.showMessage(strings.hotseat.invalidJson);
    }
  };
  return element("details", {}, [
    element("summary", {}, [strings.hotseat.manualMove]),
    input,
    element("br"),
    button(strings.hotseat.submit, submit),
  ]);
}

export function renderControls(
  state: StartedGame,
  session: HotseatSession,
  actions: HotseatActions,
): HTMLElement {
  return element("section", {}, [
    element("h2", {}, [strings.hotseat.status]),
    renderStatus(state),
    element("div", {}, [
      button(strings.hotseat.undo, actions.undo),
      " ",
      button(strings.hotseat.reset, actions.reset),
      " ",
      checkbox(
        strings.hotseat.revealAll,
        session.revealAll,
        actions.setRevealAll,
      ),
      " ",
      checkbox(
        strings.hotseat.followTurn,
        session.followTurn,
        actions.setFollowTurn,
      ),
    ]),
    session.message &&
      element("p", { className: "message" }, [session.message]),
    element("h2", {}, [strings.hotseat.legalMoves]),
    renderPlayerPicker(state, session.selectedPlayerId, actions),
    renderLegalMoves(state, session.selectedPlayerId, actions),
    renderManualMove(actions),
  ]);
}
