import { strings } from "../data/strings";

export function mountApp(root: HTMLElement): void {
  document.title = strings.appTitle;
  root.replaceChildren();
}
