<script setup lang="ts">
import { computed, ref } from "vue";
import { strings } from "../../data/strings";
import { MAX_PLAYERS, MIN_PLAYERS } from "../../engine";
import { lobbyPlayers, type SessionSnapshot } from "../../net/gameSession";
import type { SyncRejection } from "../../net/moveLog";
import { roomLink } from "../../net/roomCode";
import { leaveRoom } from "../composables/useRoomCode";

const props = defineProps<{ snapshot: SessionSnapshot; rejection: SyncRejection | null }>();
const emit = defineEmits<{ start: [] }>();

const COPIED_NOTICE_MS = 2000;

const link = computed(() => roomLink(location, props.snapshot.roomCode));
const players = computed(() => lobbyPlayers(props.snapshot));
const canStart = computed(
  () => players.value.length >= MIN_PLAYERS && players.value.length <= MAX_PLAYERS,
);
const copied = ref(false);

async function copyLink(): Promise<void> {
  await navigator.clipboard.writeText(link.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, COPIED_NOTICE_MS);
}
</script>

<template>
  <section>
    <h2>{{ strings.lobby.title(snapshot.roomCode) }}</h2>
    <p>{{ strings.lobby.shareHint }}</p>
    <p class="inline-form">
      <input :value="link" readonly class="link" />
      <button type="button" @click="copyLink">
        {{ copied ? strings.lobby.copied : strings.lobby.copyLink }}
      </button>
    </p>
    <h3>{{ strings.lobby.players }}</h3>
    <ul>
      <li v-for="player in players" :key="player.id">
        {{ player.name }}
        <span v-if="player.id === snapshot.self.playerId">({{ strings.table.you }})</span>
      </li>
    </ul>
    <p>{{ strings.lobby.startHint }}</p>
    <button type="button" :disabled="!canStart" @click="emit('start')">
      {{ strings.lobby.start }}
    </button>
    <p v-if="!canStart">{{ strings.lobby.playerLimits(MIN_PLAYERS, MAX_PLAYERS) }}</p>
    <p v-if="rejection" class="error">{{ strings.syncRejectionMessages[rejection] }}</p>
    <button type="button" @click="leaveRoom">{{ strings.lobby.leave }}</button>
  </section>
</template>
