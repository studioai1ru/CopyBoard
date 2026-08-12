import { useState } from 'react';
import { FiCheck, FiCopy, FiEdit2, FiStar, FiTrash2 } from 'react-icons/fi';
import { useLanguage } from '../utils/i18n';
import { getTypeIconMeta } from '../utils/typeIconMeta';
import ImagePreviewModal from './ImagePreviewModal';
import '../scss/ClipboardItem.scss';

const ClipboardItem = ({
  item,
  index,
  onDelete,
  onCopy,
  onEdit,
  onAddFavorite,
  isFavorite = false,
  viewMode,
}) => {
  const { t, formatRelativeTime } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const type = ['text', 'code', 'image'].includes(item.type) ? item.type : 'text';
  const typeMeta = getTypeIconMeta(type);
  const TypeIcon = typeMeta.Icon;
  const typeLabel = t(`item.${type}`);
  const ordinal = index + 1;
  const showActionText = viewMode === 'grid';
  const actionCount = type === 'image' ? 3 : 4;

  const actionName = (key) => `${t(key)} · ${typeLabel} ${ordinal}`;

  const copyEntry = async () => {
    try {
      await onCopy(item.content, type);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopied(false);
    }
  };

  const preview = (() => {
    if (type === 'image') {
      return (
        <button
          type="button"
          className="clip-card__image"
          onClick={() => setPreviewOpen(true)}
          aria-label={actionName('item.openImage')}
          title={t('item.openImage')}
        >
          <img src={item.content} alt={typeLabel} loading="lazy" />
        </button>
      );
    }

    const content = viewMode === 'list' ? item.content : (item.preview || item.content);
    if (type === 'code') {
      return <pre className="clip-card__code"><code>{content}</code></pre>;
    }

    return <p className="clip-card__text">{content}</p>;
  })();

  return (
    <article
      className={`clip-card clip-card--${type} clip-card--${viewMode}`}
      style={{ '--entry-accent': typeMeta.bg, '--entry-accent-text': typeMeta.fg }}
    >
      <header className="clip-card__header">
        <span className="clip-card__type">
          <TypeIcon aria-hidden="true" />
          <span>{typeLabel}</span>
        </span>
        <time dateTime={item.timestamp}>{formatRelativeTime(item.timestamp)}</time>
        <span className="clip-card__number" aria-hidden="true">{String(ordinal).padStart(2, '0')}</span>
      </header>

      <div className="clip-card__preview">{preview}</div>

      <footer className="clip-card__actions" data-action-count={actionCount}>
        <button
          type="button"
          className={copied ? 'is-success' : ''}
          onClick={copyEntry}
          disabled={copied}
          aria-label={actionName(copied ? 'item.copied' : 'item.copy')}
          title={copied ? t('item.copied') : t('item.copy')}
        >
          {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
          {showActionText && <span className="clip-card__action-label">{copied ? t('item.copied') : t('item.copy')}</span>}
        </button>

        {type !== 'image' && (
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label={actionName('item.edit')}
            title={t('item.edit')}
          >
            <FiEdit2 aria-hidden="true" />
            {showActionText && <span className="clip-card__action-label">{t('item.edit')}</span>}
          </button>
        )}

        <button
          type="button"
          className={isFavorite ? 'is-favorite' : ''}
          onClick={() => onAddFavorite?.(item)}
          aria-pressed={isFavorite}
          aria-label={actionName(isFavorite ? 'item.removeFavorite' : 'item.addFavorite')}
          title={isFavorite ? t('item.removeFavorite') : t('item.addFavorite')}
        >
          <FiStar aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
          {showActionText && <span className="clip-card__action-label">{isFavorite ? t('item.inFavorites') : t('item.addFavorite')}</span>}
        </button>

        <button
          type="button"
          className="is-danger"
          onClick={() => onDelete(item.id)}
          aria-label={actionName('item.delete')}
          title={t('item.delete')}
        >
          <FiTrash2 aria-hidden="true" />
          {showActionText && <span className="clip-card__action-label">{t('item.delete')}</span>}
        </button>
      </footer>

      {previewOpen && <ImagePreviewModal src={item.content} onClose={() => setPreviewOpen(false)} />}
    </article>
  );
};

export default ClipboardItem;
