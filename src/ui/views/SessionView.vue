<script setup lang="ts">
import { computed } from "vue";
import { strings } from "../../data/strings";
import type { HelloMessage } from "../../net/protocol";
import { useGameSession } from "../composables/useGameSession";
import GameTable from "./GameTable.vue";
import LobbyView from "./LobbyView.vue";

const props = defineProps<{ roomCode: string; self: HelloMessage }>();

const { snapshot, lastRejection, submitMove, startGame } = useGameSession(
  props.roomCode,
  props.self,
);

const game = computed(() => snapshot.value.log.state);
const isSeated = computed(
  () =>
    game.value.status === "started" &&
    game.value.seats.some((seat) => seat.player.id === props.self.playerId),
);
</script>

<template>
  <LobbyView
    v-if="game.status === 'notStarted'"
    :snapshot="snapshot"
    :rejection="lastRejection"
    @start="startGame"
  />
  <GameTable
    v-else-if="isSeated"
    :snapshot="snapshot"
    :state="game"
    :rejection="lastRejection"
    @move="submitMove"
    @play-again="startGame"
  />
  <p v-else class="panel">{{ strings.spectator.notice }}</p>
</template>
