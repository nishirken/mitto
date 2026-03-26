import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './mk-loading-text.css?inline';

@customElement('mk-loading-text')
export class MkLoadingText extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    return html`Loading…`;
  }
}
