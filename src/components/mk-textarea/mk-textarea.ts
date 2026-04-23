import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-textarea.css?inline';

@customElement('mk-textarea')
export class MkTextarea extends LitElement {
  static formAssociated = true;
  static styles = unsafeCSS(styles);

  private readonly _internals: ElementInternals;

  @property({ type: String }) label = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Number }) rows = 1;

  @property({ type: String })
  get value() { return this._value; }
  set value(v: string) {
    this._value = v;
    this._internals.setFormValue(v);
  }
  private _value = '';

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  private _onInput(e: InputEvent) {
    this.value = (e.target as HTMLTextAreaElement).value;
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._internals.form?.requestSubmit();
    }
  }

  render() {
    return html`
      <textarea
        aria-label=${this.label}
        placeholder=${this.placeholder}
        .value=${this._value}
        ?disabled=${this.disabled}
        rows=${this.rows}
        @input=${this._onInput}
        @keydown=${this._onKeydown}
      ></textarea>
    `;
  }
}
