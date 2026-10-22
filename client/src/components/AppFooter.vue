<script setup lang="ts">
import { computed } from "vue";

import RulesDialog from "@/components/RulesDialog.vue";
import { type BuildInfo, buildInfo } from "@/data/buildInfo";
import { type LegalLinks, legalLinks } from "@/data/legalLinks";
import {
  activeLanguage,
  type Language,
  LANGUAGES,
  strings,
} from "@/data/strings";
import { saveLanguage } from "@/net/identity";

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

/* Named in its own language, so it can be found without reading the current one. */
const otherLanguages = LANGUAGES.filter(
  (language) => language !== activeLanguage,
);

function switchLanguage(language: Language): void {
  saveLanguage(language);
  location.reload();
}
</script>

<template>
  <footer class="app-footer">
    <RulesDialog />
    <a
      v-for="entry in entries"
      :key="entry.label"
      class="link-quiet"
      :href="entry.url"
      >{{ entry.label }}</a
    >
    <button
      v-for="language in otherLanguages"
      :key="language"
      type="button"
      class="link-quiet"
      :lang="language"
      :title="strings.language.label"
      @click="switchLanguage(language)"
    >
      {{ strings.language.names[language] }}
    </button>
    <template v-if="shownBuild">
      <a
        v-if="shownBuild.commitUrl"
        class="link-quiet"
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

.commit-hash {
  padding-block: var(--space-2);
  color: var(--color-ink-muted);
  font: inherit;
}
</style>
