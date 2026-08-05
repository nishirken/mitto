import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'components/mk-icon/mk-icon';
import type { IconType } from 'components/mk-icon/mk-icon';
import styles from './mk-icon-button.css?inline';

@customElement('mk-icon-button')
export class MkIconButton extends LitElement {
  static formAssociated = true;
  static styles = unsafeCSS(styles);

  private readonly _internals: ElementInternals;

  @property({ type: String }) label = '';
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: String }) icon?: IconType;
  @property({ type: Boolean, reflect: true }) bordered = false;

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
      <button type="button" aria-label=${this.label} @click=${this._onClick}>
        ${this.icon ? html`<mk-icon .type=${this.icon}></mk-icon>` : nothing}
      </button>
    `;
  }
}
