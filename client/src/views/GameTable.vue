<script setup lang="ts">
import { computed, ref, watch } from "vue";

import FlightLayer from "@/components/FlightLayer.vue";
import PlayerSeat from "@/components/PlayerSeat.vue";
import ResultsPanel from "@/components/ResultsPanel.vue";
import TableCenter from "@/components/TableCenter.vue";
import { useCardFlights } from "@/composables/useCardFlights";
import { useReveals } from "@/composables/useReveals";
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
import { isRevealed } from "@/utils/reveals";
import { leaveRoom } from "@/utils/roomNavigation";
import type { SlotView } from "@/utils/slotView";
import { hintFor } from "@/utils/tableHints";
import {
  canToggleSeveral,
  type ClickTarget,
  type Intent,
  isSlotMarked,
  isSwappingSeveral,
  noIntent,
  situationOf,
  toggleSeveral,
} from "@/utils/tableIntent";
import { handleClick, isClickable } from "@/utils/tableInteraction";
import { arrangeOpponents } from "@/utils/tableLayout";

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: MoveRejection | null;
}>();
const emit = defineEmits<{ move: [move: Move]; playAgain: [] }>();

const selfId = computed(() => props.snapshot.self.playerId);
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
const situation = computed(() => situationOf(props.state, selfId.value));

const intent = ref<Intent>(noIntent);
/**
 * Only a change of the own situation drops a half-made selection, not moves by others.
 */
const intentContext = computed(() =>
  situation.value.kind === "startingView"
    ? situation.value.kind
    : `${situation.value.kind}:${String(props.state.moveCount)}`,
);
watch(intentContext, () => {
  intent.value = noIntent;
});

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
const isTakingDiscard = computed(() => intent.value.kind === "takingDiscard");
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
const targetsOpponents = computed(
  () => intent.value.kind === "action" && intent.value.action !== "viewOwn",
);

function clickable(target: ClickTarget): boolean {
  return isClickable(props.state, selfId.value, intent.value, target);
}

function click(target: ClickTarget): void {
  const outcome = handleClick(props.state, selfId.value, intent.value, target);
  intent.value = outcome.intent;
  if (outcome.move) {
    emit("move", outcome.move);
  }
}

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

const showSeveralToggle = computed(() =>
  canToggleSeveral(situation.value, intent.value),
);

const canCallEnd = computed(
  () =>
    situation.value.kind === "choosing" &&
    intent.value.kind === "none" &&
    tryApplyMove(props.state, { type: "callEnd", playerId: selfId.value }).ok,
);

const results = computed(() =>
  props.state.phase.kind === "finished" ? props.state.phase.results : [],
);
</script>

<template>
  <div ref="tableElement" class="game-table">
    <button type="button" class="button-quiet table-leave" @click="leaveRoom">
      {{ strings.table.leave }}
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
      <p
        class="banner"
        :class="{ 'banner-hidden': !state.endCallerId || isFinished }"
      >
        {{
          state.endCallerId
            ? strings.hints.lastRound(displayName(state, state.endCallerId))
            : ""
        }}
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
        :held-face-up="held?.holderId === selfId"
        :draw-clickable="clickable({ kind: 'drawPile' })"
        :discard-clickable="clickable({ kind: 'discardPile' })"
        :held-clickable="clickable({ kind: 'heldCard' })"
        :held-marked="intent.kind === 'action'"
        :held-in-flight="cardFlights.hiddenAnchors.value.has(HELD_ANCHOR)"
        :held-is-taken-discard="isTakingDiscard"
        @draw="click({ kind: 'drawPile' })"
        @discard="click({ kind: 'discardPile' })"
        @held="click({ kind: 'heldCard' })"
      />
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
          v-if="showSeveralToggle"
          type="button"
          class="button-toggle"
          :aria-pressed="isSwappingSeveral(intent)"
          @click="intent = toggleSeveral(intent)"
        >
          {{ strings.table.swapSeveral }}
        </button>
        <button
          v-if="canCallEnd"
          type="button"
          class="button-call"
          @click="emit('move', { type: 'callEnd', playerId: selfId })"
        >
          {{ strings.table.callEnd }}
        </button>
      </div>
    </div>
    <FlightLayer
      :flights="cardFlights.flights.value"
      @land="cardFlights.land"
    />
  </div>
</template>
