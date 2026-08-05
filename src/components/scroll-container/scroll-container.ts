import { html, LitElement, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import './paged-scroll-container';
import './infinite-scroll-container';
import type { PageChangeDetail, PagedScrollContainer } from './paged-scroll-container';
import type { InfiniteScrollContainer } from './infinite-scroll-container';
import styles from './scroll-container.css?inline';

@customElement('scroll-container')
export class ScrollContainer extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true }) paged = false;
  @property({ type: Number }) threshold = 50;
  @property({ attribute: false }) onTop?: () => void;
  @property({ attribute: false }) onBottom?: () => void;

  @query('paged-scroll-container') private _paged?: PagedScrollContainer | null;
  @query('infinite-scroll-container') private _infinite?: InfiniteScrollContainer | null;

  get pageCount(): number {
    return this._paged?.pageCount ?? 1;
  }

  scrollToPage(index: number): void {
    this._paged?.scrollToPage(index);
  }

  scrollToBottom(): void {
    if (this._paged) {
      this._paged.scrollToLastPage();

      return;
    }

    this._infinite?.scrollToBottom();
  }

  scrollToTop(): void {
    if (this._paged) {
      this._paged.scrollToPage(0);

      return;
    }

    this._infinite?.scrollToTop();
  }

  refresh(): void {
    this._paged?.refresh();
  }

  private _onPageChange = (e: CustomEvent<PageChangeDetail>): void => {
    if (e.detail.isFirst) this.onTop?.();
    if (e.detail.isLast) this.onBottom?.();
  };

  protected render(): unknown {
    if (this.paged) {
      return html`<paged-scroll-container @pagechange="${this._onPageChange}">
        <slot></slot>
      </paged-scroll-container>`;
    }

    return html`<infinite-scroll-container
      .threshold="${this.threshold}"
      .onTop="${this.onTop}"
      .onBottom="${this.onBottom}"
    >
      <slot></slot>
    </infinite-scroll-container>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'scroll-container': ScrollContainer;
  }
}
