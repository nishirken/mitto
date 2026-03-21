import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Route, currentRoute, onRouteChange, navigate } from 'router';
import { mockMessages } from 'mock-data';
import { TelegramClient } from 'api/telegram-client';
import type { ApiClient } from 'api/api-client';
import type { AuthState } from 'types/telegram';
import 'screens/auth-screen/auth-screen';
import 'screens/chat-list-screen/chat-list-screen';
import 'screens/chat-view-screen/chat-view-screen';

const API_ID = '30808228';
const API_HASH = '4e1cb190f78eea34a15a55b685e48b07';

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
  private _client: ApiClient;
  private _unsubscribe?: () => void;

  constructor() {
    super();
    const useTestDc = new URLSearchParams(window.location.search).has('test_dc');
    this._client = new TelegramClient({ apiId: API_ID, apiHash: API_HASH, useTestDc });
  }

  connectedCallback() {
    super.connectedCallback();

    this._client.onAuthStateChange((authState) => {
      this._authState = authState;
      if (authState === 'ready') {
        navigate('chats');
      } else if (authState === 'wait_phone' || authState === 'wait_code' || authState === 'wait_password') {
        navigate('auth');
      }
    });

    this._client.init();

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
      return html`<auth-screen .client=${this._client} .authState=${this._authState}></auth-screen>`;
    }

    switch (this._route.name) {
      case 'chats':
        return html`<chat-list-screen .client=${this._client}></chat-list-screen>`;
      case 'chat': {
        const chatId = this._route.params.id;
        const chat = this._client.getChat(chatId);
        const messages = mockMessages.filter((m) => m.chatId === Number(chatId));

        return html`<chat-view-screen
          .contactName=${chat?.name ?? 'Unknown'}
          .messages=${messages}
        ></chat-view-screen>`;
      }
      default:
        return html`<auth-screen .client=${this._client} .authState=${this._authState}></auth-screen>`;
    }
  }

  render() {
    return this._renderRoute();
  }
}
