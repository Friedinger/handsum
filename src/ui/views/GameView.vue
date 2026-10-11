<script setup lang="ts">
import { computed } from "vue";
import { strings } from "../../data/strings";
import { legalMoves, type Move, type Seat, type StartedGame } from "../../engine";
import { onlinePlayerIds, type SessionSnapshot } from "../../net/gameSession";
import type { SyncRejection } from "../../net/moveLog";
import PlayingCard from "../components/PlayingCard.vue";
import { describeEvent, describeMove, playerName } from "../describe";
import { heldCardVisibleTo, isSlotVisibleTo } from "../visibility";

const props = defineProps<{
  snapshot: SessionSnapshot;
  state: StartedGame;
  rejection: SyncRejection | null;
}>();
const emit = defineEmits<{ move: [move: Move] }>();

const selfId = computed(() => props.snapshot.self.playerId);
const online = computed(() => onlinePlayerIds(props.snapshot));
const moves = computed(() => legalMoves(props.state, selfId.value));
const heldCard = computed(() => heldCardVisibleTo(props.state, selfId.value));

const turnLabel = computed(() => {
  const { phase } = props.state;
  if (phase.kind !== "playing") {
    return strings.phaseNames[phase.kind];
  }
  return phase.currentPlayerId === selfId.value
    ? strings.table.yourTurn
    : strings.table.playersTurn(playerName(props.state, phase.currentPlayerId));
});

const visibleEvents = computed(() =>
  props.state.lastMoveEvents.filter(
    (event) => event.type !== "cardViewed" || event.viewerId === selfId.value,
  ),
);

const results = computed(() =>
  props.state.phase.kind === "finished" ? props.state.phase.results : [],
);

function seatTitle(seat: Seat): string {
  const markers = [
    seat.player.id === selfId.value ? strings.table.you : null,
    online.value.has(seat.player.id) ? null : strings.table.offline,
    props.state.endCallerId === seat.player.id ? strings.moveNames.callEnd : null,
  ].filter((marker) => marker !== null);
  return markers.length > 0 ? `${seat.player.name} (${markers.join(", ")})` : seat.player.name;
}

function isVisible(seat: Seat, slotIndex: number): boolean {
  return isSlotVisibleTo(props.state, selfId.value, seat.player.id, slotIndex);
}
</script>

<template>
  <section>
    <h2>{{ turnLabel }}</h2>
    <div class="piles">
      <div>
        {{ strings.table.drawPile }} ({{ state.drawPile.length }})
        <PlayingCard :card-slot="state.drawPile[0] ?? null" :face-up="false" />
      </div>
      <div>
        {{ strings.table.discardPile }} ({{ state.discardPile.length }})
        <PlayingCard :card-slot="state.discardPile[0] ?? null" face-up />
      </div>
      <div v-if="heldCard">
        {{ strings.table.heldCard }}
        <PlayingCard :card-slot="heldCard.card" face-up />
      </div>
    </div>
    <div class="seats">
      <div v-for="seat in state.seats" :key="seat.player.id" class="seat">
        <h3>{{ seatTitle(seat) }}</h3>
        <div class="layout">
          <PlayingCard
            v-for="(slot, slotIndex) in seat.layout"
            :key="slotIndex"
            :card-slot="slot"
            :face-up="isVisible(seat, slotIndex)"
          />
        </div>
      </div>
    </div>
    <ul v-if="visibleEvents.length > 0">
      <li v-for="(event, index) in visibleEvents" :key="index">
        {{ describeEvent(state, event) }}
      </li>
    </ul>
    <p v-if="rejection" class="error">{{ strings.syncRejectionMessages[rejection] }}</p>
    <template v-if="results.length > 0">
      <h3>{{ strings.table.results }}</h3>
      <table>
        <tr>
          <th></th>
          <th>{{ strings.table.cardSum }}</th>
          <th>{{ strings.table.score }}</th>
          <th>{{ strings.table.winner }}</th>
        </tr>
        <tr v-for="result in results" :key="result.playerId">
          <td>{{ playerName(state, result.playerId) }}</td>
          <td>{{ result.cardSum }}</td>
          <td>{{ result.score }}</td>
          <td>{{ result.isWinner ? "✓" : "" }}</td>
        </tr>
      </table>
    </template>
    <template v-else>
      <h3>{{ strings.table.yourMoves }}</h3>
      <div v-if="moves.length > 0" class="moves">
        <button
          v-for="(move, index) in moves"
          :key="index"
          type="button"
          @click="emit('move', move)"
        >
          {{ describeMove(state, move) }}
        </button>
      </div>
      <p v-else>{{ strings.table.waitingForOthers }}</p>
    </template>
  </section>
</template>
