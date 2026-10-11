import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch, type Ref } from "vue";
import type { Card, PlayerId } from "../../engine";
import type { SyncedLog } from "../../net/moveLog";
import {
  anchorKey,
  planDeal,
  planMove,
  type Anchor,
  type Flight,
  type MovePlan,
} from "../cardFlights";

export const FLIGHT_MS = 450;
const PEEK_MS = 1600;

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

export interface ActiveFlight {
  readonly id: number;
  readonly flight: Flight;
  readonly from: Box;
  readonly to: Box;
  readonly delayMs: number;
}

// Hidden tabs pause animations, so cards would wait mid-air until the player returns.
function shouldAnimate(): boolean {
  return (
    document.visibilityState === "visible" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useCardFlights(
  table: Ref<HTMLElement | null>,
  log: () => SyncedLog,
  selfId: PlayerId,
) {
  const flights = shallowRef<readonly ActiveFlight[]>([]);
  const hiddenAnchors = shallowRef<ReadonlySet<string>>(new Set());
  const discardTopWhileFlying = shallowRef<Card | null | undefined>(undefined);
  const peekedAnchor = ref<string | null>(null);
  let nextFlightId = 0;
  let peekTimer: ReturnType<typeof setTimeout> | undefined;

  const boxOf = (anchor: Anchor): Box | null => {
    const container = table.value;
    const element = container?.querySelector(`[data-anchor="${anchorKey(anchor)}"]`);
    if (!container || !element) {
      return null;
    }
    const origin = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return { left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width };
  };

  const refreshHidden = () => {
    hiddenAnchors.value = new Set(flights.value.map((active) => anchorKey(active.flight.to)));
    if (!flights.value.some((active) => active.flight.to.kind === "discardPile")) {
      discardTopWhileFlying.value = undefined;
    }
  };

  const peek = (anchor: Anchor) => {
    clearTimeout(peekTimer);
    peekedAnchor.value = anchorKey(anchor);
    peekTimer = setTimeout(() => {
      peekedAnchor.value = null;
    }, PEEK_MS);
  };

  const launch = async (planned: readonly Flight[], staggerMs: number) => {
    const origins = planned.map((flight) => boxOf(flight.from));
    hiddenAnchors.value = new Set(planned.map((flight) => anchorKey(flight.to)));
    // Targets are measured after the new state is rendered, origins before it.
    await nextTick();
    flights.value = planned.flatMap((flight, index) => {
      const from = origins[index];
      const to = boxOf(flight.to);
      if (!from || !to) {
        return [];
      }
      nextFlightId += 1;
      return [{ id: nextFlightId, flight, from, to, delayMs: flight.order * staggerMs }];
    });
    refreshHidden();
  };

  const play = (plan: MovePlan) => {
    if (plan.peekedSlot) {
      peek({ kind: "slot", slot: plan.peekedSlot });
    }
    if (plan.flights.length === 0 || !shouldAnimate()) {
      return;
    }
    discardTopWhileFlying.value = plan.discardTopWhileFlying;
    void launch(plan.flights, plan.staggerMs);
  };

  // Runs before the table re-renders, so the cards are still where they started.
  watch(
    log,
    (next, previous) => {
      const move = next.moves.at(-1);
      const isSingleStep = next.moves.length === previous.moves.length + 1;
      if (!move || !isSingleStep || next.state.status !== "started") {
        return;
      }
      if (previous.state.status !== "started") {
        return;
      }
      play(planMove(previous.state, move, next.state, selfId));
    },
    { flush: "pre" },
  );

  // The table first appears when the game starts, so the opening deal is played on mount.
  onMounted(() => {
    const { moves, state } = log();
    if (moves.at(-1)?.type === "startGame" && state.status === "started") {
      play(planDeal(state));
    }
  });

  const land = (id: number) => {
    flights.value = flights.value.filter((active) => active.id !== id);
    refreshHidden();
  };

  onUnmounted(() => {
    clearTimeout(peekTimer);
  });

  return { flights, hiddenAnchors, discardTopWhileFlying, peekedAnchor, land };
}
