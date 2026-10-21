<script setup lang="ts">
import { computed, ref } from "vue";

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

async function copyLink(): Promise<void> {
  copyResult.value = (await copyText(link.value)) ? "copied" : "failed";
  setTimeout(() => {
    copyResult.value = "idle";
  }, COPIED_NOTICE_MS);
}

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
          class="button-secondary button-accent-outline"
          @click="share"
        >
          {{ strings.lobby.share }}
        </button>
        <button type="button" class="button-secondary" @click="copyLink">
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
        {{ strings.lobby.leave }}
      </button>
    </div>
  </section>
</template>
