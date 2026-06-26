import { html, LitElement, unsafeCSS } from 'lit';
import { customElement, eventOptions, query } from 'lit/decorators.js';
import styles from './scroll-container.css?inline';

export interface PageChangeDetail {
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

@customElement('scroll-container')
export class ScrollContainer extends LitElement {
  static styles = unsafeCSS(styles);

  @query('.root') private _root!: HTMLElement;
  @query('.markers') private _markers!: HTMLElement;

  private _index = 0;
  private _rafId = 0;
  private _ro?: ResizeObserver;
  private _mo?: MutationObserver;
  private _startX: null | number = null;
  private _startY: null | number = null;
  private _isScrolling: boolean = false;

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

  private _pageCount(): number {
    const ph = this._root.clientHeight;
    if (ph === 0) return 1;

    return Math.max(1, Math.ceil(this._root.scrollHeight / ph));
  }

  private _rebuildMarkers(): void {
    const ph = this._root.clientHeight;
    if (ph === 0) return;
    const count = this._pageCount();
    this._markers.replaceChildren();

    for (let i = 0; i < count; i++) {
      const m = document.createElement('div');
      m.className = 'marker';
      m.style.top = `${i * ph}px`;
      this._markers.appendChild(m);
    }
  }

  private _onPointerDown(e: PointerEvent): void {
    this._startX = e.x;
    this._startY = e.y;
  }

  private _onPointerMove = (e: PointerEvent): void => {
    if (this._startX === null || this._startY === null) return;

    const diffY = e.y - this._startY;

    if (Math.abs(diffY) > 50) {
      this._isScrolling = true;
      this._root.classList.add('scrollable');
      document.getSelection()?.removeAllRanges();
    }
  };

  private _onPointerUp = (e: PointerEvent): void => {
    if (this._startY === null || this._startX === null) return;

    const diffY = e.y - this._startY;

    if (diffY > 50 && this._index > 0) {
      this._index--;
      this._scrollToCurrentPage();
    } else if (diffY < -50 && this._index < this._pageCount()) {
      this._index++;
      this._scrollToCurrentPage();
    }
  };

  @eventOptions({ capture: true })
  private _onClick(e: Event): void {
    if (this._isScrolling) {
      e.stopPropagation();
      this._isScrolling = false;
      this._startY = null;
      this._startX = null;
      this._root.classList.add('scrollable');
    }
  }

  private _scrollToCurrentPage = (): void => {
      const markers = this._markers.getElementsByClassName('marker') as HTMLCollectionOf<HTMLDivElement>; 
      // When we scroll down, the marker is at the bottom of the current view.
      // When we scroll up, the marker is at the top.
      const markerToScroll = markers?.[this._index];

      if (!markerToScroll) return;

      this._root.scrollTo({ top: markerToScroll.clientTop });
      this._root.scrollTop = markerToScroll.offsetTop;

      this.dispatchEvent(new CustomEvent<PageChangeDetail>('pagechange', { detail: { index: this._index, isFirst: this._index === 0, isLast: this._index === this._pageCount() - 1 } }));
  };

  protected render(): unknown {
    return html`<div
      class="root"
      @click="${this._onClick}"
      @pointerdown="${this._onPointerDown}"
      @pointermove="${this._onPointerMove}"
      @pointerup="${this._onPointerUp}"
    >
    <div class="markers"></div><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'scroll-container': ScrollContainer;
  }

  interface HTMLElementEventMap {
    pagechange: CustomEvent<PageChangeDetail>;
  }
}
