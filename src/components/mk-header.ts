import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-header.css?inline';

@customElement('mk-header')
export class MkHeader extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) headline = '';

  render() {
    return html`
      <slot name="start"></slot>
      <span class="title">${this.headline}<slot></slot></span>
      <slot name="end"></slot>
    `;
  }
}
