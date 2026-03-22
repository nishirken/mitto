import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-input.css?inline';

@customElement('mk-input')
export class MkInput extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) label = '';
  @property({ type: String }) hint = '';
  @property({ type: String }) type = 'text';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _onInput(e: InputEvent) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <input
        type=${this.type}
        placeholder=${this.placeholder}
        .value=${this.value}
        ?disabled=${this.disabled}
        @input=${this._onInput}
      >
      ${this.hint ? html`<span class="hint">${this.hint}</span>` : nothing}
    `;
  }
}
