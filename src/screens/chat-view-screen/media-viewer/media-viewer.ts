import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'mudita-ui';
import styles from './media-viewer.css?inline';

@customElement('media-viewer')
export class MediaViewer extends LitElement {
  static styles = unsafeCSS(styles);

  @property() url = '';
  @property() type: 'photo' | 'video' = 'photo';

  private _onClose() {
    this.dispatchEvent(new Event('close'));
  }

  render() {
    return html`
      <div class="bar">
        <mk-icon-button
          bordered
          icon="close"
          label="Close"
          data-testid="media-viewer.close"
          @click=${this._onClose}
        ></mk-icon-button>
      </div>
      ${
        this.type === 'photo'
          ? html`<img src=${this.url} alt="Photo" data-testid="media-viewer.photo" />`
          : html`<video src=${this.url} data-testid="media-viewer.video" controls autoplay></video>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-viewer': MediaViewer;
  }
}
