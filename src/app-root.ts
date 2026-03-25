import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { provide } from '@lit/context';
import { Route, currentRoute, onRouteChange } from 'router';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import styles from './app-root.css?inline';
import 'screens/auth/auth-screen';
import 'screens/chat-list-screen/chat-list-screen';
import 'screens/chat-view-screen/chat-view-screen';
import { TelegramApiClient } from 'api/telegram-api-client';
import { TelegramAuthStore } from './screens/auth/auth-store';
import { ChatListStore } from './screens/chat-list-screen/chat-list-store';

const API_ID = '30808228';
const API_HASH = '4e1cb190f78eea34a15a55b685e48b07';

@customElement('app-root')
export class AppRoot extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @state() private _route: Route = currentRoute();
  @provide({ context: servicesContext })
  private readonly _services: Services;
  private _unsubRoute?: () => void;

  constructor() {
    super();
    const config = { apiId: API_ID, apiHash: API_HASH };
    const client = new TelegramApiClient();
    this._services = {
      apiClient: client,
      authStore: new TelegramAuthStore(config, client),
      chatListStore: new ChatListStore(client),
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._services.authStore.init();
    this._route = currentRoute();
    this._unsubRoute = onRouteChange((route) => {
      this._route = route;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._services.authStore.dispose();
    this._unsubRoute?.();
  }

  private _renderRoute() {
    switch (this._route.name) {
      case 'chats':
        return html`<chat-list-screen></chat-list-screen>`;
      case 'chat': {
        return html`<chat-view-screen
          .chatId=${Number(this._route.params.id)}
        ></chat-view-screen>`;
      }
      default:
        return html`<div class="loading">Loading...</div>`;
    }
  }

  render() {
    const authState = this._services.authStore.state.get();

    if (authState === 'loading') {
      return html`<div class="loading">Loading...</div>`;
    }

    if (authState === 'error') {
      return 'Something went wrong';
    }

    if (authState !== 'ready') {
      return html`<auth-screen></auth-screen>`;
    }

    return this._renderRoute();
  }
}
