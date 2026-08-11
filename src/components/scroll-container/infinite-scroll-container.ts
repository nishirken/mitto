import { html, LitElement, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import styles from './infinite-scroll-container.css?inline';

@customElement('infinite-scroll-container')
export class InfiniteScrollContainer extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Number }) threshold = 100;
  @property({ attribute: false }) onTop?: () => void;
  @property({ attribute: false }) onBottom?: () => void;

  @query('.root') private _root!: HTMLElement;

  private _wasAtTop = false;
  private _wasAtBottom = false;

  scrollToBottom(): void {
    if (!this._root) return;

    this._root.scrollTop = this._root.scrollHeight;
    this._wasAtBottom = true;
  }

  scrollToTop(): void {
    if (!this._root) return;

    this._root.scrollTop = 0;
    this._wasAtTop = true;
  }

  scrollToElement(el: Element): void {
    if (!this._root) return;

    this._root.scrollTop =
      el.getBoundingClientRect().top - this._root.getBoundingClientRect().top + this._root.scrollTop;

    const { scrollTop, scrollHeight, clientHeight } = this._root;
    this._wasAtTop = scrollTop <= this.threshold;
    this._wasAtBottom = scrollHeight - scrollTop - clientHeight <= this.threshold;
  }

  get scrollHeight(): number {
    return this._root?.scrollHeight ?? 0;
  }

  private _onScroll = (): void => {
    if (!this._root) return;

    const { scrollTop, scrollHeight, clientHeight } = this._root;
    const atTop = scrollTop <= this.threshold;
    const atBottom = scrollHeight - scrollTop - clientHeight <= this.threshold;

    if (atTop && !this._wasAtTop) this.onTop?.();
    if (atBottom && !this._wasAtBottom) this.onBottom?.();

    this._wasAtTop = atTop;
    this._wasAtBottom = atBottom;
  };

  protected render(): unknown {
    return html`<div class="root" @scroll="${this._onScroll}"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'infinite-scroll-container': InfiniteScrollContainer;
  }
}
