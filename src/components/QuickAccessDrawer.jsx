import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useFrequentItems } from '../hooks/useFrequentItems';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { handleGlobalEscape } from '../utils/escapeStack';
import { favoriteLabel } from '../utils/clipboardUtils';
import { desktop } from '../utils/desktop';
import {
  normalizeFavoriteDisplayMode,
  resolveFavoriteIcon,
} from '../utils/favoriteIcons';
import { clampQuickAccessSize, groupQuickAccessItems } from '../utils/quickAccessLayout';
import { LanguageProvider, useLanguage } from '../utils/i18n';
import { appearance } from '../utils/appearance';
import { classifyPayload } from '../utils/clipboardUtils';
import { parseFileReferences } from '../utils/fileReferences';
import FavoriteTypeIcon from './FavoriteTypeIcon';
import FrequentEditModal from './FrequentEditModal';
import '../scss/QuickAccessDrawer.scss';

const COPY_FEEDBACK_MS = 240;

const afterLayout = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

function QuickAccessDrawer({ edgeVisible }) {
  const { t } = useLanguage();
  const {
    items,
    loaded,
    refreshItems,
    updateItem,
    deleteItem,
  } = useFrequentItems();
  const [copiedId, setCopiedId] = useState(null);
  const [menu, setMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const panelRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const openingRef = useRef(false);
  const editingRef = useRef(false);
  const dragRef = useRef(null);
  const dragFrameRef = useRef(null);
  const dragQueueRef = useRef(Promise.resolve());
  const readyRef = useRef(false);
  const lastSizeRef = useRef('');
  const rows = useMemo(() => groupQuickAccessItems(items), [items]);

  useEffect(() => {
    if (!menu) return undefined;

    const focusFrame = requestAnimationFrame(() => {
      menuRef.current?.querySelector('button')?.focus();
    });

    const close = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setMenu(null);
    };

    document.addEventListener('mousedown', close);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('mousedown', close);
    };
  }, [menu]);

  const measureAndConfigure = useCallback(async () => {
    if (editingRef.current) return false;
    const panel = panelRef.current;
    if (!panel) return false;

    const bounds = panel.getBoundingClientRect();
    const size = clampQuickAccessSize(bounds.width, bounds.height);
    if (menu) size.height = Math.max(size.height, 96);
    const fingerprint = `${size.width}x${size.height}`;
    const api = desktop();

    if (!readyRef.current) {
      await api?.quickAccess?.ready?.(size);
      readyRef.current = true;
      lastSizeRef.current = fingerprint;
      return true;
    }

    if (lastSizeRef.current !== fingerprint) {
      await api?.quickAccess?.configure?.(size);
      lastSizeRef.current = fingerprint;
    }
    return true;
  }, [menu]);

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  useEscapeKey(Boolean(menu), closeMenu);

  const moveDrawer = useCallback((open) => {
    window.clearTimeout(closeTimerRef.current);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    return desktop()?.quickAccess?.setOpen?.(open, reduceMotion);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (handleGlobalEscape(event)) return;
      event.preventDefault();
      moveDrawer(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveDrawer]);

  const closeEditor = useCallback(async () => {
    setEditingItem(null);
    await desktop()?.quickAccess?.setEditing?.(false);
    editingRef.current = false;
    await afterLayout();
    lastSizeRef.current = '';
    await measureAndConfigure();
  }, [measureAndConfigure]);

  const openEditor = useCallback(async (item) => {
    window.clearTimeout(closeTimerRef.current);
    editingRef.current = true;
    setMenu(null);
    try {
      const opened = await desktop()?.quickAccess?.setEditing?.(true);
      if (opened === false) {
        editingRef.current = false;
        return;
      }
      setEditingItem(item);
    } catch (error) {
      editingRef.current = false;
      console.error('Favorite editor failed to open:', error);
    }
  }, []);

  const requestOpen = useCallback(async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    try {
      await refreshItems();
      await afterLayout();
      await measureAndConfigure();
      await moveDrawer(true);
    } finally {
      openingRef.current = false;
    }
  }, [measureAndConfigure, moveDrawer, refreshItems]);

  useEffect(() => {
    if (!editingItem || !loaded) return;
    if (items.some((item) => item.id === editingItem.id)) return;
    closeEditor();
  }, [closeEditor, editingItem, items, loaded]);

  useEffect(() => {
    document.body.classList.add('quick-access-surface');
    const offRequest = desktop()?.quickAccess?.onOpenRequested?.(requestOpen);
    return () => {
      document.body.classList.remove('quick-access-surface');
      offRequest?.();
      window.clearTimeout(closeTimerRef.current);
      window.clearTimeout(feedbackTimerRef.current);
      if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    };
  }, [requestOpen]);

  useLayoutEffect(() => {
    if (!loaded) return undefined;
    measureAndConfigure();

    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(() => measureAndConfigure());
    observer.observe(panel);
    return () => observer.disconnect();
  }, [items, loaded, measureAndConfigure, menu]);

  const closeSoon = useCallback(() => {
    if (menu || editingItem) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => moveDrawer(false), 80);
  }, [editingItem, menu, moveDrawer]);

  const handleMenuKeyDown = (event) => {
    const buttons = [...(menuRef.current?.querySelectorAll('button') || [])];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    let next = current;
    if (event.key === 'ArrowDown') next = (current + 1) % buttons.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next]?.focus();
  };

  const flushHorizontalDrag = useCallback(() => {
    dragFrameRef.current = null;
    const drag = dragRef.current;
    if (!drag || drag.pending === 0) return;
    const delta = drag.pending;
    drag.pending = 0;
    dragQueueRef.current = dragQueueRef.current
      .then(() => desktop()?.quickAccess?.moveHorizontal?.(delta))
      .catch((error) => console.error('Drawer move failed:', error));
  }, []);

  const startHorizontalDrag = (event) => {
    if (event.button !== 0 || editingItem) return;
    window.clearTimeout(closeTimerRef.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.screenX,
      pending: 0,
    };
  };

  const moveHorizontalDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.pending += event.screenX - drag.lastX;
    drag.lastX = event.screenX;
    if (dragFrameRef.current === null) {
      dragFrameRef.current = requestAnimationFrame(flushHorizontalDrag);
    }
  };

  const finishHorizontalDrag = async (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    flushHorizontalDrag();
    dragRef.current = null;
    await dragQueueRef.current;
    await desktop()?.quickAccess?.commitPosition?.();
  };

  const copyItem = async (item) => {
    const type = classifyPayload(item.content);
    const api = desktop();
    const didCopy = type === 'image'
      ? await api?.clip?.writeImage?.(item.content, true)
      : type === 'file'
        ? await api?.clip?.writeFiles?.(parseFileReferences(item.content), true)
        : await api?.clip?.writeText?.(item.content, true);
    if (!didCopy) return;

    setCopiedId(item.id);
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(feedbackTimerRef.current);
    closeTimerRef.current = window.setTimeout(
      () => moveDrawer(false),
      COPY_FEEDBACK_MS,
    );
    feedbackTimerRef.current = window.setTimeout(() => setCopiedId(null), 900);
  };

  const openMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    window.clearTimeout(closeTimerRef.current);
    const menuWidth = 148;
    const menuHeight = 84;
    const maxX = window.innerWidth - menuWidth - 4;
    const maxY = Math.max(window.innerHeight, 96) - menuHeight - 4;
    setMenu({
      item,
      x: Math.max(4, Math.min(event.clientX, maxX)),
      y: Math.max(4, Math.min(event.clientY, maxY)),
    });
  };

  const labelFor = (item) => (
    favoriteLabel(item.label, item.content) || t('item.image')
  );

  const renderItem = (item) => {
    const label = labelFor(item);
    const copied = copiedId === item.id;
    const icon = resolveFavoriteIcon(item);
    const displayMode = normalizeFavoriteDisplayMode(item.displayMode);
    const showIcon = displayMode !== 'text';
    const showText = displayMode !== 'icon';

    return (
      <button
        key={item.id}
        type="button"
        className={`quick-drawer__item quick-drawer__item--display-${displayMode} ${copied ? 'is-copied' : ''}`}
        onClick={() => {
          if (menu) {
            setMenu(null);
            return;
          }
          copyItem(item);
        }}
        onContextMenu={(event) => openMenu(event, item)}
        aria-label={copied
          ? `${label}: ${t('quickAccess.copied')}`
          : t('quickAccess.copy', { label })}
        title={item.content}
      >
        {showIcon && (
          copied
            ? <FiCheck className="quick-drawer__check" aria-hidden="true" />
            : <FavoriteTypeIcon icon={icon} content={item.content} size={14} />
        )}
        {showText && <span className="quick-drawer__label">{label}</span>}
        {copied && !showIcon && <FiCheck className="quick-drawer__check quick-drawer__check--overlay" aria-hidden="true" />}
      </button>
    );
  };

  return (
    <>
      <aside
        ref={panelRef}
        className={`quick-drawer ${edgeVisible ? '' : 'quick-drawer--edge-hidden'}`.trim()}
        aria-label={t('quickAccess.title')}
        aria-hidden={editingItem ? true : undefined}
        inert={editingItem ? true : undefined}
        onPointerEnter={requestOpen}
        onPointerLeave={closeSoon}
      >
        <div className="quick-drawer__items">
          {loaded && rows.length === 0 && (
            <p className="quick-drawer__empty">{t('quickAccess.empty')}</p>
          )}
          {rows.map((row) => (
            <div
              key={`${row.type}-${row.items.map((item) => item.id).join('-')}`}
              className={`quick-drawer__row quick-drawer__row--${row.type}`}
            >
              {row.items.map(renderItem)}
            </div>
          ))}
        </div>
        <div
          className="quick-drawer__handle"
          aria-hidden="true"
          onPointerDown={startHorizontalDrag}
          onPointerMove={moveHorizontalDrag}
          onPointerUp={finishHorizontalDrag}
          onPointerCancel={finishHorizontalDrag}
        >
          <span />
        </div>
        <span className="sr-only" aria-live="polite">
          {copiedId ? t('quickAccess.copied') : ''}
        </span>

        {menu && (
          <div
            ref={menuRef}
            className="quick-drawer__menu"
            style={{ left: menu.x, top: menu.y }}
            role="menu"
            aria-label={t('quickAccess.actions')}
            onKeyDown={handleMenuKeyDown}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => openEditor(menu.item)}
            >
              {t('frequent.edit')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={async () => {
                const id = menu.item.id;
                setMenu(null);
                await deleteItem(id);
              }}
            >
              {t('frequent.delete')}
            </button>
          </div>
        )}
      </aside>

      {editingItem && (
        <FrequentEditModal
          item={editingItem}
          onSave={updateItem}
          onClose={closeEditor}
        />
      )}
    </>
  );
}

