<script setup lang="ts">
import { computed, ref } from "vue";

import FlightLayer from "@/components/FlightLayer.vue";
import PlayerSeat from "@/components/PlayerSeat.vue";
import ResultsPanel from "@/components/ResultsPanel.vue";
import TableCenter from "@/components/TableCenter.vue";
import { useCardFlights } from "@/composables/useCardFlights";
import { useConfirmation } from "@/composables/useConfirmation";
import { useReveals } from "@/composables/useReveals";
import { useTableIntent } from "@/composables/useTableIntent";
import { useTurnAlert } from "@/composables/useTurnAlert";
import { strings } from "@/data/strings";
import {
  findSeat,
  type Move,
  type MoveRejection,
  type Seat,
  type StartedGame,
  tryApplyMove,
} from "@/engine";
import { onlinePlayerIds, type SessionSnapshot } from "@/net/gameSession";
import { anchorKey, HELD_ANCHOR } from "@/utils/cardFlights";
import { displayName } from "@/utils/displayName";
import { heldCardLabel, shownHeldCard } from "@/utils/heldCard";
import { recentMoveDescriptions } from "@/utils/moveDescription";
import { isRevealed } from "@/utils/reveals";
import { leaveRoom } from "@/utils/roomNavigation";
import type { SlotView } from "@/utils/slotView";
import {
  type Highlight,
  isHighlighted,
  noHighlight,
} from "@/utils/tableHighlight";
import { hintFor } from "@/utils/tableHints";
import {
  type ClickTarget,
  type Intent,
  isSlotMarked,
} from "@/utils/tableIntent";
import { arrangeOpponents } from "@/utils/tableLayout";

const CONFIRMATION_MS = 3000;

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: MoveRejection | null;
  highlight?: ((intent: Intent) => Highlight) | undefined;
}>();
const emit = defineEmits<{ move: [move: Move]; playAgain: [] }>();

const selfId = computed(() => props.snapshot.self.playerId);
const highlighted = computed(
  () => props.highlight?.(intent.value) ?? noHighlight,
);
const isTargetHighlighted = (target: ClickTarget) =>
  isHighlighted(highlighted.value, target);
const online = computed(() => onlinePlayerIds(props.snapshot));
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
  hasSelection,
  isTakingDiscard,
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

const opponentAreas = computed(() => {
  const { left, top, right } = arrangeOpponents(
    props.state.seats,
    selfId.value,
  );
  return [
    { area: "area-top", seats: top },
    { area: "area-left", seats: left },
    { area: "area-right", seats: right },
  ];
});
const ownSeat = computed(() => findSeat(props.state, selfId.value));
const isFinished = computed(() => props.state.phase.kind === "finished");
const currentPlayerId = computed(() =>
  props.state.phase.kind === "playing"
    ? props.state.phase.currentPlayerId
    : null,
);
const held = computed(() =>
  shownHeldCard(props.state, selfId.value, isTakingDiscard.value),
);
const discardTop = computed(() => {
  const whileFlying = cardFlights.discardTopWhileFlying.value;
  if (whileFlying !== undefined) {
    return whileFlying;
  }
  return props.state.discardPile[isTakingDiscard.value ? 1 : 0] ?? null;
});
const heldLabel = computed(() =>
  heldCardLabel(props.state, selfId.value, held.value, isTakingDiscard.value),
);
const heldFaceUp = computed(() => held.value?.holderId === selfId.value);
const discardConfirmsSwap = computed(
  () =>
    hasSelection.value &&
    (situation.value.kind === "holding" || isTakingDiscard.value),
);
/** A given highlight is the only pulse on the discard pile, so it never doubles the swap confirmation. */
const discardReady = computed(() =>
  props.highlight
    ? isTargetHighlighted({ kind: "discardPile" })
    : discardConfirmsSwap.value,
);
const heldMarked = computed(() => intent.value.kind === "action");
const heldInFlight = computed(() =>
  cardFlights.hiddenAnchors.value.has(HELD_ANCHOR),
);
const recentMoves = computed(() =>
  recentMoveDescriptions(props.state, props.snapshot.log.moves),
);

function slotViews(seat: Seat): SlotView[] {
  return seat.layout.flatMap((card, slotIndex) => {
    if (!card) {
      return [];
    }
    const slot = { playerId: seat.player.id, slotIndex };
    const anchor = anchorKey({ kind: "slot", slot });
    return [
      {
        slotIndex,
        card,
        faceUp:
          isFinished.value ||
          isRevealed(reveals.value, props.state, seat.player.id, slotIndex),
        clickable: clickable({ kind: "slot", slot }),
        marked: isSlotMarked(intent.value, slot, selfId.value),
        highlighted: isTargetHighlighted({ kind: "slot", slot }),
        anchor,
        inFlight: cardFlights.hiddenAnchors.value.has(anchor),
        peeked: cardFlights.peekedAnchor.value === anchor,
      },
    ];
  });
}

function badges(seat: Seat): string[] {
  return [
    online.value.has(seat.player.id) ? null : strings.table.offline,
    props.state.endCallerId === seat.player.id ? strings.table.calledEnd : null,
  ].filter((badge) => badge !== null);
}

function selectSlot(seat: Seat, slotIndex: number): void {
  click({ kind: "slot", slot: { playerId: seat.player.id, slotIndex } });
}

function selectOwnSlot(slotIndex: number): void {
  click({ kind: "slot", slot: { playerId: selfId.value, slotIndex } });
}

