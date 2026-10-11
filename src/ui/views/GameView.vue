<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { strings } from "../../data/strings";
import type { Card, Move, Seat, StartedGame } from "../../engine";
import { onlinePlayerIds, type SessionSnapshot } from "../../net/gameSession";
import type { SyncRejection } from "../../net/moveLog";
import PlayingCard from "../components/PlayingCard.vue";
import ResultsTable from "../components/ResultsTable.vue";
import SeatView, { type SlotView } from "../components/SeatView.vue";
import TurnControls from "../components/TurnControls.vue";
import { useReveals } from "../composables/useReveals";
import { leaveRoom } from "../composables/useRoomCode";
import { describeActivity, describeEvent, playerName } from "../describe";
import { isRevealed } from "../reveals";
import {
  beginSelection,
  idle,
  initialSelection,
  isSelectable,
  isSelected,
  moveForSelection,
  selectSlot,
  submitsOnSelect,
  type Selection,
} from "../selection";
import { currentHeldCard } from "../visibility";

const ACTIVITY_ENTRIES = 6;

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: SyncRejection | null;
}>();
const emit = defineEmits<{ move: [move: Move] }>();

const selfId = computed(() => props.snapshot.self.playerId);
const online = computed(() => onlinePlayerIds(props.snapshot));
const reveals = useReveals(() => props.snapshot.log, props.snapshot.self.playerId);

const phase = computed(() => props.state.phase);
const isFinished = computed(() => phase.value.kind === "finished");
const currentPlayerId = computed(() =>
  phase.value.kind === "playing" ? phase.value.currentPlayerId : null,
);
const isMyTurn = computed(() => currentPlayerId.value === selfId.value);
const held = computed(() => currentHeldCard(props.state));
const myHeldCard = computed((): Card | null =>
  held.value?.holderId === selfId.value ? held.value.card : null,
);
const hasViewedStartingCards = computed(
  () => phase.value.kind === "startingView" && phase.value.viewedPlayerIds.includes(selfId.value),
);
const showControls = computed(
  () => isMyTurn.value || (phase.value.kind === "startingView" && !hasViewedStartingCards.value),
);

const heading = computed(() => {
  if (phase.value.kind !== "playing") {
    return strings.phaseNames[phase.value.kind];
  }
  return isMyTurn.value
    ? strings.table.yourTurn
    : strings.table.playersTurn(playerName(props.state, phase.value.currentPlayerId));
});

// Only a change of the own situation resets a half-made selection, not moves by others.
const selectionContext = computed(() => {
  const { phase: current } = props.state;
  if (current.kind === "startingView") {
    return `startingView:${String(current.viewedPlayerIds.includes(selfId.value))}`;
  }
  if (current.kind === "playing") {
    return `playing:${current.currentPlayerId}:${current.step.kind}`;
  }
  return current.kind;
});
const selection = ref<Selection>(initialSelection(props.state, selfId.value));
watch(selectionContext, () => {
  selection.value = initialSelection(props.state, selfId.value);
});

const results = computed(() => (phase.value.kind === "finished" ? phase.value.results : []));

const activity = computed(() =>
  props.snapshot.log.moves
    .slice(-ACTIVITY_ENTRIES)
    .map((move) => describeActivity(props.state, move))
    .reverse(),
);

const publicEvents = computed(() =>
  props.state.lastMoveEvents
    .filter((event) => event.type !== "cardViewed" || event.viewerId === selfId.value)
    .map((event) => describeEvent(props.state, event)),
);

function seatTitle(seat: Seat): string {
  const markers = [
    seat.player.id === selfId.value ? strings.table.you : null,
    online.value.has(seat.player.id) ? null : strings.table.offline,
  ].filter((marker) => marker !== null);
  return markers.length > 0 ? `${seat.player.name} (${markers.join(", ")})` : seat.player.name;
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
        selectable: isSelectable(selection.value, slot, selfId.value),
        selected: isSelected(selection.value, slot, selfId.value),
      },
    ];
  });
}

function submit(move: Move | null): void {
  if (move) {
    emit("move", move);
  }
}

function onSelectSlot(seat: Seat, slotIndex: number): void {
  selection.value = selectSlot(
    selection.value,
    { playerId: seat.player.id, slotIndex },
    selfId.value,
  );
  const move = moveForSelection(selection.value, selfId.value);
  if (submitsOnSelect(selection.value) && move) {
    submit(move);
  }
}
</script>

<template>
  <section class="game">
    <h2>{{ heading }}</h2>
    <p v-if="state.endCallerId && !isFinished" class="notice">
      {{ strings.controls.lastRound(playerName(state, state.endCallerId)) }}
    </p>

    <div class="piles">
      <div class="pile">
        <span>{{ strings.table.drawPile }} ({{ state.drawPile.length }})</span>
        <PlayingCard :card="state.drawPile[0] ?? null" :face-up="false" />
      </div>
      <div class="pile">
        <span>{{ strings.table.discardPile }}</span>
        <PlayingCard :card="state.discardPile[0] ?? null" face-up />
      </div>
      <div v-if="held" class="pile">
        <span>{{
          myHeldCard
            ? strings.table.heldCard
            : strings.controls.holdingCard(playerName(state, held.holderId))
        }}</span>
        <PlayingCard :card="held.card" :face-up="myHeldCard !== null" />
      </div>
    </div>

    <div class="seats">
      <SeatView
        v-for="seat in state.seats"
        :key="seat.player.id"
        :title="seatTitle(seat)"
        :slots="slotViews(seat)"
        :active="seat.player.id === currentPlayerId"
        @select="(slotIndex) => onSelectSlot(seat, slotIndex)"
      />
    </div>

    <p v-if="rejection" class="error">{{ strings.syncRejectionMessages[rejection] }}</p>

    <TurnControls
      v-if="showControls"
      :state="state"
      :self-id="selfId"
      :selection="selection"
      :held-card="myHeldCard"
      @move="submit"
      @begin="(kind) => (selection = beginSelection(kind))"
      @confirm="submit(moveForSelection(selection, selfId))"
      @cancel="selection = idle"
    />
    <template v-else-if="phase.kind === 'startingView'">
      <p class="notice">{{ strings.controls.rememberCards }}</p>
      <p>{{ strings.controls.waitingForStartingView }}</p>
    </template>

    <ResultsTable v-if="isFinished" :state="state" :results="results" />

    <section class="activity">
      <h3>{{ strings.activity.title }}</h3>
      <ul>
        <li v-for="(text, index) in publicEvents" :key="`event-${index}`" class="notice">
          {{ text }}
        </li>
        <li v-for="(text, index) in activity" :key="index">{{ text }}</li>
      </ul>
    </section>

    <button type="button" @click="leaveRoom">{{ strings.lobby.leave }}</button>
  </section>
</template>
