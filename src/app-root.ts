import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { provide } from '@lit/context';
import { type Route, currentRoute, onRouteChange } from 'router';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import styles from './app-root.css?inline';
import 'screens/auth/auth-screen';
import 'screens/dialog-list-screen/dialog-list-screen';
import 'screens/dialog-screen/dialog-screen';
import 'screens/settings-screen/settings-screen';
import 'mudita-ui/tokens.css';
import 'mudita-ui/eink.css';
import 'mudita-ui';
import telegram from 'telegram';
import { TelegramAuthStore } from './screens/auth/auth-store';
import { Database } from './services/database';
import { MessageRepository } from './services/repositories/message/message-repository';
import { DialogRepository } from './services/repositories/dialog/dialog-repository';
import { MediaRepository } from './services/repositories/media/media-repository';
import { MediaFileService } from './services/media/media-file-service';
import { SettingsStore } from './services/settings/settings-store';

const {
  TelegramClient,
  sessions: { StringSession },
} = telegram;

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

  async connectedCallback() {
    super.connectedCallback();
    this._route = currentRoute();
    this._unsubRoute = onRouteChange((route) => {
      this._route = route;
    });

    const database = await Database.create();
    const sessionString = await database.getSession();
    const session = new StringSession(sessionString ?? undefined);
    const config = { apiId: API_ID, apiHash: API_HASH };
    const useTestDC = import.meta.env.VITE_USE_TEST_DC === 'true';

    const client = new TelegramClient(session, API_ID, API_HASH, {
      testServers: useTestDC,
    }) as InstanceType<typeof TelegramClient> & { session: typeof session };
    const authStore = new TelegramAuthStore(config, client, database, sessionString);

    const mediaRepository = new MediaRepository(database);
    const settingsStore = new SettingsStore(database);

    this._services = {
      client,
      database,
      authStore,
      dialogRepository: new DialogRepository(database, mediaRepository),
      messageRepository: new MessageRepository(database, mediaRepository),
      mediaRepository,
      mediaFileService: new MediaFileService(client, database),
      settingsStore,
    };

    await client.connect();

    if (sessionString !== null) {
      void authStore.checkAuthorization();
    }

    void settingsStore.init();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubRoute?.();
  }

  private _renderRoute() {
    switch (this._route.name) {
      case 'dialogs':
        return html`<dialog-list-screen></dialog-list-screen>`;
      case 'dialog': {
        return html`<dialog-screen
          .peerId=${this._route.params.id}
        ></dialog-screen>`;
      }
      case 'settings':
        return html`<settings-screen></settings-screen>`;
      default:
        return html`<mk-loading></mk-loading>`;
    }
  }

  render() {
    if (!this._services) {
      return html`<mk-loading></mk-loading>`;
    }

    const authState = this._services.authStore.state.get();

    if (authState === 'loading') {
      return html`<mk-loading></mk-loading>`;
    }

    if (authState === 'error') {
      return 'Something went wrong';
    }

    if (authState === 'ready') {
      return this._renderRoute();
    }

    return html`<auth-screen></auth-screen>`;
  }
}
