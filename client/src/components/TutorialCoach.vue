<script setup lang="ts">
defineProps<{
  title: string;
  text: string;
  notice: string | null;
}>();
</script>

<template>
  <div class="tutorial-coach">
    <span class="coach-title">{{ title }}</span>
    <p>{{ text }}</p>
    <p v-if="notice" class="error">{{ notice }}</p>
  </div>
</template>

<style scoped>
.tutorial-coach {
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-3);
  gap: 0.15rem;
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius);
  background: var(--color-surface-dim);
  font-size: 0.9rem;
  line-height: 1.3;
}

.tutorial-coach p {
  margin: 0;
}

.coach-title {
  color: var(--color-accent);
  font-weight: 700;
}
</style>
