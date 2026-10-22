<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import FlightLayer from "@/components/FlightLayer.vue";
import PlayerSeat from "@/components/PlayerSeat.vue";
import ResultsPanel from "@/components/ResultsPanel.vue";
import TableCenter from "@/components/TableCenter.vue";
import { useCardFlights } from "@/composables/useCardFlights";
import { useConfirmation } from "@/composables/useConfirmation";
import { useReveals } from "@/composables/useReveals";
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
import { hintFor } from "@/utils/tableHints";
import {
  type ClickTarget,
  type Intent,
  isSlotMarked,
  noIntent,
  selectedOwnSlots,
  situationOf,
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

useTurnAlert(
  () =>
    props.state.phase.kind === "playing" &&
    props.state.phase.currentPlayerId === selfId.value,
);

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

const CONFIRMATION_MS = 3000;

const CANCELLABLE_SITUATIONS = ["choosing", "holding"];

function cancelIntent(): void {
  if (CANCELLABLE_SITUATIONS.includes(situation.value.kind)) {
    intent.value = noIntent;
  }
}

function cancelOnEscape(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    cancelIntent();
  }
}

function cancelOnEmptyClick(event: MouseEvent): void {
  if (event.target instanceof Element && !event.target.closest("button")) {
    cancelIntent();
  }
}

onMounted(() => {
  document.addEventListener("keydown", cancelOnEscape);
});
onUnmounted(() => {
  document.removeEventListener("keydown", cancelOnEscape);
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
const hasSelection = computed(() => selectedOwnSlots(intent.value).length > 0);
const discardConfirms = computed(
  () => hasSelection.value && !isTakingDiscard.value,
);
const recentMoves = computed(() =>
  recentMoveDescriptions(props.state, props.snapshot.log.moves),
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
        :discard-confirms="discardConfirms"
        :held-confirms="hasSelection && isTakingDiscard"
        :held-in-flight="cardFlights.hiddenAnchors.value.has(HELD_ANCHOR)"
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
          :class="{ 'button-confirming': callEndConfirmation.armed.value }"
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
