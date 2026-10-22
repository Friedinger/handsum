<script setup lang="ts">
import AppFooter from "@/components/AppFooter.vue";
import CardFan from "@/components/CardFan.vue";
import { useRoute } from "@/composables/useRoute";
import { strings } from "@/data/strings";
import HomeView from "@/views/HomeView.vue";
import RoomView from "@/views/RoomView.vue";
import TutorialView from "@/views/TutorialView.vue";

const route = useRoute();
</script>

<template>
  <div class="app">
    <header>
      <h1>{{ strings.appTitle }}</h1>
      <CardFan />
    </header>
    <main>
      <RoomView
        v-if="route.kind === 'room'"
        :key="route.roomCode"
        :room-code="route.roomCode"
      />
      <TutorialView v-else-if="route.kind === 'tutorial'" />
      <HomeView v-else />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.app > main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.app > header h1 {
  margin: 0 0 var(--space-3);
  color: var(--color-accent);
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: 0.04em;
  text-align: center;
}

/* The big title with the card fan frames every page except the game itself, which needs the room. */
.app:not(:has(.game-table)) > header h1 {
  margin-top: 2.5rem;
  font-size: 2.4rem;
}

.app:not(:has(.game-table)) .card-fan {
  display: flex;
}
</style>
