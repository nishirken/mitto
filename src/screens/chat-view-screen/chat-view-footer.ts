import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'components/mk-icon-button/mk-icon-button';
import 'components/mk-textarea/mk-textarea';
import type { MkTextarea } from 'components/mk-textarea/mk-textarea';
import styles from './chat-view-footer.css?inline';

@customElement('chat-view-footer')
export class ChatViewFooter extends LitElement {
  static styles = unsafeCSS(styles);

  @property() value = '';

  private _onInput(e: Event) {
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
        <mk-textarea placeholder="Message…" .value=${this.value} @input=${this._onInput} data-testid="chat-view.message-input"></mk-textarea>
        <mk-icon-button bordered label="Send" type="submit" data-testid="chat-view.send-button">→</mk-icon-button>
      </form>
    `;
  }
}
