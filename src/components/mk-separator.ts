import { LitElement, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './mk-separator.css?inline';

@customElement('mk-separator')
export class MkSeparator extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String, reflect: true }) variant: 'dotted' | 'solid' = 'dotted';

  constructor() {
    super();
    this.setAttribute('role', 'separator');
  }
}
