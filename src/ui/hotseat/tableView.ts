import { strings } from "../../data/strings";
import type { PlayerId, Seat, StartedGame } from "../../engine";
import { renderFaceUpCard, renderSlot } from "../cardView";
import { playerName } from "../describe";
import { element } from "../dom";
import { currentHeldCard, heldCardVisibleTo, isSlotVisibleTo, type HeldCard } from "../visibility";

interface TableView {
  readonly state: StartedGame;
  readonly viewerId: PlayerId | null;
  readonly revealAll: boolean;
}

function isVisible(view: TableView, ownerId: PlayerId, slotIndex: number): boolean {
  if (view.revealAll) {
    return true;
  }
  return view.viewerId !== null && isSlotVisibleTo(view.state, view.viewerId, ownerId, slotIndex);
}

function seatLabel(view: TableView, seat: Seat): string {
  const { phase, endCallerId } = view.state;
  const markers = [
    phase.kind === "playing" && phase.currentPlayerId === seat.player.id ? "▶" : null,
    phase.kind === "initialPeek" && phase.readyPlayerIds.includes(seat.player.id)
      ? `(${strings.hotseat.ready})`
      : null,
    endCallerId === seat.player.id ? `[${strings.moveNames.callEnd}]` : null,
  ];
  return [seat.player.name, ...markers.filter((marker) => marker !== null)].join(" ");
}

function renderSeat(view: TableView, seat: Seat): HTMLElement {
  return element("div", { className: "seat" }, [
    element("h3", {}, [seatLabel(view, seat)]),
    element(
      "div",
      { className: "layout" },
      seat.layout.map((slot, slotIndex) =>
        renderSlot(slot, isVisible(view, seat.player.id, slotIndex)),
      ),
    ),
  ]);
}

function visibleHeldCard(view: TableView): HeldCard | null {
  if (view.revealAll) {
    return currentHeldCard(view.state);
  }
  return view.viewerId === null ? null : heldCardVisibleTo(view.state, view.viewerId);
}

function renderPile(label: string, size: number, topCard: HTMLElement): HTMLElement {
  return element("div", {}, [`${label} (${String(size)})`, topCard]);
}

function renderPiles(view: TableView): HTMLElement {
  const { drawPile, discardPile } = view.state;
  const heldCard = visibleHeldCard(view);
  return element("div", { className: "piles" }, [
    renderPile(
      strings.hotseat.drawPile,
      drawPile.length,
      renderSlot(drawPile[0] ?? null, view.revealAll),
    ),
    renderPile(
      strings.hotseat.discardPile,
      discardPile.length,
      renderSlot(discardPile[0] ?? null, true),
    ),
    heldCard &&
      element("div", {}, [
        `${strings.hotseat.heldCard} (${playerName(view.state, heldCard.holderId)})`,
        renderFaceUpCard(heldCard.card),
      ]),
  ]);
}

export function renderTable(view: TableView): HTMLElement {
  return element("section", {}, [
    renderPiles(view),
    element(
      "div",
      { className: "seats" },
      view.state.seats.map((seat) => renderSeat(view, seat)),
    ),
  ]);
}
