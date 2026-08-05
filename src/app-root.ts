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
import 'screens/settings-screen/settings-screen';
import 'components/mk-loading/mk-loading';
import telegram from 'telegram';
import { TelegramAuthStore } from './screens/auth/auth-store';
import { Database } from './services/database';
import { MessageRepository } from './services/repositories/message/message-repository';
import { DatabaseHub } from './services/database/database-hub';
import { DialogRepository } from './services/repositories/dialog/dialog-repository';
import { MediaRepository } from './services/repositories/media/media-repository';
import { MediaFileService } from './services/media/media-file-service';
import { SettingsStore } from './services/settings/settings-store';

const { TelegramClient, sessions: { StringSession } } = telegram;

const API_ID = 30808228;
const API_HASH = '4e1cb190f78eea34a15a55b685e48b07';

@customElement('app-root')
export class AppRoot extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @state() private _route: Route = currentRoute();
  @provide({ context: servicesContext })
  @state()
  private _services?: Services;
  private _unsubRoute?: () => void;
  private _hasSession = false;

  async connectedCallback() {
    super.connectedCallback();
    this._route = currentRoute();
    this._unsubRoute = onRouteChange((route) => {
      this._route = route;
    });

    const storage = await Database.create();
    const hub = new DatabaseHub();

    const sessionString = (await storage.getSession()) ?? '';
    this._hasSession = sessionString !== '';
    const session = new StringSession(sessionString);
    const useTestDC = import.meta.env.VITE_USE_TEST_DC === 'true';
    const client = new TelegramClient(session, API_ID, API_HASH, {
      testServers: useTestDC,
    });
    await client.connect();
    const config = { apiId: API_ID, apiHash: API_HASH };


    const mediaRepository = new MediaRepository(storage);
    const settingsStore = new SettingsStore(storage);
    await settingsStore.init();

    this._services = {
      client,
      database: storage,
      databaseHub: hub,
      authStore: new TelegramAuthStore(config, client, storage),
      dialogRepository: new DialogRepository(storage, hub, mediaRepository),
      messageRepository: new MessageRepository(storage, hub, mediaRepository),
      mediaRepository,
      mediaFileService: new MediaFileService(client, storage),
      settingsStore,
    };

    this._services.authStore.init();
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
          .chatId=${this._route.params.id}
        ></chat-view-screen>`;
      }
      case 'settings':
        return html`<settings-screen></settings-screen>`;
      default:
        return html`<mk-loading></mk-loading>`;
    }
  }

  render() {
    if (!this._services) {
      return html``;
    }

    const authState = this._services.authStore.state.get();

    if (authState === 'error') {
      return 'Something went wrong';
    }

    if (authState === 'ready') {
      return this._renderRoute();
    }

    if (authState === 'loading') {
      return this._hasSession ? html`` : html`<mk-loading></mk-loading>`;
    }

    return html`<auth-screen></auth-screen>`;
  }
}
