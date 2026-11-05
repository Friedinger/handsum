<script setup lang="ts">
import ConfirmButton from "@/components/ConfirmButton.vue";
import PlayerSeat from "@/components/PlayerSeat.vue";
import { strings } from "@/data/strings";
import type { SeatView } from "@/utils/tableView";

defineProps<{
  seat: SeatView | null;
  message: string;
  showMessage: boolean;
  messageActive: boolean;
  messageIsError: boolean;
  canCallEnd: boolean;
  callEndHighlighted: boolean;
}>();
const emit = defineEmits<{ select: [slotIndex: number]; callEnd: [] }>();
</script>

<template>
  <div class="table-hand">
    <!-- One line for errors, reminders and hints, so the hand below never moves when the text changes. -->
    <p
      v-if="showMessage"
      class="hint"
      :class="{ 'hint-active': messageActive, 'hint-error': messageIsError }"
    >
      {{ message }}
    </p>
    <PlayerSeat
      v-if="seat"
      :name="seat.name"
      :badges="seat.badges"
      :slots="seat.slots"
      :active="seat.active"
      size="large"
      @select="(slotIndex) => emit('select', slotIndex)"
    />
    <div class="hand-actions">
      <ConfirmButton
        v-if="canCallEnd"
        class="button-call"
        :class="{ 'button-next': callEndHighlighted }"
        :label="strings.table.callEnd"
        :confirm-label="strings.table.confirmCallEnd"
        @confirm="emit('callEnd')"
      />
    </div>
  </div>
</template>

<style scoped>
.table-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 40rem;
  min-height: 2.6em;
  margin: 0;
  padding: var(--space-1) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  line-height: 1.3;
  text-align: center;
}

.hint-active {
  border-color: var(--color-accent-border);
  background: var(--color-accent-tint);
  color: var(--color-ink);
  font-weight: 600;
}

.hint-error {
  color: var(--color-error);
  font-weight: 600;
}

.hand-actions {
  display: flex;
  align-items: center;
  min-height: var(--control-height);
  gap: var(--space-3);
}

@media (max-width: 40rem) {
  .hint {
    font-size: 0.9rem;
  }
}
</style>
