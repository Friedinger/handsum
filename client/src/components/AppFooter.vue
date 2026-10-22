<script setup lang="ts">
import { computed } from "vue";

import RulesDialog from "@/components/RulesDialog.vue";
import { type BuildInfo, buildInfo } from "@/data/buildInfo";
import { type LegalLinks, legalLinks } from "@/data/legalLinks";
import { strings } from "@/data/strings";

const props = withDefaults(
  defineProps<{ links?: LegalLinks; build?: BuildInfo | null }>(),
  { links: () => legalLinks, build: null },
);
const shownBuild = computed(() => props.build ?? buildInfo);

const entries = computed(() => {
  const { imprintUrl, privacyUrl } = props.links;
  return [
    ...(imprintUrl ? [{ label: strings.legal.imprint, url: imprintUrl }] : []),
    ...(privacyUrl ? [{ label: strings.legal.privacy, url: privacyUrl }] : []),
  ];
});
</script>

<template>
  <footer class="app-footer">
    <RulesDialog />
    <a v-for="entry in entries" :key="entry.label" :href="entry.url">{{
      entry.label
    }}</a>
    <template v-if="shownBuild">
      <a
        v-if="shownBuild.commitUrl"
        :href="shownBuild.commitUrl"
        :title="strings.build.commitTitle"
        >{{ shownBuild.shortHash }}</a
      >
      <span v-else class="commit-hash">{{ shownBuild.shortHash }}</span>
    </template>
  </footer>
</template>

<style scoped>
/* Padded links are easier to tap and keep the footer height stable. */
.app-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: auto;
  gap: var(--space-2);
  font-size: 0.85rem;
}

.app-footer a,
.commit-hash {
  border: none;
  background: none;
  color: var(--color-ink-muted);
  font: inherit;
}

.app-footer a {
  padding: var(--space-2);
  text-decoration: underline;
}

.commit-hash {
  padding-block: var(--space-2);
}
</style>
