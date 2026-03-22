import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-button.css?inline';

@customElement('mk-button')
export class MkButton extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String, reflect: true }) variant: 'primary' | 'text' = 'primary';
  @property({ type: Boolean, reflect: true }) disabled = false;

  render() {
    return html`
      <button type="button" ?disabled=${this.disabled}>
        <slot></slot>
      </button>
    `;
  }
}
