import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-header.css?inline';

@customElement('mk-header')
export class MkHeader extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) headline = '';

  render() {
    return html`
      <header>
        <slot name="start"></slot>
        <h1 class="title">${this.headline}<slot></slot></h1>
        <slot name="end"></slot>
      </header>
    `;
  }
}
