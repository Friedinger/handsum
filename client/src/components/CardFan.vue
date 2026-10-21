<script setup lang="ts">
import PlayingCard from "@/components/PlayingCard.vue";
import type { Card } from "@/engine";

interface FanCard {
  readonly card: Card;
  readonly tiltDegrees: number;
}

const fan: readonly FanCard[] = [
  { card: { id: 1, value: 1, points: 1, action: null }, tiltDegrees: -16 },
  { card: { id: 2, value: 7, points: 7, action: "viewOwn" }, tiltDegrees: -8 },
  { card: { id: 3, value: 5, points: 5, action: null }, tiltDegrees: 0 },
  { card: { id: 4, value: 9, points: 9, action: "viewOther" }, tiltDegrees: 8 },
  { card: { id: 5, value: 12, points: 12, action: null }, tiltDegrees: 16 },
];
</script>

<template>
  <div class="card-fan" aria-hidden="true">
    <div
      v-for="{ card, tiltDegrees } in fan"
      :key="card.id"
      class="fan-card"
      :style="{ '--tilt': `${String(tiltDegrees)}deg` }"
    >
      <PlayingCard :card="card" face-up size="medium" />
    </div>
  </div>
</template>
