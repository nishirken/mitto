import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import 'mudita-ui';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { formatFileSize } from 'utils/format-file-size';
import type { MessageMedia } from '../../chat-view-projection';
import styles from './media-attachment.css?inline';

export type MediaOpenDetail = { url: string; type: 'photo' | 'video' };

type State = 'idle' | 'loading' | 'ready' | 'error';

@customElement('media-attachment')
export class MediaAttachment extends LitElement {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;

  @property({ attribute: false }) media!: MessageMedia & { type: 'photo' | 'video' };
  @state() private _state: State = 'idle';
  @state() private _url = '';

  private async _onDownload() {
    if (this._state === 'loading') return;

    this._state = 'loading';
    const url = await this.services.mediaFileService.url(this.media.id);

    if (!url) {
      this._state = 'error';

      return;
    }

    this._url = url;
    this._state = 'ready';

    if (this.media.type === 'video') this._open();
  }

  private _open() {
    this.dispatchEvent(
      new CustomEvent<MediaOpenDetail>('mediaopen', {
        detail: { url: this._url, type: this.media.type },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onLoad() {
    this.dispatchEvent(new Event('mediaload', { bubbles: true, composed: true }));
  }

  private _renderPlaceholder() {
    const label = this._state === 'error' ? 'Unavailable' : formatFileSize(this.media.size);

    return html`
      <button
        type="button"
        class="chip"
        data-testid="media.download"
        ?disabled=${this._state === 'error'}
        @click=${this._onDownload}
      >
        <mk-icon type=${this.media.type === 'video' ? 'play' : 'image'}></mk-icon>
        <span class="label">${this._state === 'loading' ? 'Loading…' : label}</span>
      </button>
    `;
  }

  render() {
    if (this.media.type === 'photo' && this._state === 'ready') {
      const { width, height } = this.media;

      return html`
        <button type="button" class="photo" data-testid="media.photo" @click=${this._open}>
          <img
            src=${this._url}
            alt="Photo"
            width=${width ?? nothing}
            height=${height ?? nothing}
            @load=${this._onLoad}
          />
        </button>
      `;
    }

    return this._renderPlaceholder();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-attachment': MediaAttachment;
  }

  interface HTMLElementEventMap {
    mediaopen: CustomEvent<MediaOpenDetail>;
    mediaload: Event;
  }
}
