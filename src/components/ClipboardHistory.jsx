import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ClipboardItem from './ClipboardItem';
import { useLanguage } from '../utils/i18n';
import '../scss/ClipboardHistory.scss';

const GRID_COLUMNS_KEY = 'copyboard.gridColumns';
const GRID_MIN_COLUMNS = 2;
const GRID_MAX_COLUMNS = 5;
const GRID_MIN_CARD_WIDTH = 230;
const GRID_GAP = 16;

const readPreferredColumns = () => {
  try {
    const value = Number(localStorage.getItem(GRID_COLUMNS_KEY));
    return Math.min(GRID_MAX_COLUMNS, Math.max(GRID_MIN_COLUMNS, value || 3));
  } catch {
    return 3;
  }
};

const ClipboardHistory = ({
  items,
  onDelete,
  onCopy,
  onEdit,
  onAddFavorite,
  favoriteContents,
  viewMode,
  searchQuery,
}) => {
  const { t } = useLanguage();
  const [preferredColumns, setPreferredColumns] = useState(readPreferredColumns);
  const [gridWidth, setGridWidth] = useState(0);
  const boardRef = useRef(null);
  const entriesRef = useRef(null);
  const lastScaleAtRef = useRef(0);

  useLayoutEffect(() => {
    const entries = entriesRef.current;
    if (!entries || viewMode !== 'grid') return undefined;

    const measure = () => setGridWidth(Math.floor(entries.clientWidth));
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(entries);
    measure();
    return () => resizeObserver.disconnect();
  }, [items.length, viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(GRID_COLUMNS_KEY, String(preferredColumns));
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, [preferredColumns]);

  const columnsAllowedByWidth = useMemo(() => {
    if (!gridWidth) return 3;
    return Math.min(
      GRID_MAX_COLUMNS,
      Math.max(
        GRID_MIN_COLUMNS,
        Math.floor((gridWidth + GRID_GAP) / (GRID_MIN_CARD_WIDTH + GRID_GAP)),
      ),
    );
  }, [gridWidth]);

  const effectiveColumns = useMemo(() => (
    Math.min(preferredColumns, columnsAllowedByWidth)
  ), [columnsAllowedByWidth, preferredColumns]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || viewMode !== 'grid') return undefined;

    const handleScaleWheel = (event) => {
      if (!event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();

      const now = performance.now();
      if (now - lastScaleAtRef.current < 90) return;
      lastScaleAtRef.current = now;

      const direction = event.deltaY > 0 ? 1 : -1;
      setPreferredColumns(Math.min(
        columnsAllowedByWidth,
        Math.max(GRID_MIN_COLUMNS, effectiveColumns + direction),
      ));
    };

    board.addEventListener('wheel', handleScaleWheel, { passive: false });
    return () => board.removeEventListener('wheel', handleScaleWheel);
  }, [columnsAllowedByWidth, effectiveColumns, viewMode]);

  if (items.length === 0) {
    return (
      <section ref={boardRef} className="clipboard-board clipboard-board--empty" aria-live="polite">
        <div className="empty-message">
          <div className="empty-message__glyph" aria-hidden="true">
            <span />
          </div>
          <h2>{searchQuery ? t('empty.titleSearch') : t('empty.title')}</h2>
          <p>
            {searchQuery
              ? t('empty.descriptionSearch', { query: searchQuery })
              : t('empty.description')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={boardRef} className={`clipboard-board clipboard-board--${viewMode}`}>
      <div className="container">
        <ol
          ref={entriesRef}
          className="clipboard-board__entries"
          role="list"
          style={viewMode === 'grid' ? { '--clipboard-grid-columns': effectiveColumns } : undefined}
        >
          {items.map((item, index) => (
            <li className="clipboard-board__slot" key={item.id}>
              <ClipboardItem
                item={item}
                index={index}
                onDelete={onDelete}
                onCopy={onCopy}
                onEdit={onEdit}
                onAddFavorite={onAddFavorite}
                isFavorite={favoriteContents?.has(item.content)}
                viewMode={viewMode}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default ClipboardHistory;
