<script setup lang="ts">
import { computed } from "vue";

import { type LegalLinks, legalLinks } from "@/data/legalLinks";
import { strings } from "@/data/strings";

const props = withDefaults(defineProps<{ links?: LegalLinks }>(), {
  links: () => legalLinks,
});

const entries = computed(() => {
  const { imprintUrl, privacyUrl } = props.links;
  return [
    ...(imprintUrl ? [{ label: strings.legal.imprint, url: imprintUrl }] : []),
    ...(privacyUrl ? [{ label: strings.legal.privacy, url: privacyUrl }] : []),
  ];
});
</script>

<template>
  <footer v-if="entries.length > 0" class="legal-footer">
    <a v-for="entry in entries" :key="entry.label" :href="entry.url">{{
      entry.label
    }}</a>
  </footer>
</template>
