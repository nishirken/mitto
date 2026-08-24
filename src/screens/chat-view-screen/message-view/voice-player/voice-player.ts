import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import 'mudita-ui';
import type { MessageMedia } from '../../chat-view-projection';
import styles from './voice-player.css?inline';

@customElement('voice-player')
export class VoicePlayer extends LitElement {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;

  @property({ attribute: false }) media!: MessageMedia & { type: 'voice' };
  @state() private _playing = false;
  private _audio?: HTMLAudioElement;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._audio?.pause();
  }

  private async _onToggle() {
    if (this._playing) {
      this._audio?.pause();
      this._playing = false;

      return;
    }

    const audio = this._audio ?? (await this._create());
    if (!audio) return;

    this._playing = true;
    await audio.play();
  }

  private async _create(): Promise<HTMLAudioElement | undefined> {
    const url = await this.services.mediaFileService.url(this.media.id);
    if (!url) return undefined;

    const audio = new Audio(url);
    audio.addEventListener('ended', () => {
      this._playing = false;
    });
    this._audio = audio;

    return audio;
  }

  render() {
    return html`
      <mk-icon-button
        data-testid="voice.toggle"
        icon=${this._playing ? 'pause' : 'play'}
        label=${this._playing ? 'Pause' : 'Play'}
        @click=${this._onToggle}
      ></mk-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'voice-player': VoicePlayer;
  }
}
