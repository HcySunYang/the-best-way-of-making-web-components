import styleSheet from './my-button.css' with { type: 'css' };
import { fetchTemplate } from '../util.js';

const template = await fetchTemplate(new URL('./my-button.html', import.meta.url));

class MyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    // setup template
    this.shadowRoot.append(template.cloneNode(true));
    // setup styles
    this.shadowRoot.adoptedStyleSheets.push(styleSheet);
  }
}

customElements.define('my-button', MyButton);