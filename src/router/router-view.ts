// TODO: make the typing works

interface CompiledPathResult {
  keys: Iterable<string>;
  regex: RegExp;
}

export type RouterEventType = 'before-active' | 'active' | 'before-inactive' | 'inactive';
export interface RouterEvent extends CustomEvent {
  detail: {
    target: Element,
  };
}
const dispatchEventTo = (element: Element, eventType: RouterEventType) =>
  element.dispatchEvent(
    new CustomEvent(
      eventType,
      {
        bubbles: true,
        composed: true,
        detail: { target: element },
      },
    ) satisfies RouterEvent,
  );

function shouldNotIntercept(navigationEvent: NavigateEvent) {
  return (
    !navigationEvent.canIntercept ||
    // If this is just a hashChange,
    // just let the browser handle scrolling to the content.
    navigationEvent.hashChange ||
    // If this is a download,
    // let the browser perform the download.
    navigationEvent.downloadRequest ||
    // If this is a form submission,
    // let that go to the server.
    navigationEvent.formData
  );
}

export class RouterView extends HTMLElement {
  // weak map will auto delete entry when the key is garbage collected
  private cachedCompiledPathResults = new WeakMap<
    Element,
    CompiledPathResult
  >();

  private getRouteElements() {
    return Iterator.from(this.querySelectorAll('& > [path]'));
  }

  private compilePath(routeElement: Element): CompiledPathResult {
    const cache = this.cachedCompiledPathResults.get(routeElement);
    if (cache) return cache;
    const routePath = routeElement.getAttribute('path') ?? '';
    const keys: string[] = [];
    const pattern = routePath
      .replace(/\//g, '\\/')
      .replace(/\*/g, '.*')
      .replace(/:(\w+)/g, (_, key) => {
        keys.push(key);
        return '([^\\/]+)';
      });
    const result = { keys, regex: new RegExp(`^${pattern}/?$`) };
    this.cachedCompiledPathResults.set(routeElement, result);
    return result;
  }

  // Returns the matched parameters from the path if the path matches the current location,
  // otherwise returns null.
  private matchRouteElement(
    routeElement: Element,
  ): IteratorObject<{ key: string, value: string }> | null {
    const compiledPath = this.compilePath(routeElement);
    const matched = location.pathname.match(compiledPath.regex);
    if (!matched) return null;
    return Iterator.from(compiledPath.keys).map((key, i) => ({
      key,
      value: matched[i + 1],
    }));
  }

  private static updateRouter(router: RouterView) {
    // Because of routeElements is a iterator, so "map" is lazy
    const matchedResultDetail = router
      .getRouteElements()
      .map((routeElement) => {
        const matchResult = router.matchRouteElement(routeElement);
        if (!matchResult) return null;
        return {
          matchResult: matchResult,
          targetChildView: routeElement,
        };
      })
      .find(Boolean);

    if (!matchedResultDetail) return;

    const { matchResult, targetChildView } = matchedResultDetail;
    const prevActiveChildView = router.currentRenderedElement;

    const shouldTriggerInactive = prevActiveChildView && prevActiveChildView !== targetChildView;

    // the prev active child view are about to be inactive
    if (shouldTriggerInactive) {
      dispatchEventTo(prevActiveChildView, 'before-inactive');
    }

    // the matched child view are about to be active
    dispatchEventTo(targetChildView, 'before-active');
    router.mainSlot.setAttribute('name', targetChildView.getAttribute('path') ?? '');

    // Apply the matched parameters from the path to the child view
    matchResult.forEach(({ key, value }) => targetChildView.setAttribute(key, value));

    // Apply the query parameters to the child view
    new URLSearchParams(location.search).forEach((value, key) => targetChildView.setAttribute(key, value));

    // the matched child view are active now
    dispatchEventTo(targetChildView, 'active');

    // the prev active child views are inactive now
    if (shouldTriggerInactive) {
      dispatchEventTo(prevActiveChildView, 'inactive');
    }
  }

  protected connectedCallback() {
    // Create a slot element to project the matched child view
    const slot = document.createElement('slot');
    slot.setAttribute('name', location.pathname);
    this.attachShadow({ mode: 'open' }).appendChild(slot);

    // Initialize the route elements
    this.getRouteElements().forEach((child) => {
      child.setAttribute('slot', child.getAttribute('path') ?? '');
    });

    RouterView.updateRouter(this);
    window.navigation.addEventListener('navigate', this.handleNavigate);
  }

  protected disconnectedCallback() {
    window.navigation.removeEventListener('navigate', this.handleNavigate);
  }

  private handleNavigate = (navigateEvent: NavigateEvent) => {
    if (shouldNotIntercept(navigateEvent)) return;
    navigateEvent.intercept({
      // We have to use the `async` keyword here as the handler's type requires it.
      handler: async () => {
        if (navigateEvent.signal.aborted) return;
        RouterView.updateRouter(this);
      },
    });
  };

  get currentRenderedElement() {
    const assignedElements = this.mainSlot.assignedElements();
    if (process.env.NODE_ENV === 'development') {
      if (assignedElements.length > 1) {
        throw Error(
          'There are more than one active child views, most likely you have multiple child views with the same slot name, e.i. the path attribute of the child view.',
        );
      }
    }
    return assignedElements[0];
  }

  get mainSlot() {
    return this.shadowRoot!.querySelector('slot')!;
  }
}

customElements.define('router-view', RouterView);
