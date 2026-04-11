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
import 'components/mk-loading/mk-loading';
import telegram from 'telegram';
import { TelegramAuthStore } from './screens/auth/auth-store';
import { ChatListStore } from './screens/chat-list-screen/chat-list-store';

const { TelegramClient, sessions: { StringSession } } = telegram;

const API_ID = 30808228;
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
    const session = new StringSession(localStorage.getItem('session') ?? '');
    const client = new TelegramClient(session, API_ID, API_HASH, {
      connectionRetries: 5,
      testServers: import.meta.env.VITE_USE_TEST_DC === 'true',
    });
    const config = { apiId: API_ID, apiHash: API_HASH };
    this._services = {
      client,
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
        return html`<mk-loading></mk-loading>`;
    }
  }

  render() {
    const authState = this._services.authStore.state.get();

    if (authState === 'loading') {
      return html`<mk-loading></mk-loading>`;
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
