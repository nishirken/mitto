import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Route, currentRoute, onRouteChange, navigate } from './router';
import { mockChats, mockMessages } from './mock-data';
import { telegramClient } from './telegram-client';
import type { AuthState } from './types/telegram';
import './components/auth-screen';
import './components/chat-list-screen';
import './components/chat-view-screen';

const API_ID = 94575;
const API_HASH = 'a3406de8d171bb422bb6ddf3bbd800e2';

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 320px;
      height: 100vh;
      margin: 0 auto;
      border: 2px solid #000;
      border-radius: 4px;
      font-family: 'Noto Sans', sans-serif;
      overflow: hidden;
      background: #fff;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 12px;
      color: #555;
    }
  `;

  @state() private _route: Route = currentRoute();
  @state() private _authState: AuthState = 'loading';
  private _unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();

    telegramClient.onAuthStateChange((authState) => {
      this._authState = authState;
      if (authState === 'ready') {
        navigate('chats');
      } else if (authState === 'wait_phone' || authState === 'wait_code' || authState === 'wait_password') {
        navigate('auth');
      }
    });

    telegramClient.init(API_ID, API_HASH);

    this._route = currentRoute();
    this._unsubscribe = onRouteChange((route) => {
      this._route = route;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.();
  }

  private _renderRoute() {
    if (this._authState === 'loading') {
      return html`<div class="loading">Loading...</div>`;
    }

    if (this._authState !== 'ready') {
      return html`<auth-screen .authState=${this._authState}></auth-screen>`;
    }

    switch (this._route.name) {
      case 'chats':
        return html`<chat-list-screen .chats=${mockChats}></chat-list-screen>`;
      case 'chat': {
        const chatId = Number(this._route.params.id);
        const chat = mockChats.find((c) => c.id === chatId);
        const messages = mockMessages.filter((m) => m.chatId === chatId);
        return html`<chat-view-screen
          .contactName=${chat?.name ?? 'Unknown'}
          .messages=${messages}
        ></chat-view-screen>`;
      }
      default:
        return html`<auth-screen .authState=${this._authState}></auth-screen>`;
    }
  }

  render() {
    return this._renderRoute();
  }
}