const showRememberNotice = computed(() =>
  reveals.value.some((reveal) => reveal.reason === "startingView"),
);

const hint = computed(() => hintFor(props.state, selfId.value, intent.value));

/**
 * One line for errors, reminders and hints, so the hand below never moves when the text changes.
 */
const message = computed(() => {
  if (props.rejection) {
    return strings.rejectionMessages[props.rejection];
  }
  return showRememberNotice.value ? strings.hints.rememberCards : hint.value;
});

const leaveConfirmation = useConfirmation(CONFIRMATION_MS);
const callEndConfirmation = useConfirmation(CONFIRMATION_MS);

function leaveTable(): void {
  if (isFinished.value) {
    leaveRoom();
    return;
  }
  leaveConfirmation.request(leaveRoom);
}

function callEnd(): void {
  callEndConfirmation.request(() => {
    emit("move", { type: "callEnd", playerId: selfId.value });
  });
}

const canCallEnd = computed(
  () =>
    situation.value.kind === "choosing" &&
    intent.value.kind === "none" &&
    tryApplyMove(props.state, { type: "callEnd", playerId: selfId.value }).ok,
);

const bannerText = computed(() =>
  props.state.endCallerId
    ? strings.hints.lastRound(displayName(props.state, props.state.endCallerId))
    : "",
);
const bannerHidden = computed(
  () => !props.state.endCallerId || isFinished.value,
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
    <button
      type="button"
      class="button-quiet table-leave"
      :class="{ 'button-confirming': leaveConfirmation.armed.value }"
      @click="leaveTable"
    >
      {{
        leaveConfirmation.armed.value
          ? strings.table.confirmLeave
          : strings.table.leave
      }}
    </button>
    <div
      v-for="{ area, seats } in opponentAreas"
      :key="area"
      class="table-area"
      :class="area"
    >
      <PlayerSeat
        v-for="seat in seats"
        :key="seat.player.id"
        :name="seat.player.name"
        :badges="badges(seat)"
        :slots="slotViews(seat)"
        :active="seat.player.id === currentPlayerId"
        size="small"
        :compact="!targetsOpponents && !isFinished"
        @select="(slotIndex) => selectSlot(seat, slotIndex)"
      />
    </div>

    <div class="table-area area-center">
      <p class="banner" :class="{ 'banner-hidden': bannerHidden }">
        {{ bannerText }}
      </p>
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
        :draw-pile-count="state.drawPile.length"
        :discard-top="discardTop"
        :held-card="held?.card ?? null"
        :held-label="heldLabel"
        :held-face-up="heldFaceUp"
        :draw-clickable="clickable({ kind: 'drawPile' })"
        :discard-clickable="clickable({ kind: 'discardPile' })"
        :held-clickable="clickable({ kind: 'heldCard' })"
        :held-marked="heldMarked"
        :discard-ready="discardReady"
        :draw-highlighted="isTargetHighlighted({ kind: 'drawPile' })"
        :held-highlighted="isTargetHighlighted({ kind: 'heldCard' })"
        :held-in-flight="heldInFlight"
        :held-is-taken-discard="isTakingDiscard"
        @draw="click({ kind: 'drawPile' })"
        @discard="click({ kind: 'discardPile' })"
        @held="click({ kind: 'heldCard' })"
      />

      <ul v-if="!isFinished" class="move-log">
        <li v-for="(description, index) in recentMoves" :key="index">
          {{ description }}
        </li>
      </ul>
    </div>

    <div class="table-area area-hand">
      <p
        class="hint"
        :class="{
          'hint-active': situation.kind !== 'waiting',
          'hint-error': rejection,
        }"
      >
        {{ message }}
      </p>
      <PlayerSeat
        v-if="ownSeat"
        :name="`${ownSeat.player.name} (${strings.table.you})`"
        :badges="badges(ownSeat)"
        :slots="slotViews(ownSeat)"
        :active="ownSeat.player.id === currentPlayerId"
        size="large"
        @select="selectOwnSlot"
      />
      <div class="hand-actions">
        <button
          v-if="canCallEnd"
          type="button"
          class="button-call"
          :class="{
            'button-confirming': callEndConfirmation.armed.value,
            'button-next': highlighted.callEnd,
          }"
          @click="callEnd"
        >
          {{
            callEndConfirmation.armed.value
              ? strings.table.confirmCallEnd
              : strings.table.callEnd
          }}
        </button>
      </div>
    </div>
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

.table-with-coach .move-log,
.table-with-coach .hint,
.table-with-coach .banner {
  display: none;
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
  flex-direction: column;
  gap: 0.6rem;
}

.banner-hidden {
  visibility: hidden;
}

.banner {
  min-height: 2.2em;
  margin: 0;
  padding: 0.4rem var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--color-surface-dim);
  color: var(--color-accent);
  font-weight: 600;
}

.move-log {
  min-height: 3.9em;
  margin: 0;
  padding: 0;
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  line-height: 1.3;
  list-style: none;
  text-align: center;
}

.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 40rem;
  min-height: 2.6em;
  margin: 0;
  padding: var(--space-1) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  line-height: 1.3;
  text-align: center;
}

.hint-active {
  border-color: var(--color-accent-border);
  background: var(--color-accent-tint);
  color: var(--color-ink);
  font-weight: 600;
}

.hint-error {
  color: var(--color-error);
  font-weight: 600;
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

.hand-actions {
  display: flex;
  align-items: center;
  min-height: var(--control-height);
  gap: var(--space-3);
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

  .hint {
    font-size: 0.9rem;
  }
}
</style>
