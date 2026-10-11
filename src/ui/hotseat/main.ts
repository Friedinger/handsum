import { mountHotseat } from "./mountHotseat";

const APP_ROOT_ID = "app";

const root = document.getElementById(APP_ROOT_ID);
if (!root) {
  throw new Error(`Missing #${APP_ROOT_ID} element`);
}

mountHotseat(root);
