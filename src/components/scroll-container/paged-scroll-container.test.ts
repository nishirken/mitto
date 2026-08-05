import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './paged-scroll-container';
import type { PageChangeDetail, PagedScrollContainer } from './paged-scroll-container';

async function nextFrame(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

function setSizes(el: Element, clientHeight: number, scrollHeight: number): void {
  const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
  Object.defineProperty(root, 'clientHeight', { value: clientHeight, configurable: true });
  Object.defineProperty(root, 'scrollHeight', { value: scrollHeight, configurable: true });
}

function lastDetail(handler: ReturnType<typeof vi.fn>): PageChangeDetail {
  const calls = handler.mock.calls;
  const event = calls[calls.length - 1]?.[0] as CustomEvent<PageChangeDetail>;

  return event.detail;
}

const queryByTestId = (el: Element, id: string): Element | null =>
  el.querySelector(`[data-testid="${id}"]`);

const renderItems = (count: number): ReturnType<typeof html>[] => {
  return new Array(count).fill(1).map((_, i) => {
    return html`<div data-testid="item:${i + 1}" style="height: 40px;">${i + 1}</div>`;
  });
};

const renderComponent = async (count: number, onPageChange?: (e: CustomEvent<PageChangeDetail>) => void): Promise<PagedScrollContainer> => {
  return fixture<PagedScrollContainer>(html`
      <paged-scroll-container @pagechange="${onPageChange}" data-testid="container">${renderItems(count)}</paged-scroll-container>
    `);
} 

// The pointer listeners live on `.root` inside the shadow root, and events do not
// propagate down into shadow DOM — the gesture has to be dispatched there directly.
function swipe(el: Element, start: number, end: number): void {
  const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
  const step = Math.sign(end - start) || 1;

  root.dispatchEvent(new PointerEvent('pointerdown', { clientY: start }));
  for (let i = start; i !== end; i += step) {
    root.dispatchEvent(new PointerEvent('pointermove', { clientY: i }));
  }
  root.dispatchEvent(new PointerEvent('pointerup', { clientY: end }));
}

const scrollDown = (el: Element): void => swipe(el, 100, 20);
const scrollUp = (el: Element): void => swipe(el, 20, 100);

describe('paged-scroll-container', () => {
  it('renders slotted content', async () => {
    const el = await renderComponent(1);
    expect(queryByTestId(el, 'item:1')).not.toBeNull();
  });

  it('doesnt emit pagechange initially', async () => {
    const handler = vi.fn();
    const el = await renderComponent(30, handler); 
    setSizes(el, 300, 300);
    await nextFrame();

    expect(handler).not.toHaveBeenCalled();
  });

  // 300px viewport, 20 items * 40px = 800px of content — happy-dom does no layout, so
  // scrollHeight has to be stated. ~7 items per page, ceil(800 / 300) = 3 pages.
  it('emits pagechange with first page', async () => {
    const handler = vi.fn();
    const el = await renderComponent(20, handler);
    setSizes(el, 300, 800);
    await nextFrame();

    scrollDown(el);
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastDetail(handler)).toEqual({ index: 1, isFirst: false, isLast: false });
  });

  it('emits pagechange with the zero page', async () => {
    const handler = vi.fn();
    const el = await renderComponent(20, handler);
    setSizes(el, 300, 800);
    await nextFrame();

    scrollDown(el);
    await nextFrame();

    scrollUp(el);
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(lastDetail(handler)).toEqual({ index: 0, isFirst: true, isLast: false });
  });

  it('does not emit when scrolling up from the first page', async () => {
    const handler = vi.fn();
    const el = await renderComponent(20, handler);
    setSizes(el, 300, 800);
    await nextFrame();

    scrollUp(el);
    await nextFrame();

    expect(handler).not.toHaveBeenCalled();
  });

  it('emits isLast when scrolled to the last page', async () => {
    const handler = vi.fn();
    const el = await renderComponent(20, handler);
    setSizes(el, 300, 800);
    await nextFrame();

    scrollDown(el);
    await nextFrame();
    scrollDown(el);
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(lastDetail(handler)).toEqual({ index: 2, isFirst: false, isLast: true });
  });

  it('does not emit when scrolling down from the last page', async () => {
    const handler = vi.fn();
    const el = await renderComponent(20, handler);
    setSizes(el, 300, 800);
    await nextFrame();

    scrollDown(el);
    await nextFrame();
    scrollDown(el);
    await nextFrame();
    scrollDown(el);
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
