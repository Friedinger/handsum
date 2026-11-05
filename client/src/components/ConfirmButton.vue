<script setup lang="ts">
import { useConfirmation } from "@/composables/useConfirmation";

const CONFIRMATION_MS = 3000;

const props = withDefaults(
  defineProps<{
    label: string;
    confirmLabel: string;
    needsConfirmation?: boolean;
  }>(),
  { needsConfirmation: true },
);
const emit = defineEmits<{ confirm: [] }>();

const confirmation = useConfirmation(CONFIRMATION_MS);

function onClick(): void {
  if (!props.needsConfirmation) {
    emit("confirm");
    return;
  }
  confirmation.request(() => {
    emit("confirm");
  });
}
</script>

<template>
  <button
    type="button"
    :class="{ 'button-confirming': confirmation.armed.value }"
    @click="onClick"
  >
    {{ confirmation.armed.value ? confirmLabel : label }}
  </button>
</template>
