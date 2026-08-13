import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useFrequentItems } from '../hooks/useFrequentItems';
import { favoriteLabel } from '../utils/clipboardUtils';
import { desktop } from '../utils/desktop';
import {
  normalizeFavoriteDisplayMode,
  resolveFavoriteIcon,
} from '../utils/favoriteIcons';
import { clampQuickAccessSize, groupQuickAccessItems } from '../utils/quickAccessLayout';
import { LanguageProvider, useLanguage } from '../utils/i18n';
import { appearance } from '../utils/appearance';
import FavoriteTypeIcon from './FavoriteTypeIcon';
import '../scss/QuickAccessDrawer.scss';

const COPY_FEEDBACK_MS = 240;

const afterLayout = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

function QuickAccessDrawer() {
  const { t } = useLanguage();
  const { items, loaded, refreshItems } = useFrequentItems();
  const [copiedId, setCopiedId] = useState(null);
  const panelRef = useRef(null);
  const closeTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const openingRef = useRef(false);
  const readyRef = useRef(false);
  const lastSizeRef = useRef('');
  const rows = useMemo(() => groupQuickAccessItems(items), [items]);

  const measureAndConfigure = useCallback(async () => {
    const panel = panelRef.current;
    if (!panel) return false;

    const bounds = panel.getBoundingClientRect();
    const size = clampQuickAccessSize(bounds.width, bounds.height);
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
  }, []);

  const moveDrawer = useCallback((open) => {
    window.clearTimeout(closeTimerRef.current);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    return desktop()?.quickAccess?.setOpen?.(open, reduceMotion);
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
    document.body.classList.add('quick-access-surface');
    const offRequest = desktop()?.quickAccess?.onOpenRequested?.(requestOpen);
    return () => {
      document.body.classList.remove('quick-access-surface');
      offRequest?.();
      window.clearTimeout(closeTimerRef.current);
      window.clearTimeout(feedbackTimerRef.current);
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
  }, [items, loaded, measureAndConfigure]);

  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => moveDrawer(false), 80);
  }, [moveDrawer]);

  const copyItem = async (item) => {
    const type = item.content?.startsWith('data:image/') ? 'image' : 'text';
    const api = desktop();
    const didCopy = type === 'image'
      ? await api?.clip?.writeImage?.(item.content, true)
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
        onClick={() => copyItem(item)}
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
    <aside
      ref={panelRef}
      className="quick-drawer"
      aria-label={t('quickAccess.title')}
      onPointerEnter={requestOpen}
      onPointerLeave={closeSoon}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        moveDrawer(false);
      }}
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
      <div className="quick-drawer__handle" aria-hidden="true"><span /></div>
      <span className="sr-only" aria-live="polite">
        {copiedId ? t('quickAccess.copied') : ''}
      </span>
    </aside>
  );
}

export default function QuickAccessSurface() {
  const [language, setLanguage] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await desktop()?.settings?.get?.();
      await appearance.applyTheme(settings?.theme || appearance.getCurrentTheme());
      if (active) setLanguage(settings?.language || 'ru');
    })().catch(() => {
      if (active) setLanguage('ru');
    });

    const syncLanguage = (event) => {
      if (event.key === 'copyboard.language' || event.key === 'appLanguage') {
        setLanguage(event.newValue || 'ru');
      }
    };
    window.addEventListener('storage', syncLanguage);
    return () => {
      active = false;
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  if (!language) return null;
  return (
    <LanguageProvider initialLanguage={language}>
      <QuickAccessDrawer />
    </LanguageProvider>
  );
}
