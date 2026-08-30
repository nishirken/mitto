import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'mudita-ui';
import type { MkTextarea } from 'mudita-ui';
import styles from './dialog-footer.css?inline';

@customElement('dialog-footer')
export class DialogFooter extends LitElement {
  static styles = unsafeCSS(styles);

  @property() value = '';

  private _handleInput(e: Event) {
    this.value = (e.target as MkTextarea).value;
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }

  private _handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const text = this.value.trim();
    if (!text) return;
    this.dispatchEvent(new CustomEvent('send', { detail: text }));
    this.value = '';
  }

  render() {
    return html`
      <form @submit=${this._handleSubmit}>
        <mk-textarea label="Message" placeholder="Message…" .value=${this.value} @input=${this._handleInput} data-testid="dialog.message-input"></mk-textarea>
        <mk-icon-button
          bordered
          icon="arrow-up"
          label="Send"
          type="submit"
          data-testid="dialog.send-button"
        ></mk-icon-button>
      </form>
    `;
  }
}
