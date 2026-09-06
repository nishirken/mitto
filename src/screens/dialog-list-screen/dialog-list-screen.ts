import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { navigate } from 'router';
import 'mudita-ui';
import type { ScrollContainer } from 'mudita-ui';
import './dialog-item';
import styles from './dialog-list-screen.css?inline';
import { DialogListProjection } from './dialog-list-projection';
import { DialogListSyncService } from './dialog-list-sync-service';
import type { PeerId } from 'services/database';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { ViewportBackfill } from '../viewport-backfill';

const MAX_BACKFILL_ROUNDS = 10;

@customElement('dialog-list-screen')
export class DialogListScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);
  private _dialogListProjection!: DialogListProjection;
  private _dialogListSyncService!: DialogListSyncService;

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
  private readonly _scrollContainerRef: Ref<ScrollContainer> = createRef();
  private readonly _dialogsRef: Ref<HTMLDivElement> = createRef();
  private _dialogsRO?: ResizeObserver;
  private _scrollContainerClientHeight = 0; // constant height on the device
  private _backfill!: ViewportBackfill;

  connectedCallback() {
    super.connectedCallback();
    this._dialogListSyncService = new DialogListSyncService(
      this.services.client,
      this.services.dialogRepository,
      this.services.messageRepository,
    );
    this._dialogListProjection = new DialogListProjection(this.services.database);
    this._dialogListProjection.init();
    this._backfill = new ViewportBackfill(this._dialogListSyncService, MAX_BACKFILL_ROUNDS);
    this._backfill.track(this._dialogListSyncService.loadInitial().catch(() => {}));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._dialogsRO?.disconnect();
    this._backfill.dispose();
    this._dialogListSyncService.dispose();
    this._dialogListProjection.dispose();
  }

  protected firstUpdated(): void {
    const dialogs = this._dialogsRef.value;
    const scrollContainer = this._scrollContainerRef.value;

    if (dialogs) {
      this._dialogsRO = new ResizeObserver(this._handleDialogsResize);
      this._dialogsRO.observe(dialogs);
    }

    if (scrollContainer) {
      this._scrollContainerClientHeight = scrollContainer.clientHeight;
    }
  }

  /**
   * If there are some dialogs filtered there might be less dialogs than one screen.
   * Thus, load dialogs unless they fill the first screen.
   * Then, ScrollContainer onBottom can be triggered.
   */
  private _handleDialogsResize: ResizeObserverCallback = ([entry]) => {
    void this._backfill.run(this._isViewportCovered(entry.contentRect.height));
  };

  private _isViewportCovered(height: number): boolean {
    return height > this._scrollContainerClientHeight;
  }

  private _handleBottom = (): void => {
    void this._dialogListSyncService.loadMore().catch(() => {});
  };

  private _handleDialogClick = (peerId: PeerId) => {
    navigate(`dialog/${peerId}`);
  };

  private _handleSettingsClick = () => {
    navigate('settings');
  };

  render() {
    const dialogs = this._dialogListProjection.dialogs.get();

    return html`
      <mk-header headline="Mitto">
        <span class="count" slot="end">${dialogs.length} chats</span>
        <mk-icon-button
          bordered
          slot="end"
          icon="settings"
          label="Settings"
          data-testid="dialog-list.settings-button"
          @click=${this._handleSettingsClick}
        ></mk-icon-button>
      </mk-header>
      <scroll-container
        ${ref(this._scrollContainerRef)}
        class="list"
        ?paged=${this.services.settingsStore.pagedScroll('conversations')}
        .onBottom=${this._handleBottom}
      >
        <div ${ref(this._dialogsRef)} data-testid="dialog-list.items">
          ${dialogs.map(
            (dialog) => html`
              <dialog-item
                .name=${dialog.name}
                .timestamp=${dialog.date}
                .message=${dialog.topMessage?.text}
                .unreadCount=${dialog.unreadCount}
                @click="${() => this._handleDialogClick(dialog.id)}"
              ></dialog-item>
            `,
          )}
        </div>
      </scroll-container>
    `;
  }
}
