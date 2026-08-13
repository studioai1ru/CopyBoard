import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const WAIT_LIMIT_MS = 15_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitFor(check, description, timeout = WAIT_LIMIT_MS) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || 'Browser evaluation failed');
    }
    return response.result.value;
  }

  close() {
    this.socket.close();
  }
}

const mockSource = String.raw`
(() => {
  const surface = new URLSearchParams(location.search).get('surface');
  const originalMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const result = originalMatchMedia(query);
    if (query !== '(prefers-color-scheme: dark)' || !surface?.startsWith('quick-access')) {
      return result;
    }
    return {
      matches: true,
      media: result.media,
      onchange: null,
      addListener: result.addListener?.bind(result),
      removeListener: result.removeListener?.bind(result),
      addEventListener: result.addEventListener.bind(result),
      removeEventListener: result.removeEventListener.bind(result),
      dispatchEvent: result.dispatchEvent.bind(result)
    };
  };
  const stale = [{
    id: 'legacy-local',
    type: 'text',
    content: 'THIS STALE LOCALSTORAGE ENTRY MUST NOT RETURN',
    preview: 'THIS STALE LOCALSTORAGE ENTRY MUST NOT RETURN',
    timestamp: '2020-01-01T00:00:00.000Z'
  }];
  try {
    localStorage.setItem('clipboardHistory', JSON.stringify(stale));
    localStorage.setItem('appLanguage', 'ru');
    localStorage.removeItem('copyboard.appearance');
    localStorage.removeItem('copyboard.resolvedAppearance');
  } catch {}

  const initialFavorite = {
    id: 'favorite-short',
    label: 'Короткий',
    content: 'Короткий',
    icon: 'text',
    displayMode: 'icon-text',
    createdAt: '2026-08-13T10:00:00.000Z'
  };
  const state = {
    settings: {
      language: 'ru',
      theme: 'system',
      viewMode: 'grid',
      closeBehavior: 'minimize',
      startMinimized: false,
      autoStart: false,
      showTrayNotifications: true,
      quickAccessEnabled: true,
      showQuickAccessEdge: true,
      maxItems: 100,
      autoDelete: 'never'
    },
    history: [],
    favorites: [initialFavorite],
    calls: [],
    resolvedTheme: 'light',
    edgeVisible: true,
    editorItem: null
  };
  const callbacks = new Map();
  const listeners = new Map();
  let callbackId = 100;

  const copy = (value) => structuredClone(value);
  const emit = (channel, payload) => {
    for (const id of listeners.get(channel) || []) {
      callbacks.get(id)?.({ event: channel, id, payload: copy(payload) });
    }
  };
  const setListeners = (channel, ids) => {
    listeners.set(channel, ids);
  };
  const removeListener = (channel, id) => {
    setListeners(channel, (listeners.get(channel) || []).filter((value) => value !== id));
  };

  globalThis.isTauri = true;
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: removeListener };
  window.__TAURI_INTERNALS__ = {
    transformCallback(callback, once = false) {
      callbackId += 1;
      const id = callbackId;
      callbacks.set(id, (value) => {
        callback?.(value);
        if (once) callbacks.delete(id);
      });
      return id;
    },
    unregisterCallback(id) {
      callbacks.delete(id);
    },
    convertFileSrc(value) {
      return value;
    },
    async invoke(command, args = {}) {
      state.calls.push({ command, args: copy(args), at: performance.now() });
      if (command === 'plugin:event|listen') {
        setListeners(args.event, [...(listeners.get(args.event) || []), args.handler]);
        return args.handler;
      }
      if (command === 'plugin:event|unlisten') {
        removeListener(args.event, args.eventId);
        return null;
      }
      switch (command) {
        case 'window_ready':
        case 'window_hide':
        case 'window_show':
        case 'window_minimize':
        case 'window_toggle_maximize':
        case 'window_close':
          return true;
        case 'window_is_maximized':
          return false;
        case 'settings_get':
          return copy(state.settings);
        case 'settings_save':
          Object.assign(state.settings, args.partial || {});
          return copy(state.settings);
        case 'settings_get_language':
          return state.settings.language;
        case 'settings_get_resolved_theme':
          return state.resolvedTheme;
        case 'settings_set_language':
          state.settings.language = args.language;
          return true;
        case 'settings_set_auto_start':
        case 'settings_set_hotkeys':
        case 'settings_set_close_mode':
        case 'settings_set_launch_hidden':
          return true;
        case 'settings_get_auto_start':
          return false;
        case 'settings_get_auto_start_status':
          return { openAtLogin: false, openAsHidden: false };
        case 'settings_get_hotkeys':
          return { quickAccess: 'Ctrl+Shift+V', clearAll: 'Ctrl+Shift+Delete' };
        case 'history_load':
          return copy(state.history);
        case 'history_save':
          state.history = copy(args.items || []);
          queueMicrotask(() => emit('copyboard:history.changed', null));
          return true;
        case 'history_clear':
          state.history = [];
          queueMicrotask(() => emit('copyboard:history.changed', null));
          return true;
        case 'favorites_load':
          return copy(state.favorites);
        case 'favorites_save':
          state.favorites = copy(args.items || []);
          queueMicrotask(() => emit('copyboard:favorites.changed', state.favorites));
          return copy(state.favorites);
        case 'favorites_update': {
          const index = state.favorites.findIndex((item) => item.id === args.item.id);
          if (index >= 0) state.favorites[index] = copy(args.item);
          queueMicrotask(() => emit('copyboard:favorites.changed', state.favorites));
          return copy(state.favorites);
        }
        case 'favorites_delete':
          state.favorites = state.favorites.filter((item) => item.id !== args.id);
          queueMicrotask(() => emit('copyboard:favorites.changed', state.favorites));
          return copy(state.favorites);
        case 'quick_access_get_edge_visible':
          return state.edgeVisible;
        case 'quick_access_open_editor':
          state.editorItem = copy(state.favorites.find((item) => item.id === args.id) || null);
          return Boolean(state.editorItem);
        case 'quick_access_get_editor_item':
          return copy(state.editorItem);
        case 'quick_access_close_editor':
          state.editorItem = null;
          return true;
        case 'quick_access_set_edge_visible':
          state.edgeVisible = args.visible;
          queueMicrotask(() => window.dispatchEvent(new CustomEvent(
            'copyboard:quickAccess.edgeVisible.native',
            { detail: args.visible },
          )));
          return true;
        case 'quick_access_ready':
        case 'quick_access_configure':
        case 'quick_access_set_enabled':
        case 'quick_access_move_horizontal':
        case 'quick_access_commit_position':
        case 'quick_access_set_open':
          return true;
        case 'clip_write_text':
        case 'clip_write_image':
        case 'clip_write_files':
          return true;
        case 'clip_read_text':
          return '';
        case 'clip_read_image':
          return null;
        default:
          return true;
      }
    }
  };

  window.__copyboardHarness = {
    state,
    emit,
    capture(item) {
      state.history = [copy(item), ...state.history.filter((row) => row.id !== item.id)];
      window.dispatchEvent(new CustomEvent(
        'copyboard:history.changed.native',
        { detail: { force: false } },
      ));
    },
    setFavorites(items) {
      state.favorites = copy(items);
      emit('copyboard:favorites.changed', state.favorites);
    },
    setEditorItem(item, notify = false) {
      state.editorItem = copy(item);
      if (notify) {
        window.dispatchEvent(new CustomEvent(
          'copyboard:quickAccess.editorItem.native',
          { detail: copy(item) },
        ));
      }
    },
    setEdge(visible) {
      state.edgeVisible = visible;
      window.dispatchEvent(new CustomEvent(
        'copyboard:quickAccess.edgeVisible.native',
        { detail: visible },
      ));
    }
  };
})();
`;

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function screenshot(cdp, target) {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(target, Buffer.from(result.data, 'base64'));
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    once(child, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
}

async function navigate(cdp, url, readySelector) {
  await cdp.send('Page.navigate', { url });
  await waitFor(
    () => cdp.evaluate(`document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(readySelector)}))`),
    readySelector,
  );
}

async function mainHistoryScenario(cdp, baseUrl, artifactDir) {
  await setViewport(cdp, 1040, 780);
  await navigate(cdp, baseUrl, '.app');
  await waitFor(() => cdp.evaluate('document.querySelector(".boot-spinner") === null'), 'main history load');

  const initial = await cdp.evaluate(`({
    cards: document.querySelectorAll('.clip-card').length,
    empty: Boolean(document.querySelector('.clipboard-board--empty')),
    stalePresent: document.body.textContent.includes('THIS STALE LOCALSTORAGE ENTRY MUST NOT RETURN')
  })`);
  assert(initial.cards === 0 && initial.empty && !initial.stalePresent,
    'Native empty history resurrected a stale localStorage entry');

  const idleLoadCallsBefore = await cdp.evaluate(`window.__copyboardHarness.state.calls
    .filter((call) => call.command === 'history_load').length`);
  await new Promise((resolve) => setTimeout(resolve, 900));
  const idleLoadCallsAfter = await cdp.evaluate(`window.__copyboardHarness.state.calls
    .filter((call) => call.command === 'history_load').length`);
  assert(idleLoadCallsAfter === idleLoadCallsBefore,
    `History polling detected while idle: ${idleLoadCallsBefore} -> ${idleLoadCallsAfter}`);

  const captureStarted = Date.now();
  await cdp.evaluate(`window.__copyboardHarness.capture({
    id: 'capture-image-now',
    type: 'image',
    content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    preview: '',
    timestamp: new Date().toISOString()
  })`);
  await waitFor(
    () => cdp.evaluate('document.querySelectorAll(".clip-card--image").length === 1'),
    'event-driven image history refresh',
  );
  const refreshMs = Date.now() - captureStarted;
  const loadCalls = await cdp.evaluate(`window.__copyboardHarness.state.calls
    .filter((call) => call.command === 'history_load').length`);
  assert(loadCalls >= 2, 'History change event did not reload native history');

  await cdp.evaluate(`window.__copyboardHarness.capture({
    id: 'capture-leading-space',
    type: 'text',
    content: '\\r\\n\\u2003Morgenshtern базовый минимум',
    preview: 'Morgenshtern базовый минимум',
    timestamp: new Date().toISOString()
  })`);
  await waitFor(
    () => cdp.evaluate('document.querySelectorAll(".clip-card").length === 2'),
    'leading-whitespace history item',
  );
  await cdp.evaluate(`document.querySelector('.clip-card--text .clip-card__actions button[aria-pressed]').click()`);
  await waitFor(
    () => cdp.evaluate('document.querySelector(".clip-card--text .clip-card__actions button[aria-pressed=true]") !== null'),
    'normalized favorite active state',
  );
  await cdp.evaluate(`document.querySelector('.clip-card--text .clip-card__actions button[aria-pressed=true]').click()`);
  await waitFor(
    () => cdp.evaluate('document.querySelector(".clip-card--text .clip-card__actions button[aria-pressed=false]") !== null'),
    'normalized favorite removal',
  );

  await cdp.evaluate(`window.__copyboardHarness.setFavorites([{
    id: 'favorite-file',
    label: 'report.pdf',
    content: JSON.stringify(['C:\\\\Work\\\\report.pdf']),
    icon: 'file',
    displayMode: 'icon-text'
  }])`);
  await waitFor(
    () => cdp.evaluate('document.querySelector(".frequent-chip--file") !== null'),
    'file favorite chip',
  );
  await cdp.evaluate('document.querySelector(".frequent-chip--file").click()');
  const fileCopy = await waitFor(async () => {
    const value = await cdp.evaluate(`window.__copyboardHarness.state.calls
      .filter((call) => call.command === 'clip_write_files').at(-1) || null`);
    return value || false;
  }, 'file favorite native copy');
  assert(fileCopy.args.recordHistory === true
    && fileCopy.args.files?.[0] === 'C:\\Work\\report.pdf',
  `File favorite was not copied as files: ${JSON.stringify(fileCopy)}`);

  const imagePath = path.join(artifactDir, 'history-immediate.png');
  await screenshot(cdp, imagePath);
  return {
    initial,
    idleLoadCallsBefore,
    idleLoadCallsAfter,
    refreshMs,
    loadCalls,
    fileCopy,
    screenshot: imagePath,
  };
}

async function drawerScenario(cdp, baseUrl, artifactDir) {
  await setViewport(cdp, 278, 72);
  await navigate(cdp, `${baseUrl}?surface=quick-access`, '.quick-drawer');
  await waitFor(
    () => cdp.evaluate('document.querySelectorAll(".quick-drawer__item").length === 1'),
    'initial drawer favorite',
  );

  const initialTheme = await cdp.evaluate(`({
    theme: document.documentElement.dataset.theme,
    mode: document.documentElement.dataset.themeMode,
    background: getComputedStyle(document.querySelector('.quick-drawer__items')).backgroundColor,
    resolvedThemeCalls: window.__copyboardHarness.state.calls
      .filter((call) => call.command === 'settings_get_resolved_theme').length
  })`);
  assert(initialTheme.theme === 'light'
    && initialTheme.mode === 'system'
    && initialTheme.background === 'rgb(255, 255, 255)'
    && initialTheme.resolvedThemeCalls >= 1,
  `Clean-start drawer ignored the main window theme: ${JSON.stringify(initialTheme)}`);

  const initialWidth = await cdp.evaluate('document.querySelector(".quick-drawer").getBoundingClientRect().width');
  assert(initialWidth === 278, `Initial drawer width is ${initialWidth}, expected 278`);

  await cdp.evaluate(`{
    const item = document.querySelector('.quick-drawer__item');
    const rect = item.getBoundingClientRect();
    item.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: rect.right - 2,
      clientY: rect.bottom - 2
    }));
  }`);
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".quick-drawer__menu"))'), 'drawer context menu');
  const configuredMenuHeight = await waitFor(async () => {
    const value = await cdp.evaluate(`window.__copyboardHarness.state.calls
      .filter((call) => call.command === 'quick_access_configure')
      .map((call) => call.args.height)
      .findLast((height) => height >= 96) || 0`);
    return value >= 96 ? value : false;
  }, 'context menu window expansion');
  await setViewport(cdp, 278, configuredMenuHeight);
  const menuBounds = await cdp.evaluate(`(() => {
    const rect = document.querySelector('.quick-drawer__menu').getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      width: innerWidth, height: innerHeight };
  })()`);
  assert(menuBounds.left >= 0 && menuBounds.top >= 0
    && menuBounds.right <= menuBounds.width && menuBounds.bottom <= menuBounds.height,
  `Context menu is clipped: ${JSON.stringify(menuBounds)}`);

  await cdp.evaluate('document.querySelector(".quick-drawer__menu button").click()');
  await waitFor(
    () => cdp.evaluate(`window.__copyboardHarness.state.calls
      .some((call) => call.command === 'quick_access_open_editor')`),
    'independent editor request',
  );
  const drawerAfterEditorRequest = await cdp.evaluate(`({
    width: document.querySelector('.quick-drawer').getBoundingClientRect().width,
    modalAttached: Boolean(document.querySelector('.frequent-modal')),
    closeRequested: window.__copyboardHarness.state.calls
      .some((call) => call.command === 'quick_access_set_open' && call.args.open === false)
  })`);
  assert(drawerAfterEditorRequest.width === 278
    && !drawerAfterEditorRequest.modalAttached
    && drawerAfterEditorRequest.closeRequested,
  `Drawer still owns or moves with the editor: ${JSON.stringify(drawerAfterEditorRequest)}`);

  await navigate(cdp, `${baseUrl}?surface=quick-access-editor`, '#root');
  const editorInitiallyHidden = await cdp.evaluate('document.querySelector(".frequent-modal") === null');
  assert(editorInitiallyHidden, 'Editor surface should remain empty until an item is requested');
  await cdp.evaluate(`(() => {
    window.__copyboardHarness.setEditorItem(
      window.__copyboardHarness.state.favorites[0],
      false,
    );
    window.dispatchEvent(new Event('focus'));
  })()`);
  await waitFor(
    () => cdp.evaluate('Boolean(document.querySelector(".frequent-modal"))'),
    'editor focus synchronization',
  );
  await setViewport(cdp, 820, 620);
  await new Promise((resolve) => setTimeout(resolve, 80));
  const editor = await cdp.evaluate(`(() => {
    const modal = document.querySelector('.frequent-modal').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.frequent-modal__action-btns button')]
      .map((button) => button.getBoundingClientRect());
    const overlap = buttons.length === 2
      && !(buttons[0].right <= buttons[1].left || buttons[1].right <= buttons[0].left
        || buttons[0].bottom <= buttons[1].top || buttons[1].bottom <= buttons[0].top);
    return {
      width: modal.width,
      centerX: modal.left + modal.width / 2,
      centerY: modal.top + modal.height / 2,
      viewportX: innerWidth / 2,
      viewportY: innerHeight / 2,
      overlap
    };
  })()`);
  assert(editor.width >= 400, `Drawer editor is still narrow: ${editor.width}px`);
  assert(Math.abs(editor.centerX - editor.viewportX) <= 2 && Math.abs(editor.centerY - editor.viewportY) <= 2,
    `Drawer editor is not centered: ${JSON.stringify(editor)}`);
  assert(!editor.overlap, 'Drawer editor action buttons overlap');

  const editorPath = path.join(artifactDir, 'drawer-editor.png');
  await screenshot(cdp, editorPath);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
  });
  await waitFor(() => cdp.evaluate('document.querySelector(".frequent-modal") === null'), 'Escape editor dismissal');
  const editorCloseCalls = await cdp.evaluate(`window.__copyboardHarness.state.calls
    .filter((call) => call.command === 'quick_access_close_editor').length`);
  assert(editorCloseCalls === 1,
    `Independent editor did not close itself: ${editorCloseCalls}`);

  await navigate(cdp, `${baseUrl}?surface=quick-access`, '.quick-drawer');
  await waitFor(
    () => cdp.evaluate('document.querySelectorAll(".quick-drawer__item").length === 1'),
    'drawer after editor close',
  );

  await setViewport(cdp, 278, 96);
  await cdp.evaluate(`window.__copyboardHarness.setFavorites([
    { id: 'favorite-short', label: 'Короткий', content: 'Короткий', icon: 'text', displayMode: 'icon-text' },
    { id: 'favorite-long', label: 'Очень длинное шаблонное значение, которое не должно менять ширину шторки', content: 'Очень длинное шаблонное значение, которое не должно менять ширину шторки', icon: 'text', displayMode: 'icon-text' },
    { id: 'favorite-file', label: 'CHANGELOG.md', content: JSON.stringify(['C:\\\\Work\\\\CHANGELOG.md']), icon: 'file', displayMode: 'icon-text' },
    { id: 'favorite-image', label: '', content: 'data:image/png;base64,iVBORw0KGgo=', icon: 'image', displayMode: 'icon' },
    { id: 'favorite-icon-1', label: 'Один', content: 'Один', icon: 'text', displayMode: 'icon' },
    { id: 'favorite-icon-2', label: 'Два', content: 'Два', icon: 'code', displayMode: 'icon' }
  ])`);
  await waitFor(
    () => cdp.evaluate('document.querySelectorAll(".quick-drawer__item").length === 6'),
    'live favorites update',
  );
  const configuredDrawerHeight = await waitFor(async () => {
    const value = await cdp.evaluate(`window.__copyboardHarness.state.calls
      .filter((call) => ['quick_access_ready', 'quick_access_configure'].includes(call.command))
      .map((call) => call.args.height)
      .findLast((height) => height > 96) || 0`);
    return value > 96 ? value : false;
  }, 'drawer resize after favorites update');
  await setViewport(cdp, 278, configuredDrawerHeight);

  const layout = await cdp.evaluate(`(() => {
    const drawer = document.querySelector('.quick-drawer');
    const items = [...document.querySelectorAll('.quick-drawer__row--item .quick-drawer__item')];
    const icons = [...document.querySelectorAll('.quick-drawer__row--icons .quick-drawer__item')];
    const list = document.querySelector('.quick-drawer__items');
    return {
      drawerWidth: drawer.getBoundingClientRect().width,
      itemWidths: items.map((item) => item.getBoundingClientRect().width),
      iconRows: new Set(icons.map((item) => Math.round(item.getBoundingClientRect().top))).size,
      horizontalScroll: list.scrollWidth > list.clientWidth || document.documentElement.scrollWidth > innerWidth,
      listScrollWidth: list.scrollWidth,
      listClientWidth: list.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    };
  })()`);
  assert(layout.drawerWidth === 278, `Drawer width changed to ${layout.drawerWidth}`);
  assert(layout.itemWidths.length === 3 && new Set(layout.itemWidths.map(Math.round)).size === 1,
    `Favorite block widths are inconsistent: ${JSON.stringify(layout.itemWidths)}`);
  assert(layout.iconRows === 1, 'Icon-only favorites did not share a row');
  assert(!layout.horizontalScroll, 'Drawer has a horizontal scrollbar');
  const imageTitle = await cdp.evaluate(`document.querySelector('.quick-drawer__item[aria-label*="Изображение"]')?.getAttribute('title') ?? null`);
  assert(imageTitle === null, `Image favorite exposes encoded content in title: ${imageTitle}`);

  await cdp.evaluate(`window.__TAURI_INTERNALS__.invoke(
    'quick_access_set_edge_visible',
    { visible: false },
  )`);
  await waitFor(
    () => cdp.evaluate('document.querySelector(".quick-drawer").classList.contains("quick-drawer--edge-hidden")'),
    'live edge hide',
  );
  const hiddenEdge = await cdp.evaluate(`(() => {
    const handle = document.querySelector('.quick-drawer__handle');
    const stripe = handle.querySelector('span');
    return { handleHeight: handle.getBoundingClientRect().height, stripeDisplay: getComputedStyle(stripe).display };
  })()`);
  assert(hiddenEdge.handleHeight === 20 && hiddenEdge.stripeDisplay === 'none',
    `Hidden edge state is incorrect: ${JSON.stringify(hiddenEdge)}`);
  await cdp.evaluate(`window.__TAURI_INTERNALS__.invoke(
    'quick_access_set_edge_visible',
    { visible: true },
  )`);
  await waitFor(
    () => cdp.evaluate('!document.querySelector(".quick-drawer").classList.contains("quick-drawer--edge-hidden")'),
    'live edge show',
  );
  const visibleEdge = await cdp.evaluate(`(() => {
    const handle = document.querySelector('.quick-drawer__handle');
    const style = getComputedStyle(handle);
    return {
      stripeDisplay: getComputedStyle(handle.querySelector('span')).display,
      background: style.backgroundColor,
      borderStyle: style.borderBottomStyle
    };
  })()`);
  assert(visibleEdge.stripeDisplay !== 'none'
    && visibleEdge.background !== 'rgba(0, 0, 0, 0)'
    && visibleEdge.borderStyle !== 'none',
  `Drawer edge did not restore its themed handle immediately: ${JSON.stringify(visibleEdge)}`);
  await cdp.evaluate(`document.documentElement.removeAttribute('data-theme')`);
  await new Promise((resolve) => setTimeout(resolve, 240));
  const darkEdge = await cdp.evaluate(`(() => {
    const style = getComputedStyle(document.querySelector('.quick-drawer__handle'));
    return { background: style.backgroundColor, borderColor: style.borderBottomColor };
  })()`);
  assert(darkEdge.background === 'rgb(25, 40, 66)'
    && darkEdge.borderColor === 'rgb(58, 79, 112)',
  `Drawer edge disappears in dark mode: ${JSON.stringify(darkEdge)}`);
  await cdp.evaluate(`document.documentElement.dataset.theme = 'light'`);

  const handle = await cdp.evaluate(`(() => {
    const rect = document.querySelector('.quick-drawer__handle').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: handle.x, y: handle.y, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: handle.x + 70, y: handle.y, button: 'left', buttons: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: handle.x + 70, y: handle.y, button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(
    () => cdp.evaluate(`window.__copyboardHarness.state.calls
      .some((call) => call.command === 'quick_access_commit_position')`),
    'drawer position commit',
  );
  const drag = await cdp.evaluate(`({
    deltas: window.__copyboardHarness.state.calls
      .filter((call) => call.command === 'quick_access_move_horizontal')
      .map((call) => call.args.deltaX),
    commits: window.__copyboardHarness.state.calls
      .filter((call) => call.command === 'quick_access_commit_position').length
  })`);
  assert(drag.deltas.some((delta) => delta > 0) && drag.commits === 1,
    `Horizontal drag was not persisted: ${JSON.stringify(drag)}`);

  const firstItemId = await cdp.evaluate('window.__copyboardHarness.state.favorites[0].id');
  await cdp.evaluate(`{
    const item = document.querySelector('.quick-drawer__item');
    const rect = item.getBoundingClientRect();
    item.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: rect.left + 8, clientY: rect.top + 8
    }));
  }`);
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".quick-drawer__menu .danger"))'), 'delete menu');
  await cdp.evaluate('document.querySelector(".quick-drawer__menu .danger").click()');
  await waitFor(
    () => cdp.evaluate(`!window.__copyboardHarness.state.favorites.some((item) => item.id === ${JSON.stringify(firstItemId)})`),
    'favorite deletion persistence',
  );
  const remaining = await cdp.evaluate('window.__copyboardHarness.state.favorites.length');
  assert(remaining === 5, `Favorite delete did not persist; remaining=${remaining}`);

  const drawerPath = path.join(artifactDir, 'drawer-fixed.png');
  await screenshot(cdp, drawerPath);
  await cdp.evaluate('window.__copyboardHarness.setFavorites([])');
  await waitFor(
    () => cdp.evaluate('Boolean(document.querySelector(".quick-drawer__empty"))'),
    'empty drawer placeholder',
  );
  const emptyDrawer = await cdp.evaluate(`({
    width: document.querySelector('.quick-drawer').getBoundingClientRect().width,
    text: document.querySelector('.quick-drawer__empty').textContent.trim()
  })`);
  assert(emptyDrawer.width === 278 && emptyDrawer.text.length > 0,
    `Empty drawer dimensions or message are incorrect: ${JSON.stringify(emptyDrawer)}`);
  return {
    initialWidth,
    initialTheme,
    menuBounds,
    editor,
    drawerAfterEditorRequest,
    editorCloseCalls,
    layout,
    hiddenEdge,
    visibleEdge,
    darkEdge,
    imageTitle,
    drag,
    remaining,
    emptyDrawer,
    screenshots: [editorPath, drawerPath],
  };
}

async function run() {
  const vitePort = await freePort();
  const debugPort = await freePort();
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'copyboard-emulation-edge-'));
  const artifactDir = await mkdtemp(path.join(os.tmpdir(), 'copyboard-emulation-results-'));
  const vite = spawn(process.execPath, [
    path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
    '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort',
  ], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const edge = spawn(EDGE, [
    '--headless=new',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1040,780',
    'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });

  let cdp;
  try {
    const baseUrl = `http://127.0.0.1:${vitePort}/`;
    await waitFor(async () => {
      const response = await fetch(baseUrl).catch(() => null);
      return response?.ok;
    }, 'Vite renderer');
    const targets = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`).catch(() => null);
      if (!response?.ok) return false;
      const list = await response.json();
      return list.find((target) => target.type === 'page') ? list : false;
    }, 'Edge DevTools target');
    const page = targets.find((target) => target.type === 'page');
    cdp = new CdpClient(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: mockSource });

    const history = await mainHistoryScenario(cdp, baseUrl, artifactDir);
    const drawer = await drawerScenario(cdp, baseUrl, artifactDir);
    const result = { ok: true, history, drawer, artifactDir };
    await writeFile(path.join(artifactDir, 'result.json'), JSON.stringify(result, null, 2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    cdp?.close();
    await stopChild(edge);
    await stopChild(vite);
    await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
