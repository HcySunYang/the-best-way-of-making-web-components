import styleSheet from './my-span.css' with { type: 'css' };
import { fetchTemplate } from '../util.js';
import '../my-button/my-button.js';

const template = await fetchTemplate(new URL('./my-span.html', import.meta.url));

class MySpan extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.append(template.cloneNode(true));
    this.shadowRoot.adoptedStyleSheets.push(styleSheet);
  }
}

customElements.define('my-span', MySpan);