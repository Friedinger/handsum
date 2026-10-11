<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { strings } from "@/data/strings";
import { legalMoves, type Move, type Seat, type StartedGame } from "@/engine";
import { onlinePlayerIds, type SessionSnapshot } from "@/net/gameSession";
import type { SyncRejection } from "@/net/moveLog";
import FlightLayer from "@/ui/components/FlightLayer.vue";
import PlayerSeat from "@/ui/components/PlayerSeat.vue";
import ResultsPanel from "@/ui/components/ResultsPanel.vue";
import TableCenter from "@/ui/components/TableCenter.vue";
import { useCardFlights } from "@/ui/composables/useCardFlights";
import { useReveals } from "@/ui/composables/useReveals";
import { leaveRoom } from "@/ui/composables/useRoomCode";
import { anchorKey } from "@/ui/cardFlights";
import { playerName } from "@/ui/playerName";
import { isRevealed } from "@/ui/reveals";
import type { SlotView } from "@/ui/slotView";
import { hintFor } from "@/ui/tableHints";
import {
  canToggleSeveral,
  handleClick,
  isClickable,
  isSlotMarked,
  isSwappingSeveral,
  noIntent,
  situationOf,
  toggleSeveral,
  type ClickTarget,
  type Intent,
} from "@/ui/tableInteraction";
import { arrangeOpponents } from "@/ui/tableLayout";
import { currentHeldCard } from "@/ui/heldCard";

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: SyncRejection | null;
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
// Only a change of the own situation drops a half-made selection, not moves by others.
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
const ownSeat = computed(() =>
  props.state.seats.find((seat) => seat.player.id === selfId.value),
);
const isFinished = computed(() => props.state.phase.kind === "finished");
const currentPlayerId = computed(() =>
  props.state.phase.kind === "playing"
    ? props.state.phase.currentPlayerId
    : null,
);
const isTakingDiscard = computed(() => intent.value.kind === "takingDiscard");
// While the discard card is taken it is shown like a drawn card, with the next one below it.
const held = computed(() => {
  const topDiscard = props.state.discardPile[0];
  return isTakingDiscard.value && topDiscard
    ? { holderId: selfId.value, card: topDiscard }
    : currentHeldCard(props.state);
});
const discardTop = computed(() => {
  const whileFlying = cardFlights.discardTopWhileFlying.value;
  if (whileFlying !== undefined) {
    return whileFlying;
  }
  return props.state.discardPile[isTakingDiscard.value ? 1 : 0] ?? null;
});
const heldLabel = computed(() => {
  if (!held.value) {
    return null;
  }
  if (isTakingDiscard.value) {
    return strings.table.takenCard;
  }
  return held.value.holderId === selfId.value
    ? strings.table.yourCard
    : strings.table.holdingCard(playerName(props.state, held.value.holderId));
});
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

const hint = computed(() => hintFor(props.state, selfId.value, intent.value));

// One line for errors, reminders and hints, so the hand below never moves when the text changes.
const message = computed(() => {
  if (props.rejection) {
    return strings.syncRejectionMessages[props.rejection];
  }
  return showRememberNotice.value ? strings.hints.rememberCards : hint.value;
});

const showSeveralToggle = computed(() =>
  canToggleSeveral(situation.value, intent.value),
);

const showRememberNotice = computed(() =>
  reveals.value.some((reveal) => reveal.reason === "startingView"),
);

const canCallEnd = computed(
  () =>
    situation.value.kind === "choosing" &&
    intent.value.kind === "none" &&
    legalMoves(props.state, selfId.value).some(
      (move) => move.type === "callEnd",
    ),
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
            ? strings.hints.lastRound(playerName(state, state.endCallerId))
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
        :held-in-flight="cardFlights.hiddenAnchors.value.has('held')"
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
