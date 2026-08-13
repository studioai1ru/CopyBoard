import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../utils/i18n';
import { classifyPayload, favoriteLabel } from '../utils/clipboardUtils';
import {
  normalizeFavoriteDisplayMode,
  resolveFavoriteIcon,
} from '../utils/favoriteIcons';
import { useEscapeKey } from '../hooks/useEscapeKey';
import FavoriteTypeIcon from './FavoriteTypeIcon';
import '../scss/FrequentPanel.scss';

const rowsNeeded = (widths, gap, trackWidth) => {
  let rows = 1;
  let used = 0;

  for (const width of widths) {
    if (used === 0 || used + gap + width <= trackWidth) {
      used = used === 0 ? width : used + gap + width;
    } else {
      rows += 1;
      used = width;
    }
  }

  return rows;
};

const resolveTrackWidth = (widths, gap, availableWidth) => {
  if (!widths.length || availableWidth <= 0) return availableWidth;

  const fullWidth = widths.reduce((sum, width) => sum + width, 0)
    + gap * Math.max(0, widths.length - 1);
  if (fullWidth <= availableWidth) return availableWidth;

  let low = availableWidth;
  let high = Math.max(availableWidth, fullWidth);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (rowsNeeded(widths, gap, middle) <= 2) high = middle;
    else low = middle + 1;
  }

  return low;
};

const DRAG_THRESHOLD_PX = 8;

const favoriteIdFromPoint = (x, y) => {
  const node = document.elementFromPoint(x, y);
  return node?.closest?.('[data-favorite-id]')?.getAttribute('data-favorite-id') || null;
};

