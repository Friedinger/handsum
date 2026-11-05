<script setup lang="ts">
defineProps<{ text: string; visible: boolean }>();
</script>

<template>
  <p class="banner" :class="{ 'banner-hidden': !visible }">{{ text }}</p>
</template>

<style scoped>
.banner {
  min-height: 2.2em;
  margin: 0;
  padding: 0.4rem var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--color-surface-dim);
  color: var(--color-accent);
  font-weight: 600;
}

/* Keeps its place in the layout, so the table does not jump when the last round starts. */
.banner-hidden {
  visibility: hidden;
}
</style>
