import { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../utils/i18n';
import { favoriteLabel } from '../utils/clipboardUtils';
import { resolveFavoriteIcon } from '../utils/favoriteIcons';
import { useEscapeKey } from '../hooks/useEscapeKey';
import FavoriteTypeIcon from './FavoriteTypeIcon';
import '../scss/FrequentPanel.scss';

const FrequentPanel = ({ items, onCopy, onEdit, onDelete }) => {
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState(null);
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  useEscapeKey(Boolean(menu), closeMenu);

  useEffect(() => {
    if (!menu) return undefined;

    const close = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setMenu(null);
    };

    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, [menu]);

  if (!items.length) return null;

  const isImageItem = (item) => item.content?.startsWith('data:image/');

  const handleCopy = async (item) => {
    await onCopy(item.content, isImageItem(item) ? 'image' : 'text');
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const openMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      item,
      x: Math.min(event.clientX, window.innerWidth - 160),
      y: Math.min(event.clientY, window.innerHeight - 90),
    });
  };

  const displayLabel = (item) => {
    const custom = favoriteLabel(item.label, item.content);
    if (custom) return custom;
    if (isImageItem(item)) return t('item.image');
    return '…';
  };

  return (
    <section className="frequent-panel">
      <div className="frequent-panel__list">
        {items.map((item) => {
          const iconId = resolveFavoriteIcon(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`frequent-chip frequent-chip--${iconId} ${copiedId === item.id ? 'copied' : ''}`}
              onClick={() => handleCopy(item)}
              onContextMenu={(event) => openMenu(event, item)}
              title={isImageItem(item) ? displayLabel(item) : item.content}
            >
              <FavoriteTypeIcon icon={iconId} content={item.content} size={14} />
              <span className="frequent-chip__label">{displayLabel(item)}</span>
            </button>
          );
        })}
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="frequent-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEdit(menu.item);
              setMenu(null);
            }}
          >
            {t('frequent.edit')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              onDelete(menu.item.id);
              setMenu(null);
            }}
          >
            {t('frequent.delete')}
          </button>
        </div>
      )}
    </section>
  );
};

export default FrequentPanel;
