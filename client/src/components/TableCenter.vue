<script setup lang="ts">
import PlayingCard from "@/components/PlayingCard.vue";
import { strings } from "@/data/strings";
import type { Card } from "@/engine";
import {
  DISCARD_BELOW_ANCHOR,
  DISCARD_PILE_ANCHOR,
  DRAW_PILE_ANCHOR,
  HELD_ANCHOR,
} from "@/utils/cardFlights";

defineProps<{
  drawPileCount: number;
  discardTop: Card | null;
  heldCard: Card | null;
  heldLabel: string | null;
  heldFaceUp: boolean;
  drawClickable: boolean;
  discardClickable: boolean;
  heldClickable: boolean;
  heldMarked: boolean;
  discardConfirms: boolean;
  heldInFlight: boolean;
  heldIsTakenDiscard: boolean;
}>();
const emit = defineEmits<{ draw: []; discard: []; held: [] }>();
</script>

<template>
  <div class="table-center">
    <div class="pile">
      <PlayingCard
        :card="null"
        :face-up="drawPileCount === 0"
        size="large"
        class="pile-stack"
        :data-anchor="DRAW_PILE_ANCHOR"
        :aria-label="strings.table.drawPile"
        :clickable="drawClickable"
        @click="emit('draw')"
      />
      <span class="pile-label">{{
        strings.table.drawPileCount(drawPileCount)
      }}</span>
    </div>
    <div class="pile">
      <PlayingCard
        :card="discardTop"
        face-up
        size="large"
        :data-anchor="
          heldIsTakenDiscard ? DISCARD_BELOW_ANCHOR : DISCARD_PILE_ANCHOR
        "
        :clickable="discardClickable"
        :ready="discardConfirms"
        @click="emit('discard')"
      />
      <span class="pile-label">{{ strings.table.discardPile }}</span>
    </div>
    <div class="pile pile-held" :class="{ 'pile-vacant': !heldCard }">
      <div
        v-if="!heldCard"
        class="card card-large"
        :data-anchor="HELD_ANCHOR"
        aria-hidden="true"
      />
      <PlayingCard
        v-else
        :card="heldCard"
        :face-up="heldFaceUp"
        size="large"
        :clickable="heldClickable"
        :marked="heldMarked"
        :in-flight="heldInFlight"
        :data-anchor="heldIsTakenDiscard ? DISCARD_PILE_ANCHOR : HELD_ANCHOR"
        @click="emit('held')"
      />
      <span class="pile-label">{{ heldLabel ?? "" }}</span>
    </div>
  </div>
</template>

<style scoped>
.table-center {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-5);
}

.pile {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 5.5rem;
  gap: 0.35rem;
}

.pile-held {
  margin-left: var(--space-2);
}

.pile-vacant {
  visibility: hidden;
}

/* Labels may be wider than their pile; centred overflow keeps the piles at a fixed width. */
.pile-label {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 1.2em;
  color: var(--color-ink-muted);
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
}

@media (max-width: 40rem) {
  .pile {
    width: 4.5rem;
  }

  .table-center {
    gap: var(--space-3);
  }
}
</style>
