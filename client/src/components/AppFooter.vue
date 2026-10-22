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