const FrequentPanel = ({ items, onCopy, onEdit, onDelete, onReorder }) => {
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState(null);
  const [menu, setMenu] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [trackWidth, setTrackWidth] = useState(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const trackRef = useRef(null);
  const pointerDragRef = useRef(null);
  const dragOverIdRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

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

  useLayoutEffect(() => {
    const list = listRef.current;
    const track = trackRef.current;
    if (!list || !track || !items.length) {
      setTrackWidth(null);
      return undefined;
    }

    let frameId = 0;
    const measure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const availableWidth = Math.floor(list.clientWidth);
        const chips = [...track.querySelectorAll('.frequent-chip')];
        const widths = chips.map((chip) => Math.ceil(chip.getBoundingClientRect().width));
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        const nextWidth = Math.ceil(resolveTrackWidth(widths, gap, availableWidth));

        setTrackWidth((current) => (current === nextWidth ? current : nextWidth));
        const maxScrollLeft = Math.max(0, nextWidth - availableWidth);
        if (list.scrollLeft > maxScrollLeft) list.scrollLeft = maxScrollLeft;
      });
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(list);
    measure();
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [items]);

  if (!items.length) return null;

  const isImageItem = (item) => item.content?.startsWith('data:image/');

  const handleCopy = async (item) => {
    const type = classifyPayload(item.content);
    const didCopy = await onCopy(
      item.content,
      type,
      { recordHistory: true },
    );
    if (!didCopy) return;
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

  const finishDrag = () => {
    pointerDragRef.current = null;
    dragOverIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleWheel = (event) => {
    if (event.ctrlKey) return;
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    event.preventDefault();
    list.scrollLeft += event.deltaY;
  };

  const setHoverTarget = (nextId) => {
    if (dragOverIdRef.current === nextId) return;
    dragOverIdRef.current = nextId;
    setDragOverId(nextId);
  };

  const handlePointerDown = (event, item) => {
    if (event.button !== 0) return;
    pointerDragRef.current = {
      id: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event, item) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.id !== item.id || drag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active) {
      if (distance < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setDraggedId(item.id);
    }

    const overId = favoriteIdFromPoint(event.clientX, event.clientY);
    setHoverTarget(overId && overId !== item.id ? overId : null);
  };

  const handlePointerUp = async (event, item) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.id !== item.id || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.active) {
      suppressClickUntilRef.current = performance.now() + 400;
      const targetId = favoriteIdFromPoint(event.clientX, event.clientY);
      if (targetId && targetId !== drag.id) {
        await onReorder?.(drag.id, targetId);
      } else if (!targetId) {
        const list = listRef.current?.getBoundingClientRect();
        const insideList = Boolean(
          list
          && event.clientX >= list.left
          && event.clientX <= list.right
          && event.clientY >= list.top
          && event.clientY <= list.bottom,
        );
        if (insideList) await onReorder?.(drag.id, null);
      }
    }

    finishDrag();
  };

  const handleReorderKeyDown = (event, item, index) => {
    if (!event.altKey || !event.key.startsWith('Arrow')) return;

    let targetIndex = index;
    if (event.key === 'ArrowLeft') targetIndex -= 1;
    if (event.key === 'ArrowRight') targetIndex += 1;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const chips = [...(trackRef.current?.querySelectorAll('.frequent-chip') || [])];
      const currentRect = chips[index]?.getBoundingClientRect();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      const candidates = chips
        .map((chip, candidateIndex) => ({ candidateIndex, rect: chip.getBoundingClientRect() }))
        .filter(({ rect }) => currentRect && (rect.top - currentRect.top) * direction > 10)
        .sort((a, b) => (
          Math.abs((a.rect.left + a.rect.width / 2) - (currentRect.left + currentRect.width / 2))
          - Math.abs((b.rect.left + b.rect.width / 2) - (currentRect.left + currentRect.width / 2))
        ));
      if (candidates.length) targetIndex = candidates[0].candidateIndex;
    }

    if (targetIndex === index || targetIndex < 0 || targetIndex >= items.length) return;
    event.preventDefault();
    event.stopPropagation();
    onReorder?.(item.id, items[targetIndex].id);
  };

  const displayLabel = (item) => {
    const custom = favoriteLabel(item.label, item.content);
    if (custom) return custom;
    if (isImageItem(item)) return t('item.image');
    return '…';
  };

  const renderItem = (item, index) => {
    const iconId = resolveFavoriteIcon(item);
    const displayMode = normalizeFavoriteDisplayMode(item.displayMode);
    const showIcon = displayMode !== 'text';
    const showText = displayMode !== 'icon';
    const label = displayLabel(item);

    return (
      <button
        key={item.id}
        type="button"
        data-favorite-id={item.id}
        className={`frequent-chip frequent-chip--${iconId} frequent-chip--display-${displayMode} ${copiedId === item.id ? 'copied' : ''} ${draggedId === item.id ? 'is-dragging' : ''} ${dragOverId === item.id ? 'is-drag-over' : ''}`}
        aria-label={label}
        aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
        onClick={() => {
          if (performance.now() < suppressClickUntilRef.current) return;
          handleCopy(item);
        }}
        onContextMenu={(event) => openMenu(event, item)}
        onKeyDown={(event) => handleReorderKeyDown(event, item, index)}
        onPointerDown={(event) => handlePointerDown(event, item)}
        onPointerMove={(event) => handlePointerMove(event, item)}
        onPointerUp={(event) => handlePointerUp(event, item)}
        onPointerCancel={finishDrag}
        title={isImageItem(item) ? label : item.content}
      >
        {showIcon && <FavoriteTypeIcon icon={iconId} content={item.content} size={14} />}
        {showText && <span className="frequent-chip__label">{label}</span>}
      </button>
    );
  };

  return (
    <section className="frequent-panel" aria-label={t('frequent.title')}>
      <div
        ref={listRef}
        className="frequent-panel__list"
        onWheel={handleWheel}
      >
        <div
          ref={trackRef}
          className="frequent-panel__track"
          style={trackWidth ? { width: `${trackWidth}px` } : undefined}
        >
          {items.map(renderItem)}
        </div>
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
