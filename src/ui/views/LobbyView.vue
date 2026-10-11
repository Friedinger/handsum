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
  <section class="panel stack">
    <h2>{{ strings.lobby.title(snapshot.roomCode) }}</h2>
    <div class="stack">
      <span class="muted">{{ strings.lobby.shareHint }}</span>
      <div class="inline-form">
        <input :value="link" readonly :aria-label="strings.lobby.shareHint" />
        <button type="button" class="button-secondary" @click="copyLink">
          {{ copied ? strings.lobby.copied : strings.lobby.copyLink }}
        </button>
      </div>
    </div>
    <div class="stack">
      <span class="muted">{{ strings.lobby.players }}</span>
      <ul class="player-list">
        <li v-for="player in players" :key="player.id">
          {{ player.name }}
          <span v-if="player.id === snapshot.self.playerId">({{ strings.table.you }})</span>
        </li>
      </ul>
    </div>
    <p class="muted">
      {{
        canStart ? strings.lobby.startHint : strings.lobby.playerLimits(MIN_PLAYERS, MAX_PLAYERS)
      }}
    </p>
    <p v-if="rejection" class="error">{{ strings.syncRejectionMessages[rejection] }}</p>
    <div class="inline-form">
      <button type="button" class="button-primary" :disabled="!canStart" @click="emit('start')">
        {{ strings.lobby.start }}
      </button>
      <button type="button" class="button-secondary" @click="leaveRoom">
        {{ strings.lobby.leave }}
      </button>
    </div>
  </section>
</template>
