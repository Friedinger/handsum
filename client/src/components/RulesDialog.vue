<script setup lang="ts">
import { useTemplateRef } from "vue";

import { strings } from "@/data/strings";

const dialog = useTemplateRef("dialog");

function open(): void {
  dialog.value?.showModal();
}

function close(): void {
  dialog.value?.close();
}
</script>

<template>
  <button type="button" class="link-quiet" @click="open">
    {{ strings.rules.open }}
  </button>
  <dialog
    ref="dialog"
    class="rules-dialog surface"
    :aria-label="strings.rules.title"
    @click.self="close"
  >
    <header class="rules-header">
      <h2>{{ strings.rules.title }}</h2>
      <button type="button" class="button-secondary" @click="close">
        {{ strings.rules.close }}
      </button>
    </header>
    <section
      v-for="section in strings.rules.sections"
      :key="section.heading"
      class="rules-section"
    >
      <h3>{{ section.heading }}</h3>
      <p v-for="paragraph in section.paragraphs" :key="paragraph">
        {{ paragraph }}
      </p>
      <dl v-if="section.facts" class="rules-facts">
        <template v-for="fact in section.facts" :key="fact.values">
          <dt>{{ fact.values }}</dt>
          <dd>{{ fact.detail }}</dd>
        </template>
      </dl>
      <ul v-if="section.items">
        <li v-for="item in section.items" :key="item">{{ item }}</li>
      </ul>
    </section>
  </dialog>
</template>

<style scoped>
/* Long text reads best at roughly 70 characters per line, so the rules get more room than the forms. */
.rules-dialog {
  width: min(var(--reading-max-width), calc(100% - 2 * var(--space-4)));
  max-height: calc(100% - 2 * var(--space-4));
  padding-top: 0;
  font-size: 1rem;
  line-height: 1.45;
  scrollbar-color: var(--color-felt-light) transparent;
}

.rules-dialog::backdrop {
  background: var(--color-backdrop);
}

.rules-header {
  display: flex;
  position: sticky;
  top: 0;
  align-items: center;
  justify-content: space-between;
  padding-block: var(--space-4) var(--space-2);
  gap: var(--space-4);
  background: var(--color-panel);
}

.rules-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.rules-section > * {
  margin: 0;
}

.rules-section + .rules-section {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-panel-edge);
}

.rules-section ul {
  padding-left: 1.2rem;
}

.rules-section li + li {
  margin-top: var(--space-1);
}

.rules-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-4);
}

.rules-facts dt {
  font-weight: 600;
}

.rules-facts dd {
  margin: 0;
}
</style>
