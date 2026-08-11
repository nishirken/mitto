import { describe, expect, it, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './scroll-container';
import type { ScrollContainer } from './scroll-container';

async function mount(paged: boolean) {
  const onTop = vi.fn();
  const onBottom = vi.fn();
  const el = await fixture<ScrollContainer>(html`
    <scroll-container ?paged=${paged} .onTop=${onTop} .onBottom=${onBottom}>
      <div data-testid="child" style="height: 800px"></div>
    </scroll-container>
  `);

  return { el, onTop, onBottom };
}

describe('scroll-container', () => {
  it('renders the paged implementation when paged is set', async () => {
    const { el } = await mount(true);

    expect(el.shadowRoot!.querySelector('paged-scroll-container')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('infinite-scroll-container')).toBeNull();
  });

  it('renders the infinite implementation by default', async () => {
    const { el } = await mount(false);

    expect(el.shadowRoot!.querySelector('infinite-scroll-container')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('paged-scroll-container')).toBeNull();
  });

  it('projects its children through to the chosen implementation', async () => {
    const { el } = await mount(true);

    expect(el.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it('forwards the threshold to the infinite implementation', async () => {
    const el = await fixture<ScrollContainer>(
      html`<scroll-container .threshold=${120}></scroll-container>`,
    );
    const inner = el.shadowRoot!.querySelector('infinite-scroll-container')!;

    expect(inner.threshold).toBe(120);
  });

  it('maps a first-page pagechange onto onTop', async () => {
    const { el, onTop, onBottom } = await mount(true);
    const inner = el.shadowRoot!.querySelector('paged-scroll-container')!;

    inner.dispatchEvent(
      new CustomEvent('pagechange', { detail: { index: 0, isFirst: true, isLast: false } }),
    );

    expect(onTop).toHaveBeenCalledTimes(1);
    expect(onBottom).not.toHaveBeenCalled();
  });

  it('maps a last-page pagechange onto onBottom', async () => {
    const { el, onTop, onBottom } = await mount(true);
    const inner = el.shadowRoot!.querySelector('paged-scroll-container')!;

    inner.dispatchEvent(
      new CustomEvent('pagechange', { detail: { index: 2, isFirst: false, isLast: true } }),
    );

    expect(onBottom).toHaveBeenCalledTimes(1);
    expect(onTop).not.toHaveBeenCalled();
  });

  it('fires neither callback for a middle page', async () => {
    const { el, onTop, onBottom } = await mount(true);
    const inner = el.shadowRoot!.querySelector('paged-scroll-container')!;

    inner.dispatchEvent(
      new CustomEvent('pagechange', { detail: { index: 1, isFirst: false, isLast: false } }),
    );

    expect(onTop).not.toHaveBeenCalled();
    expect(onBottom).not.toHaveBeenCalled();
  });

  it('delegates scrollToBottom to the paged implementation', async () => {
    const { el } = await mount(true);
    const inner = el.shadowRoot!.querySelector('paged-scroll-container')!;
    const spy = vi.spyOn(inner, 'scrollToLastPage');

    el.scrollToBottom();

    expect(spy).toHaveBeenCalled();
  });

  it('delegates scrollToBottom to the infinite implementation', async () => {
    const { el } = await mount(false);
    const inner = el.shadowRoot!.querySelector('infinite-scroll-container')!;
    const spy = vi.spyOn(inner, 'scrollToBottom');

    el.scrollToBottom();

    expect(spy).toHaveBeenCalled();
  });

  it('delegates scrollToElement to the paged implementation', async () => {
    const { el } = await mount(true);
    const inner = el.shadowRoot!.querySelector('paged-scroll-container')!;
    const spy = vi.spyOn(inner, 'scrollToElement');
    const child = el.querySelector('[data-testid="child"]')!;

    el.scrollToElement(child);

    expect(spy).toHaveBeenCalledWith(child);
  });

  it('delegates scrollToElement to the infinite implementation', async () => {
    const { el } = await mount(false);
    const inner = el.shadowRoot!.querySelector('infinite-scroll-container')!;
    const spy = vi.spyOn(inner, 'scrollToElement');
    const child = el.querySelector('[data-testid="child"]')!;

    el.scrollToElement(child);

    expect(spy).toHaveBeenCalledWith(child);
  });
});
