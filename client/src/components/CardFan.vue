<script setup lang="ts">
import PlayingCard from "@/components/PlayingCard.vue";
import { type Card, standardDeck } from "@/engine";

interface FanCard {
  readonly card: Card;
  readonly tiltDegrees: number;
}

const FAN_SHAPE = [
  { value: 0, tiltDegrees: -12 },
  { value: 5, tiltDegrees: -4 },
  { value: 9, tiltDegrees: 4 },
  { value: 13, tiltDegrees: 12 },
] as const;

function cardOfValue(value: number): Card {
  const card = standardDeck.find((candidate) => candidate.value === value);
  if (!card) {
    throw new Error(`The deck has no card with value ${String(value)}`);
  }
  return card;
}

const fan: readonly FanCard[] = FAN_SHAPE.map(({ value, tiltDegrees }) => ({
  card: cardOfValue(value),
  tiltDegrees,
}));
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
