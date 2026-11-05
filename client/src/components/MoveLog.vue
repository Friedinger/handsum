<script setup lang="ts">
defineProps<{ descriptions: readonly string[] }>();
</script>

<template>
  <ul class="move-log">
    <li v-for="(description, index) in descriptions" :key="index">
      {{ description }}
    </li>
  </ul>
</template>

<style scoped>
.move-log {
  min-height: 3.9em;
  margin: 0;
  padding: 0;
  color: var(--color-ink-muted);
  font-size: 0.85rem;
  line-height: 1.3;
  list-style: none;
  text-align: center;
}
</style>
