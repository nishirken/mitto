import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-icon-button.css?inline';

@customElement('mk-icon-button')
export class MkIconButton extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) label = '';

  render() {
    return html`
      <button aria-label=${this.label}>
        <slot></slot>
      </button>
    `;
  }
}
