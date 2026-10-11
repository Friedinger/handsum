import { strings } from "../../data/strings";
import type { PlayerResult, StartedGame } from "../../engine";
import { describeEvent, playerName } from "../describe";
import { element } from "./dom";
import type { HotseatSession } from "./session";

const JSON_INDENT = 2;

function renderEvents(state: StartedGame): HTMLElement {
  return element("section", {}, [
    element("h2", {}, [strings.hotseat.lastEvents]),
    element(
      "ul",
      {},
      state.lastMoveEvents.map((event) =>
        element("li", {}, [describeEvent(state, event)]),
      ),
    ),
  ]);
}

function renderResultRow(
  state: StartedGame,
  result: PlayerResult,
): HTMLElement {
  return element("tr", {}, [
    element("td", {}, [playerName(state, result.playerId)]),
    element("td", {}, [String(result.cardSum)]),
    element("td", {}, [String(result.score)]),
    element("td", {}, [result.isWinner ? "✓" : ""]),
  ]);
}

function renderResults(state: StartedGame): HTMLElement | null {
  if (state.phase.kind !== "finished") {
    return null;
  }
  const headings = [
    "",
    strings.table.cardSum,
    strings.table.score,
    strings.table.winner,
  ];
  return element("section", {}, [
    element("h2", {}, [strings.table.results]),
    element("table", {}, [
      element(
        "tr",
        {},
        headings.map((heading) => element("th", {}, [heading])),
      ),
      ...state.phase.results.map((result) => renderResultRow(state, result)),
    ]),
  ]);
}

function renderJson(title: string, value: unknown): HTMLElement {
  return element("details", {}, [
    element("summary", {}, [title]),
    element("pre", {}, [JSON.stringify(value, null, JSON_INDENT)]),
  ]);
}

export function renderDebug(
  state: StartedGame,
  session: HotseatSession,
): HTMLElement {
  return element("section", {}, [
    renderResults(state),
    renderEvents(state),
    renderJson(strings.hotseat.moveLog, session.moves),
    renderJson(strings.hotseat.fullState, state),
  ]);
}
