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
