import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-checkbox.css?inline';

let nextCheckboxId = 0;

@customElement('mk-checkbox')
export class MkCheckbox extends LitElement {
  static formAssociated = true;
  static styles = unsafeCSS(styles);

  private readonly _checkboxId = `mk-checkbox-${nextCheckboxId++}`;
  private readonly _internals: ElementInternals;

  @property({ type: String }) label = '';
  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: Boolean, reflect: true })
  get checked() { return this._checked; }
  set checked(v: boolean) {
    this._checked = v;
    this._internals.setFormValue(v ? 'on' : null);
  }
  private _checked = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  private _onChange(e: Event) {
    this.checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <label for=${this._checkboxId}>${this.label}</label>
      <input
        id=${this._checkboxId}
        type="checkbox"
        .checked=${this._checked}
        ?disabled=${this.disabled}
        @change=${this._onChange}
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mk-checkbox': MkCheckbox;
  }
}
