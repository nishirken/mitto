import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './scroll-container';
import type { PageChangeDetail, ScrollContainer } from './scroll-container';

async function nextFrame(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

function setSizes(el: HTMLElement, clientHeight: number, scrollHeight: number): void {
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
}

function setScrollTop(el: HTMLElement, value: number): void {
  Object.defineProperty(el, 'scrollTop', { value, configurable: true });
}

function lastDetail(handler: ReturnType<typeof vi.fn>): PageChangeDetail {
  const calls = handler.mock.calls;
  const event = calls[calls.length - 1]?.[0] as CustomEvent<PageChangeDetail>;

  return event.detail;
}

describe('scroll-container', () => {
  it('renders slotted content', async () => {
    const el = await fixture<ScrollContainer>(html`
      <scroll-container><span class="kid">hi</span></scroll-container>
    `);

    expect(el.querySelector('.kid')?.textContent).toBe('hi');
  });

  it('emits pagechange with isFirst when at top of multi-page content', async () => {
    const handler = vi.fn();
    const el = await fixture<ScrollContainer>(html`
      <scroll-container @pagechange=${handler}><div></div></scroll-container>
    `);
    await nextFrame();

    const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
    setSizes(root, 100, 300);
    setScrollTop(root, 0);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastDetail(handler)).toEqual({ index: 0, isFirst: true, isLast: false });
  });

  it('emits pagechange on each page change', async () => {
    const handler = vi.fn();
    const el = await fixture<ScrollContainer>(html`
      <scroll-container @pagechange=${handler}><div></div></scroll-container>
    `);
    await nextFrame();

    const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
    setSizes(root, 100, 300);

    setScrollTop(root, 0);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();
    handler.mockClear();

    setScrollTop(root, 100);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastDetail(handler)).toEqual({ index: 1, isFirst: false, isLast: false });
  });

  it('emits isLast when scrolled to the last page', async () => {
    const handler = vi.fn();
    const el = await fixture<ScrollContainer>(html`
      <scroll-container @pagechange=${handler}><div></div></scroll-container>
    `);
    await nextFrame();

    const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
    setSizes(root, 100, 300);

    setScrollTop(root, 200);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(lastDetail(handler)).toEqual({ index: 2, isFirst: false, isLast: true });
  });

  it('coalesces multiple scrolls within the same frame', async () => {
    const handler = vi.fn();
    const el = await fixture<ScrollContainer>(html`
      <scroll-container @pagechange=${handler}><div></div></scroll-container>
    `);
    await nextFrame();

    const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
    setSizes(root, 100, 300);

    setScrollTop(root, 100);
    root.dispatchEvent(new Event('scroll'));
    root.dispatchEvent(new Event('scroll'));
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not emit again when index does not change', async () => {
    const handler = vi.fn();
    const el = await fixture<ScrollContainer>(html`
      <scroll-container @pagechange=${handler}><div></div></scroll-container>
    `);
    await nextFrame();

    const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
    setSizes(root, 100, 300);
    setScrollTop(root, 0);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();
    handler.mockClear();

    setScrollTop(root, 30);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(handler).not.toHaveBeenCalled();
  });

  it('stops emitting after disconnect', async () => {
    const handler = vi.fn();
    const el = await fixture<ScrollContainer>(html`
      <scroll-container @pagechange=${handler}><div></div></scroll-container>
    `);
    await nextFrame();
    const root = el.shadowRoot!.querySelector('.root') as HTMLElement;
    setSizes(root, 100, 300);

    el.remove();
    handler.mockClear();

    setScrollTop(root, 100);
    root.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(handler).not.toHaveBeenCalled();
  });
});
