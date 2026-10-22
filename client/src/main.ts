import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/controls.css";
import "@/styles/cards.css";

import { createApp } from "vue";

import { selectLanguage } from "@/data/strings";
import { loadSavedLanguage } from "@/net/identity";
import { pickLanguage } from "@/utils/pickLanguage";

const language = pickLanguage(navigator.languages, loadSavedLanguage());
selectLanguage(language);
document.documentElement.lang = language;

// Imported only now: modules that read the strings while loading must see the chosen language.
const { default: App } = await import("@/App.vue");

createApp(App).mount("#app");
