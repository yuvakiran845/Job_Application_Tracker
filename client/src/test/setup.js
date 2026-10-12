import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// findBy*/waitFor give up after 1 s by default. Under load (a busy CI runner, or
// browser tests running alongside) full-app renders can take longer, which made a
// few tests fail intermittently; passing tests still finish as soon as they can.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});

// jsdom has no ResizeObserver (used by Recharts' ResponsiveContainer). Charts render
// at zero size in tests, so tests assert on the table views instead.
window.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement scrolling (used by React Router's <ScrollRestoration />).
window.scrollTo = () => {};

// jsdom does not implement modal dialogs; emulate the parts our components use.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}
