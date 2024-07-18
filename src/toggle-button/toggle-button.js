import styleSheet from './toggle-button.css' with { type: 'css' };
import { fetchTemplate } from '../util.js';

const template = await fetchTemplate(new URL('./toggle-button.html', import.meta.url));

class ToggleButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.append(template.cloneNode(true));
    this.shadowRoot.adoptedStyleSheets.push(styleSheet);
  }
}

customElements.define('toggle-button', ToggleButton);