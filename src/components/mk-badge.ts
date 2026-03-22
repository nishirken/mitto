import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-badge.css?inline';

@customElement('mk-badge')
export class MkBadge extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Number }) count = 0;

  render() {
    if (this.count <= 0) return nothing;

    return html`${this.count}`;
  }
}
