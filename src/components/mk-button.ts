import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-button.css?inline';

@customElement('mk-button')
export class MkButton extends LitElement {
  static formAssociated = true;
  static styles = unsafeCSS(styles);

  private readonly _internals: ElementInternals;

  @property({ type: String, reflect: true }) variant: 'primary' | 'secondary' | 'text' = 'primary';
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: Boolean, reflect: true }) disabled = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  private _onClick() {
    if (this.type === 'submit') {
      this._internals.form?.requestSubmit();
    } else if (this.type === 'reset') {
      this._internals.form?.reset();
    }
  }

  render() {
    return html`
      <button type="button" ?disabled=${this.disabled} @click=${this._onClick}>
        <slot></slot>
      </button>
    `;
  }
}