export default function QuickAccessSurface() {
  const [language, setLanguage] = useState(null);
  const [edgeVisible, setEdgeVisible] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await desktop()?.settings?.get?.();
      await appearance.applyTheme(settings?.theme || appearance.getCurrentTheme());
      if (!active) return;
      setLanguage(settings?.language || 'ru');
      setEdgeVisible(settings?.showQuickAccessEdge !== false);
    })().catch(() => {
      if (active) setLanguage('ru');
    });

    const syncLanguage = (event) => {
      if (event.key === 'copyboard.language' || event.key === 'appLanguage') {
        setLanguage(event.newValue || 'ru');
      }
    };
    const syncEdge = async () => {
      try {
        const visible = await desktop()?.quickAccess?.getEdgeVisible?.();
        if (active && typeof visible === 'boolean') setEdgeVisible(visible);
      } catch (error) {
        console.error('Drawer edge visibility synchronization failed:', error);
      }
    };
    const offEdge = desktop()?.quickAccess?.onEdgeVisibleChange?.((visible) => {
      setEdgeVisible(visible !== false);
    }, syncEdge);
    window.addEventListener('storage', syncLanguage);
    return () => {
      active = false;
      offEdge?.();
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  if (!language) return null;
  return (
    <LanguageProvider initialLanguage={language}>
      <QuickAccessDrawer edgeVisible={edgeVisible} />
    </LanguageProvider>
  );
}
