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
  <button type="button" class="button-quiet rules-open" @click="open">
    {{ strings.rules.open }}
  </button>
  <dialog
    ref="dialog"
    class="rules-dialog"
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
      <ul v-if="section.items">
        <li v-for="item in section.items" :key="item">{{ item }}</li>
      </ul>
    </section>
  </dialog>
</template>
