import { describe, expect, it, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './infinite-scroll-container';
import type { InfiniteScrollContainer } from './infinite-scroll-container';

function root(el: InfiniteScrollContainer): HTMLElement {
  return el.shadowRoot!.querySelector('.root') as HTMLElement;
}

function setSizes(el: InfiniteScrollContainer, clientHeight: number, scrollHeight: number): void {
  const node = root(el);
  Object.defineProperty(node, 'clientHeight', { value: clientHeight, configurable: true });
  Object.defineProperty(node, 'scrollHeight', { value: scrollHeight, configurable: true });
}

function scrollTo(el: InfiniteScrollContainer, top: number): void {
  const node = root(el);
  Object.defineProperty(node, 'scrollTop', { value: top, configurable: true, writable: true });
  node.dispatchEvent(new Event('scroll'));
}

async function mount(threshold?: number) {
  const onTop = vi.fn();
  const onBottom = vi.fn();
  const el = await fixture<InfiniteScrollContainer>(html`
    <infinite-scroll-container
      .threshold=${threshold ?? 50}
      .onTop=${onTop}
      .onBottom=${onBottom}
    >
      <div style="height: 800px"></div>
    </infinite-scroll-container>
  `);
  setSizes(el, 300, 800);

  return { el, onTop, onBottom };
}

describe('infinite-scroll-container', () => {
  it('defaults the threshold to 50', async () => {
    const el = await fixture<InfiniteScrollContainer>(
      html`<infinite-scroll-container></infinite-scroll-container>`,
    );

    expect(el.threshold).toBe(100);
  });

  it('does not fire either callback before any scrolling', async () => {
    const { onTop, onBottom } = await mount();

    expect(onTop).not.toHaveBeenCalled();
    expect(onBottom).not.toHaveBeenCalled();
  });

  it('calls onTop when scrolled within the threshold of the top', async () => {
    const { el, onTop } = await mount();

    scrollTo(el, 400);
    scrollTo(el, 20);

    expect(onTop).toHaveBeenCalledTimes(1);
  });

  it('calls onBottom when scrolled within the threshold of the bottom', async () => {
    const { el, onBottom } = await mount();

    scrollTo(el, 460);

    expect(onBottom).toHaveBeenCalledTimes(1);
  });

  it('does not call onTop repeatedly while parked at the top', async () => {
    const { el, onTop } = await mount();

    scrollTo(el, 400);
    scrollTo(el, 20);
    scrollTo(el, 10);
    scrollTo(el, 0);

    expect(onTop).toHaveBeenCalledTimes(1);
  });

  it('calls onTop again after leaving and re-entering the zone', async () => {
    const { el, onTop } = await mount();

    scrollTo(el, 400);
    scrollTo(el, 10);
    scrollTo(el, 400);
    scrollTo(el, 10);

    expect(onTop).toHaveBeenCalledTimes(2);
  });

  it('respects a custom threshold', async () => {
    const { el, onTop } = await mount(200);

    scrollTo(el, 400);
    scrollTo(el, 150);

    expect(onTop).toHaveBeenCalledTimes(1);
  });

  it('brings an element to the top of the viewport', async () => {
    const { el } = await mount();
    const node = root(el);
    const target = el.querySelector('div')!;

    node.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    target.getBoundingClientRect = () => ({ top: 320 }) as DOMRect;
    el.scrollToElement(target);

    expect(node.scrollTop).toBe(320);
  });

  it('adds the current scroll offset to the element position', async () => {
    const { el } = await mount();
    const node = root(el);
    const target = el.querySelector('div')!;

    node.scrollTop = 200;
    node.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    target.getBoundingClientRect = () => ({ top: -120 }) as DOMRect;
    el.scrollToElement(target);

    expect(node.scrollTop).toBe(80);
  });

  it('does not re-announce the bottom it just scrolled into', async () => {
    const { el, onBottom } = await mount();
    const node = root(el);
    const target = el.querySelector('div')!;

    node.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    target.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
    el.scrollToElement(target);
    node.dispatchEvent(new Event('scroll'));

    expect(onBottom).not.toHaveBeenCalled();
  });
});
