<script setup lang="ts">
import FlyingCard from "@/components/FlyingCard.vue";
import type { ActiveFlight } from "@/composables/useCardFlights";

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
