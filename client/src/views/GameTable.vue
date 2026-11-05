<script setup lang="ts">
import { computed, ref } from "vue";

import ConfirmButton from "@/components/ConfirmButton.vue";
import FlightLayer from "@/components/FlightLayer.vue";
import LastRoundBanner from "@/components/LastRoundBanner.vue";
import MoveLog from "@/components/MoveLog.vue";
import PlayerSeat from "@/components/PlayerSeat.vue";
import ResultsPanel from "@/components/ResultsPanel.vue";
import TableCenter from "@/components/TableCenter.vue";
import TableHand from "@/components/TableHand.vue";
import { useCardFlights } from "@/composables/useCardFlights";
import { useReveals } from "@/composables/useReveals";
import { useTableIntent } from "@/composables/useTableIntent";
import { useTurnAlert } from "@/composables/useTurnAlert";
import { strings } from "@/data/strings";
import type { Move, MoveRejection, StartedGame } from "@/engine";
import { onlinePlayerIds, type SessionSnapshot } from "@/net/gameSession";
import { displayName } from "@/utils/displayName";
import { recentMoveDescriptions } from "@/utils/moveDescription";
import { leaveRoom } from "@/utils/roomNavigation";
import {
  type Highlight,
  isHighlighted,
  noHighlight,
} from "@/utils/tableHighlight";
import type { ClickTarget, Intent } from "@/utils/tableIntent";
import { arrangeOpponents } from "@/utils/tableLayout";
import {
  centerView,
  handView,
  seatView,
  type TableViewContext,
} from "@/utils/tableView";

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: MoveRejection | null;
  highlight?: ((intent: Intent) => Highlight) | undefined;
}>();
const emit = defineEmits<{ move: [move: Move]; playAgain: [] }>();

const selfId = computed(() => props.snapshot.self.playerId);
const reveals = useReveals(
  () => props.snapshot.log,
  props.snapshot.self.playerId,
);
const tableElement = ref<HTMLElement | null>(null);
const cardFlights = useCardFlights(
  tableElement,
  () => props.snapshot.log,
  props.snapshot.self.playerId,
);
const {
  intent,
  situation,
  targetsOpponents,
  clickable,
  click,
  cancelOnEmptyClick,
} = useTableIntent({
  state: () => props.state,
  selfId: () => selfId.value,
  onMove: (move) => {
    emit("move", move);
  },
});

useTurnAlert(
  () =>
    props.state.phase.kind === "playing" &&
    props.state.phase.currentPlayerId === selfId.value,
);

const highlighted = computed(
  () => props.highlight?.(intent.value) ?? noHighlight,
);
const isFinished = computed(() => props.state.phase.kind === "finished");

const viewContext = computed<TableViewContext>(() => ({
  state: props.state,
  selfId: selfId.value,
  intent: intent.value,
  situation: situation.value,
  reveals: reveals.value,
  onlineIds: onlinePlayerIds(props.snapshot),
  isClickable: clickable,
  isHighlighted: (target: ClickTarget) =>
    isHighlighted(highlighted.value, target),
  hasGivenHighlight: props.highlight !== undefined,
  hiddenAnchors: cardFlights.hiddenAnchors.value,
  peekedAnchor: cardFlights.peekedAnchor.value,
  discardTopWhileFlying: cardFlights.discardTopWhileFlying.value,
}));

const opponentAreas = computed(() => {
  const { left, top, right } = arrangeOpponents(
    props.state.seats,
    selfId.value,
  );
  const views = (seats: typeof top) =>
    seats.map((seat) => ({
      id: seat.player.id,
      view: seatView(seat, viewContext.value),
    }));
  return [
    { area: "area-top", seats: views(top) },
    { area: "area-left", seats: views(left) },
    { area: "area-right", seats: views(right) },
  ];
});
const center = computed(() => centerView(viewContext.value));

function selectSlot(playerId: string, slotIndex: number): void {
  click({ kind: "slot", slot: { playerId, slotIndex } });
}

const hand = computed(() => handView(viewContext.value, props.rejection));

function callEnd(): void {
  emit("move", { type: "callEnd", playerId: selfId.value });
}

const bannerText = computed(() =>
  props.state.endCallerId
    ? strings.hints.lastRound(displayName(props.state, props.state.endCallerId))
    : "",
);

const recentMoves = computed(() =>
  recentMoveDescriptions(props.state, props.snapshot.log.moves),
);

const results = computed(() =>
  props.state.phase.kind === "finished" ? props.state.phase.results : [],
);
</script>

