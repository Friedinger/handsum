<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { strings } from "../../data/strings";
import { legalMoves, type Move, type Seat, type StartedGame } from "../../engine";
import { onlinePlayerIds, type SessionSnapshot } from "../../net/gameSession";
import type { SyncRejection } from "../../net/moveLog";
import PlayerSeat from "../components/PlayerSeat.vue";
import ResultsPanel from "../components/ResultsPanel.vue";
import TableCenter from "../components/TableCenter.vue";
import { useReveals } from "../composables/useReveals";
import { leaveRoom } from "../composables/useRoomCode";
import { describeActivity, describeEvent, playerName } from "../describe";
import { isRevealed } from "../reveals";
import type { SlotView } from "../slotView";
import {
  canToggleSeveral,
  handleClick,
  isClickable,
  isSlotMarked,
  isSwappingSeveral,
  noIntent,
  selectedOwnSlots,
  situationOf,
  toggleSeveral,
  type ClickTarget,
  type Intent,
} from "../tableInteraction";
import { arrangeOpponents } from "../tableLayout";
import { currentHeldCard } from "../visibility";

const ACTIVITY_ENTRIES = 3;

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: SyncRejection | null;
}>();
const emit = defineEmits<{ move: [move: Move] }>();

const selfId = computed(() => props.snapshot.self.playerId);
const online = computed(() => onlinePlayerIds(props.snapshot));
const reveals = useReveals(() => props.snapshot.log, props.snapshot.self.playerId);
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

const sides = computed(() => arrangeOpponents(props.state.seats, selfId.value));
const ownSeat = computed(() => props.state.seats.find((seat) => seat.player.id === selfId.value));
const isFinished = computed(() => props.state.phase.kind === "finished");
const currentPlayerId = computed(() =>
  props.state.phase.kind === "playing" ? props.state.phase.currentPlayerId : null,
);
const isTakingDiscard = computed(() => intent.value.kind === "takingDiscard");
// While the discard card is taken it is shown like a drawn card, with the next one below it.
const held = computed(() => {
  const topDiscard = props.state.discardPile[0];
  return isTakingDiscard.value && topDiscard
    ? { holderId: selfId.value, card: topDiscard }
    : currentHeldCard(props.state);
});
const discardTop = computed(() => props.state.discardPile[isTakingDiscard.value ? 1 : 0] ?? null);
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
    return [
      {
        slotIndex,
        card,
        faceUp:
          isFinished.value || isRevealed(reveals.value, props.state, seat.player.id, slotIndex),
        clickable: clickable({ kind: "slot", slot }),
        marked: isSlotMarked(intent.value, slot, selfId.value),
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

const hint = computed(() => {
  const { hints } = strings;
  const current = situation.value;
  if (isSwappingSeveral(intent.value)) {
    return selectedOwnSlots(intent.value).length > 0
      ? hints.severalCardsSelected
      : hints.severalCards;
  }
  switch (current.kind) {
    case "startingView":
      return hints.startingView;
    case "choosing":
      return intent.value.kind === "takingDiscard" ? hints.takingDiscard : hints.choosing;
    case "holding":
      if (intent.value.kind === "action") {
        return hints[intent.value.action];
      }
      return current.card.action ? hints.holdingAction : hints.holding;
    case "waiting":
      if (isFinished.value) {
        return hints.finished;
      }
      if (props.state.phase.kind === "startingView") {
        return hints.waitingForStartingView;
      }
      return hints.othersTurn(playerName(props.state, currentPlayerId.value ?? ""));
  }
});

const showSeveralToggle = computed(() => canToggleSeveral(situation.value, intent.value));

const showRememberNotice = computed(() =>
  reveals.value.some((reveal) => reveal.reason === "startingView"),
);

const canCallEnd = computed(
  () =>
    situation.value.kind === "choosing" &&
    intent.value.kind === "none" &&
    legalMoves(props.state, selfId.value).some((move) => move.type === "callEnd"),
);

const activity = computed(() => [
  ...props.state.lastMoveEvents
    .filter((event) => event.type !== "cardViewed" || event.viewerId === selfId.value)
    .map((event) => describeEvent(props.state, event)),
  ...props.snapshot.log.moves
    .slice(-ACTIVITY_ENTRIES)
    .map((move) => describeActivity(props.state, move))
    .reverse(),
]);

const results = computed(() =>
  props.state.phase.kind === "finished" ? props.state.phase.results : [],
);
</script>

<template>
  <div class="game-table">
    <div class="table-area area-top">
      <PlayerSeat
        v-for="seat in sides.top"
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
    <div class="table-area area-left">
      <PlayerSeat
        v-for="seat in sides.left"
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
      <p class="banner" :class="{ 'banner-hidden': !state.endCallerId || isFinished }">
        {{ state.endCallerId ? strings.hints.lastRound(playerName(state, state.endCallerId)) : "" }}
      </p>
      <ResultsPanel
        v-if="isFinished"
        :state="state"
        :results="results"
        :self-id="selfId"
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
        @draw="click({ kind: 'drawPile' })"
        @discard="click({ kind: 'discardPile' })"
        @held="click({ kind: 'heldCard' })"
      />
      <ul class="activity">
        <li v-for="(text, index) in activity" :key="index">{{ text }}</li>
      </ul>
    </div>

    <div class="table-area area-right">
      <PlayerSeat
        v-for="seat in sides.right"
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

    <div class="table-area area-hand">
      <p class="hint" :class="{ 'hint-active': situation.kind !== 'waiting' }">
        {{ showRememberNotice ? strings.hints.rememberCards : hint }}
      </p>
      <p v-if="rejection" class="error">{{ strings.syncRejectionMessages[rejection] }}</p>
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
        <button type="button" class="button-quiet" @click="leaveRoom">
          {{ strings.table.leave }}
        </button>
      </div>
    </div>
  </div>
</template>
