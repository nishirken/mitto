import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-input.css?inline';

let nextInputId = 0;

@customElement('mk-input')
export class MkInput extends LitElement {
  static formAssociated = true;
  static styles = unsafeCSS(styles);

  private readonly _inputId = `mk-input-${nextInputId++}`;
  private readonly _internals: ElementInternals;

  @property({ type: String }) label = '';
  @property({ type: String }) hint = '';
  @property({ type: String }) type = 'text';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean }) required = false;
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;

  @property({ type: String })
  get value() { return this._value; }
  set value(v: string) {
    this._value = v;
    this._internals.setFormValue(v);
    this._syncValidity();
  }
  private _value = '';

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  private _syncValidity() {
    const input = this.shadowRoot?.querySelector('input');
    if (!input) return;
    if (input.validity.valid) {
      this._internals.setValidity({});
    } else {
      this._internals.setValidity(input.validity, input.validationMessage, input);
    }
  }

  private _onInput(e: InputEvent) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this._internals.form?.requestSubmit();
  }

  render() {
    return html`
      ${this.label ? html`<label for=${this._inputId}>${this.label}</label>` : nothing}
      <input
        id=${this._inputId}
        type=${this.type}
        placeholder=${this.placeholder}
        .value=${this._value}
        ?disabled=${this.disabled}
        ?required=${this.required}
        minlength=${this.minlength ?? nothing}
        maxlength=${this.maxlength ?? nothing}
        @input=${this._onInput}
        @keydown=${this._onKeydown}
      >
      ${this.hint ? html`<span class="hint">${this.hint}</span>` : nothing}
    `;
  }
}
