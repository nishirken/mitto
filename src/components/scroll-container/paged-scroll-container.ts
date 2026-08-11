import { html, LitElement, unsafeCSS } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import styles from './paged-scroll-container.css?inline';

export interface PageChangeDetail {
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

@customElement('paged-scroll-container')
export class PagedScrollContainer extends LitElement {
  static styles = unsafeCSS(styles);

  @query('.root') private _root!: HTMLElement;
  @query('.markers') private _markers!: HTMLElement;

  private _index = 0;
  private _rafId = 0;
  private _ro?: ResizeObserver;
  private _mo?: MutationObserver;

  private _startY: null | number = null;
  private _isScrolling = false;

  protected firstUpdated(): void {
    this._ro = new ResizeObserver(() => this._rebuildMarkers());
    this._ro.observe(this._root);
    this._mo = new MutationObserver(() => this._rebuildMarkers());
    this._mo.observe(this, { childList: true, subtree: true, characterData: true });
    this._rebuildMarkers();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._mo?.disconnect();
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  get pageCount(): number {
    const ph = this._root.clientHeight;
    if (ph === 0) return 1;

    return Math.max(1, Math.ceil(this._root.scrollHeight / ph));
  }

  scrollToLastPage(): void {
    this._index = this.pageCount - 1;
    this._scrollToCurrentPage();
  }

  refresh(): void {
    this._rebuildMarkers();
  }

  scrollToPage(index: number): void {
    this._index = Math.max(0, Math.min(index, this.pageCount - 1));
    this._scrollToCurrentPage();
  }

  scrollToElement(el: Element): void {
    const clientHeight = this._root?.clientHeight ?? 0;
    if (clientHeight === 0) return;

    this.scrollToPage(Math.floor(this._offsetTop(el) / clientHeight));
  }

  private _offsetTop(el: Element): number {
    return el.getBoundingClientRect().top - this._root.getBoundingClientRect().top + this._root.scrollTop;
  }

  private _onSlotChange = (): void => {
    this._rebuildMarkers();
  };

  private _rebuildMarkers(): void {
    if (!this._root || !this._markers) return;

    const clientHeight = this._root.clientHeight;
    if (clientHeight === 0) return;
    const count = this.pageCount;
    this._markers.replaceChildren();

    for (let i = 0; i < count; i++) {
      const m = document.createElement('div');
      m.className = 'marker';
      m.style.top = `${i * clientHeight}px`;
      this._markers.appendChild(m);
    }

    this._index = Math.max(0, Math.min(this._index, count - 1));
  }

  private _onPointerDown(e: PointerEvent): void {
    this._startY = e.clientY;
  }

  private _onPointerMove(e: PointerEvent): void {
    if (this._startY === null) return;

    if (Math.abs(e.clientY - this._startY) > 50) {
      this._isScrolling = true;
    }
  }

  private _onPointerUp = (e: PointerEvent): void => {
    if (this._startY === null) return;

    const diffY = e.clientY - this._startY;

    if (diffY > 50 && this._index > 0) {
      this._index--;
      this._scrollToCurrentPage();
    } else if (diffY < -50 && this._index < this.pageCount - 1) {
      this._index++;
      this._scrollToCurrentPage();
    }

    if (this._isScrolling) {
      this._startY = null;
      this._isScrolling = false;
    }
  };

  private _scrollToCurrentPage = (): void => {
      this._root.scrollTop = this._index * this._root.clientHeight;

      this.dispatchEvent(new CustomEvent<PageChangeDetail>('pagechange', { detail: { index: this._index, isFirst: this._index === 0, isLast: this._index === this.pageCount - 1 } }));
  };

  protected render(): unknown {
    return html`<div
      class="root"
      @pointerdown="${this._onPointerDown}"
      @pointermove="${this._onPointerMove}"
      @pointerup="${this._onPointerUp}"
    >
    <div class="markers"></div><slot @slotchange="${this._onSlotChange}"></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paged-scroll-container': PagedScrollContainer;
  }

  interface HTMLElementEventMap {
    pagechange: CustomEvent<PageChangeDetail>;
  }
}
