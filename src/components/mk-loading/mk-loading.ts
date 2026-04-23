import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import 'components/mk-loading-text/mk-loading-text';
import styles from './mk-loading.css?inline';

@customElement('mk-loading')
export class MkLoading extends LitElement {
  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Loading');
  }

  render() {
    return html`<mk-loading-text></mk-loading-text>`;
  }
}
