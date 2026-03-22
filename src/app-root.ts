import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { Route, currentRoute, onRouteChange, navigate } from 'router';
import { TelegramClient } from 'api/telegram-client';
import { TelegramAuthClient } from 'api/auth/telegram-auth-client';
import { TelegramChatsClient } from 'api/chats/telegram-chats-client';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { AuthState } from 'types/telegram';
import styles from './app-root.css?inline';
import 'screens/auth-screen/auth-screen';
import 'screens/chat-list-screen/chat-list-screen';
import 'screens/chat-view-screen/chat-view-screen';

const API_ID = '30808228';
const API_HASH = '4e1cb190f78eea34a15a55b685e48b07';

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = unsafeCSS(styles);

  @state() private _route: Route = currentRoute();
  @state() private _authState: AuthState = 'loading';
  @provide({ context: servicesContext })
  private _services: Services;
  private _unsubRoute?: () => void;

  constructor() {
    super();
    const useTestDc = new URLSearchParams(window.location.search).has('test_dc');
    const client = new TelegramClient({ apiId: API_ID, apiHash: API_HASH, useTestDc });
    this._services = {
      apiClient: client,
      authClient: new TelegramAuthClient(client),
      chatsClient: new TelegramChatsClient(client),
    };
  }

  connectedCallback() {
    super.connectedCallback();

    this._services.apiClient.addEventListener('updateAuthorizationState', (update) => {
      const authState = update.authorization_state as Record<string, unknown>;
      const type = authState['@type'] as string;
      switch (type) {
        case 'authorizationStateWaitPhoneNumber':
          this._authState = 'wait_phone';
          navigate('auth');
          break;
        case 'authorizationStateWaitCode':
          this._authState = 'wait_code';
          navigate('auth');
          break;
        case 'authorizationStateWaitPassword':
          this._authState = 'wait_password';
          navigate('auth');
          break;
        case 'authorizationStateReady':
          this._authState = 'ready';
          navigate('chats');
          break;
      }
    });

    this._services.apiClient.init();

    this._route = currentRoute();
    this._unsubRoute = onRouteChange((route) => {
      this._route = route;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubRoute?.();
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
        return html`<chat-list-screen></chat-list-screen>`;
      case 'chat': {
        const chatId = this._route.params.id;

        return html`<chat-view-screen
          .contactName=${'Chat'}
          .chatId=${Number(chatId)}
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