<template>
  <div
    ref="tableElement"
    class="game-table"
    :class="{ 'table-with-coach': $slots.coach }"
    @click="cancelOnEmptyClick"
  >
    <div v-if="$slots.coach" class="table-coach">
      <slot name="coach" />
    </div>
    <ConfirmButton
      class="button-quiet table-leave"
      :label="strings.table.leave"
      :confirm-label="strings.table.confirmLeave"
      :needs-confirmation="!isFinished"
      @confirm="leaveRoom"
    />
    <div
      v-for="{ area, seats } in opponentAreas"
      :key="area"
      class="table-area"
      :class="area"
    >
      <PlayerSeat
        v-for="{ id, view } in seats"
        :key="id"
        v-bind="view"
        size="small"
        :compact="!targetsOpponents && !isFinished"
        @select="(slotIndex) => selectSlot(id, slotIndex)"
      />
    </div>

    <div class="table-area area-center">
      <LastRoundBanner
        v-if="!$slots.coach"
        :text="bannerText"
        :visible="state.endCallerId !== null && !isFinished"
      />
      <ResultsPanel
        v-if="isFinished"
        :state="state"
        :results="results"
        :self-id="selfId"
        @play-again="emit('playAgain')"
        @leave="leaveRoom"
      />
      <TableCenter
        v-else
        v-bind="center"
        @draw="click({ kind: 'drawPile' })"
        @discard="click({ kind: 'discardPile' })"
        @held="click({ kind: 'heldCard' })"
      />

      <MoveLog
        v-if="!isFinished && !$slots.coach"
        :descriptions="recentMoves"
      />
    </div>

    <TableHand
      class="area-hand"
      v-bind="hand"
      :show-message="!$slots.coach"
      :call-end-highlighted="highlighted.callEnd"
      @select="(slotIndex) => selectSlot(selfId, slotIndex)"
      @call-end="callEnd"
    />
    <FlightLayer
      :flights="cardFlights.flights.value"
      @land="cardFlights.land"
    />
  </div>
</template>

<style scoped>
.game-table {
  display: grid;
  position: relative;
  grid-template-rows: var(--coach-rows,) auto 1fr auto;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    var(--coach-areas,)
    "top top top"
    "left center right"
    "hand hand hand";
  flex: 1;
  min-height: 0;
  padding: var(--space-4);
  overflow: hidden;
  gap: var(--space-4);
  border-radius: 1.5rem;
  background: radial-gradient(
    ellipse at center,
    var(--color-felt-light),
    var(--color-felt) 70%
  );
  box-shadow: inset 0 0 3rem var(--color-shadow);
}

/* The tutorial coach is a row of the table itself, so the cards below it never get pushed out of view. */
.table-with-coach {
  --coach-rows: auto;
  --coach-areas: "coach coach coach";
  overflow-y: auto;
  gap: var(--space-2);
}

.table-coach {
  grid-area: coach;
  /* Leaves room on both sides for the leave button, so the coach needs no row of its own above. */
  max-width: min(44rem, 100% - 10rem);
  margin: 0 auto;
}

.table-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.area-top {
  grid-area: top;
  flex-wrap: wrap;
}

.area-left,
.area-right {
  flex-direction: column;
}

.area-left {
  grid-area: left;
}

.area-right {
  grid-area: right;
}

.area-center {
  grid-area: center;
  flex-direction: column;
}

.area-hand {
  grid-area: hand;
}

.table-leave {
  position: absolute;
  top: var(--space-2);
  right: var(--space-3);
  min-height: 0;
  padding: var(--space-1) var(--space-3);
}

.table-with-coach .table-leave {
  top: var(--space-4);
}

/* Phones: one column, opponents above the table. */
@media (max-width: 40rem) {
  .game-table {
    grid-template-rows: none;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "leave"
      var(--coach-areas,)
      "top"
      "left"
      "right"
      "center"
      "hand";
    padding: var(--space-2);
    overflow-y: auto;
    gap: var(--space-2);
  }

  .table-with-coach {
    --coach-areas: "coach";
  }

  .table-leave {
    position: static;
    grid-area: leave;
    justify-self: end;
    min-height: var(--control-height);
  }

  .table-coach {
    max-width: none;
    margin: 0;
  }

  .area-top,
  .area-left,
  .area-right {
    flex-flow: row wrap;
    gap: var(--space-2);
  }

  .area-left:empty,
  .area-right:empty {
    display: none;
  }
}
</style>
