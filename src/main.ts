import { mountApp } from "./ui/mountApp";

const APP_ROOT_ID = "app";

const root = document.getElementById(APP_ROOT_ID);
if (!root) {
  throw new Error(`Missing #${APP_ROOT_ID} element`);
}

mountApp(root);
