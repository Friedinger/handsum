<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

import { strings } from "@/data/strings";
import { MAX_PLAYERS, MIN_PLAYERS, type MoveRejection } from "@/engine";
import { lobbyPlayers, type SessionSnapshot } from "@/net/gameSession";
import { roomLink } from "@/net/roomCode";
import { copyText } from "@/utils/clipboard";
import { leaveRoom } from "@/utils/roomNavigation";
import { canShareLink, shareLink } from "@/utils/shareLink";

const props = defineProps<{
  snapshot: SessionSnapshot;
  rejection: MoveRejection | null;
}>();
const emit = defineEmits<{ start: [] }>();

const COPIED_NOTICE_MS = 2000;

const link = computed(() => roomLink(location, props.snapshot.roomCode));
const players = computed(() => lobbyPlayers(props.snapshot));
const canStart = computed(
  () =>
    players.value.length >= MIN_PLAYERS && players.value.length <= MAX_PLAYERS,
);
const copyResult = ref<"idle" | "copied" | "failed">("idle");

let copyResultTimer: ReturnType<typeof setTimeout> | undefined;

async function copyLink(): Promise<void> {
  copyResult.value = (await copyText(link.value)) ? "copied" : "failed";
  clearTimeout(copyResultTimer);
  copyResultTimer = setTimeout(() => {
    copyResult.value = "idle";
  }, COPIED_NOTICE_MS);
}

onUnmounted(() => {
  clearTimeout(copyResultTimer);
});

async function share(): Promise<void> {
  const result = await shareLink(link.value, strings.lobby.shareTitle);
  if (result === "failed") {
    await copyLink();
  }
}
</script>

<template>
  <section class="panel stack">
    <h2>{{ strings.lobby.title(snapshot.roomCode) }}</h2>
    <div class="stack">
      <span class="muted">{{ strings.lobby.shareHint }}</span>
      <div class="inline-form">
        <input :value="link" readonly :aria-label="strings.lobby.shareHint" />
        <button
          v-if="canShareLink()"
          type="button"
          class="button-accent-outline"
          @click="share"
        >
          {{ strings.lobby.share }}
        </button>
        <button
          type="button"
          class="button-secondary button-copy"
          @click="copyLink"
        >
          {{
            copyResult === "copied"
              ? strings.lobby.copied
              : strings.lobby.copyLink
          }}
        </button>
      </div>
      <p v-if="copyResult === 'failed'" class="error">
        {{ strings.lobby.copyFailed }}
      </p>
    </div>
    <div class="stack">
      <span class="muted">{{ strings.lobby.players }}</span>
      <ul class="player-list">
        <li v-for="player in players" :key="player.id">
          {{ player.name }}
          <span v-if="player.id === snapshot.self.playerId"
            >({{ strings.table.you }})</span
          >
        </li>
      </ul>
    </div>
    <p class="muted">
      {{
        canStart
          ? strings.lobby.startHint
          : strings.lobby.playerLimits(MIN_PLAYERS, MAX_PLAYERS)
      }}
    </p>
    <p v-if="rejection" class="error">
      {{ strings.rejectionMessages[rejection] }}
    </p>
    <div class="inline-form">
      <button
        type="button"
        class="button-primary"
        :disabled="!canStart"
        @click="emit('start')"
      >
        {{ strings.lobby.start }}
      </button>
      <button type="button" class="button-secondary" @click="leaveRoom">
        {{ strings.table.leave }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Wide enough for both labels, so the row does not jump when the text changes to "Copied!". */
.button-copy {
  min-width: 7.5rem;
}

.player-list {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  gap: 0.4rem;
  list-style: none;
}

.player-list li {
  padding: 0.3rem var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-surface-dim);
}
</style>
