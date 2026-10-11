<script setup lang="ts">
import type { ActiveFlight } from "../composables/useCardFlights";
import FlyingCard from "./FlyingCard.vue";

defineProps<{ flights: readonly ActiveFlight[] }>();
const emit = defineEmits<{ land: [id: number] }>();
</script>

<template>
  <div class="flight-layer" aria-hidden="true">
    <FlyingCard
      v-for="active in flights"
      :key="active.id"
      :active="active"
      @land="emit('land', active.id)"
    />
  </div>
</template>
