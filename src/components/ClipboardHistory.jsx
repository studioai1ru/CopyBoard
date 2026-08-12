import ClipboardItem from './ClipboardItem';
import { useLanguage } from '../utils/i18n';
import '../scss/ClipboardHistory.scss';

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

  if (items.length === 0) {
    return (
      <section className="clipboard-board clipboard-board--empty" aria-live="polite">
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
    <section className={`clipboard-board clipboard-board--${viewMode}`}>
      <div className="container">
        <ol className="clipboard-board__entries" role="list">
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
