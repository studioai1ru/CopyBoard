import { useMemo } from 'react';
import {
  IoCloseOutline,
  IoGridOutline,
  IoListOutline,
  IoSearchOutline,
  IoSettingsOutline,
} from 'react-icons/io5';
import { useLanguage } from '../utils/i18n';
import '../scss/Header.scss';

const FILTERS = ['all', 'text', 'image', 'code'];

const Header = ({
  filter,
  setFilter,
  clearHistory,
  totalItems,
  typeCounts = { text: 0, image: 0, code: 0 },
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onOpenSettings,
  searchInputRef,
}) => {
  const { t } = useLanguage();

  const filters = useMemo(() => FILTERS.map((value) => ({
    value,
    label: t(`filter.${value === 'image' ? 'images' : value}`),
    count: value === 'all' ? totalItems : (typeCounts[value] || 0),
  })), [t, totalItems, typeCounts]);

  const nextViewLabel = viewMode === 'list' ? t('header.viewGrid') : t('header.viewList');

  return (
    <header className="workspace-header">
      <div className="workspace-header__primary container">
        <div className="workspace-heading">
          <h1>{t('app.title')}</h1>
          <span className="workspace-heading__count">
            <strong>{totalItems}</strong> {t('header.items', { count: totalItems })}
          </span>
        </div>

        <label className="history-search">
          <span className="sr-only">{t('header.searchPlaceholder')}</span>
          <IoSearchOutline aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            placeholder={t('header.searchPlaceholder')}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="history-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label={t('header.clearSearch')}
              title={t('header.clearSearch')}
            >
              <IoCloseOutline aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="workspace-header__actions">
          <button
            type="button"
            className="square-action"
            onClick={() => setViewMode((current) => (current === 'grid' ? 'list' : 'grid'))}
            aria-label={nextViewLabel}
            title={nextViewLabel}
          >
            {viewMode === 'list' ? <IoGridOutline aria-hidden="true" /> : <IoListOutline aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="square-action"
            onClick={onOpenSettings}
            aria-label={t('header.settings')}
            title={t('header.settings')}
          >
            <IoSettingsOutline aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="workspace-header__secondary container">
        <nav className="content-filters" aria-label={t('header.filter')}>
          {filters.map((option) => (
            <button
              type="button"
              key={option.value}
              className="content-filter"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              <span>{option.label}</span>
              <span className="content-filter__count">{option.count}</span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="clear-history-action"
          onClick={clearHistory}
          disabled={totalItems === 0}
        >
          <IoCloseOutline aria-hidden="true" />
          <span>{t('header.clearAll')}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
