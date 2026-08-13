import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useFrequentItems } from '../hooks/useFrequentItems';
import { favoriteLabel } from '../utils/clipboardUtils';
import { desktop } from '../utils/desktop';
import { resolveFavoriteIcon } from '../utils/favoriteIcons';
import { LanguageProvider, useLanguage } from '../utils/i18n';
import { appearance } from '../utils/appearance';
import FavoriteTypeIcon from './FavoriteTypeIcon';
import '../scss/QuickAccessDrawer.scss';

const COPY_FEEDBACK_MS = 240;

function QuickAccessDrawer() {
  const { t } = useLanguage();
  const { items, loaded } = useFrequentItems();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const closeTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const moveDrawer = useCallback((open) => {
    window.clearTimeout(closeTimerRef.current);
    setIsOpen(open);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    desktop()?.quickAccess?.setOpen?.(open, reduceMotion);
  }, []);

  useEffect(() => {
    document.body.classList.add('quick-access-surface');
    desktop()?.quickAccess?.ready?.();
    return () => {
      document.body.classList.remove('quick-access-surface');
      window.clearTimeout(closeTimerRef.current);
      window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

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

  return (
    <aside
      className={`quick-drawer ${isOpen ? 'is-open' : ''}`}
      aria-label={t('quickAccess.title')}
      onPointerEnter={() => moveDrawer(true)}
      onPointerLeave={closeSoon}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        moveDrawer(false);
      }}
    >
      <div className="quick-drawer__content">
        <header className="quick-drawer__header">
          <div>
            <span className="quick-drawer__eyebrow">CopyBoard</span>
            <h1>{t('quickAccess.title')}</h1>
          </div>
          <p>{t('quickAccess.hint')}</p>
        </header>

        <div className="quick-drawer__items" aria-live="polite">
          {loaded && items.length === 0 && (
            <p className="quick-drawer__empty">{t('quickAccess.empty')}</p>
          )}
          {items.map((item) => {
            const label = labelFor(item);
            const copied = copiedId === item.id;
            const icon = resolveFavoriteIcon(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`quick-drawer__item quick-drawer__item--${icon} ${copied ? 'is-copied' : ''}`}
                onClick={() => copyItem(item)}
                aria-label={copied
                  ? t('quickAccess.copied')
                  : t('quickAccess.copy', { label })}
                title={item.content}
              >
                <span className="quick-drawer__item-icon">
                  {copied
                    ? <FiCheck aria-hidden="true" />
                    : <FavoriteTypeIcon icon={icon} content={item.content} size={18} />}
                </span>
                <span className="quick-drawer__item-label">{label}</span>
                {copied && <span className="quick-drawer__item-state">{t('quickAccess.copied')}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="quick-drawer__handle" aria-hidden="true"><span /></div>
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
