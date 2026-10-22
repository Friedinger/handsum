<script setup lang="ts">
import PlayingCard from "@/components/PlayingCard.vue";
import type { CardSize, SlotView } from "@/utils/slotView";

withDefaults(
  defineProps<{
    name: string;
    badges: readonly string[];
    slots: readonly SlotView[];
    active: boolean;
    size: CardSize;
    compact?: boolean;
  }>(),
  { compact: false },
);
const emit = defineEmits<{ select: [slotIndex: number] }>();
</script>

<template>
  <div
    class="player-seat"
    :class="[
      `seat-${size}`,
      { 'seat-active': active, 'seat-compact': compact },
    ]"
  >
    <div class="seat-label">
      <span class="seat-name">{{ name }}</span>
      <span v-for="badge in badges" :key="badge" class="seat-badge">{{
        badge
      }}</span>
    </div>
    <div class="seat-cards">
      <PlayingCard
        v-for="slot in slots"
        :key="slot.slotIndex"
        :card="slot.card"
        :face-up="slot.faceUp"
        :size="size"
        :clickable="slot.clickable"
        :marked="slot.marked"
        :in-flight="slot.inFlight"
        :peeked="slot.peeked"
        :data-anchor="slot.anchor"
        @click="emit('select', slot.slotIndex)"
      />
    </div>
  </div>
</template>

<style scoped>
.player-seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  gap: 0.35rem;
  border: 2px solid transparent;
  border-radius: var(--radius);
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.seat-active {
  border-color: var(--color-accent);
  background: var(--color-accent-tint);
}

.seat-label {
  display: flex;
  align-items: center;
  max-width: 100%;
  gap: 0.4rem;
  font-size: 0.9rem;
  white-space: nowrap;
}

/* Opponent seats always take the width of four spread-out cards, so expanding them for an
   action or adding a badge never pushes the rest of the table around. */
.seat-small {
  width: calc(var(--card-width-small) * 4 + 0.5rem * 3 + 1.5rem + 4px);
}

.seat-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
}

.seat-badge {
  flex: none;
  padding: 0.05rem 0.45rem;
  border-radius: var(--radius-pill);
  background: var(--color-surface-dim);
  color: var(--color-ink-muted);
  font-size: 0.75rem;
}

/* Room for the lifted (hovered or selected) cards, so they never reach into the name. */
.seat-cards {
  display: flex;
  padding-top: 1.1rem;
  gap: var(--space-2);
}

/* Opponents only need to show how many cards they hold, so their cards overlap. */
.seat-compact .seat-cards {
  gap: 0;
}

.seat-compact .seat-cards > .card + .card {
  margin-left: calc(var(--card-width) * -0.55);
}

@media (max-width: 40rem) {
  .player-seat {
    padding: var(--space-1) 0.35rem;
  }

  .seat-small {
    width: auto;
  }

  .seat-small .seat-cards {
    padding-top: 0.4rem;
  }

  .seat-cards {
    gap: 0.35rem;
  }
}
</style>
