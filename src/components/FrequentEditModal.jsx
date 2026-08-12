import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../utils/i18n';
import ImagePreviewModal from './ImagePreviewModal';
import FavoriteTypeIcon from './FavoriteTypeIcon';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  resolveFavoriteIcon,
  selectableFavoriteIcons,
} from '../utils/favoriteIcons';
import '../scss/FrequentManageModal.scss';

const FrequentEditModal = ({ item, onSave, onClose }) => {
  const { t } = useLanguage();
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('text');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!item) return;
    setLabel(item.label || '');
    setContent(item.content || '');
    setIcon(resolveFavoriteIcon(item));
    setPreviewOpen(false);
    setIconPickerOpen(false);
  }, [item]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const closeIconPicker = useCallback(() => {
    setIconPickerOpen(false);
  }, []);

  useEscapeKey(iconPickerOpen && !previewOpen, closeIconPicker);
  useEscapeKey(Boolean(item) && !previewOpen && !iconPickerOpen, handleClose);

  useEffect(() => {
    if (!iconPickerOpen) return undefined;

    const onPointerDown = (event) => {
      if (pickerRef.current?.contains(event.target)) return;
      setIconPickerOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [iconPickerOpen]);

  if (!item) return null;

  const isImage = item.content?.startsWith('data:image/');
  const bodyForIcon = isImage ? item.content : content;
  const iconChoices = selectableFavoriteIcons(bodyForIcon);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await onSave(item.id, label, isImage ? item.content : content, icon);
    if (ok) onClose();
  };

  return (
    <>
      <div className="frequent-modal-overlay" onClick={onClose}>
        <div
          className={`frequent-modal frequent-modal--edit ${isImage ? 'frequent-modal--image' : ''}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={t('frequent.editTitle')}
        >
          <form className="frequent-modal__form" onSubmit={handleSubmit}>
            <div className="frequent-modal__body">
              <label>
                <span>{t('frequent.labelField')}</span>
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={t('frequent.labelPlaceholder')}
                  maxLength={40}
                  autoFocus
                />
              </label>

              {isImage ? (
                <div className="frequent-modal__image-block">
                  <span className="frequent-modal__field-label">{t('item.image')}</span>
                  <button
                    type="button"
                    className="frequent-modal__image-preview"
                    onClick={() => setPreviewOpen(true)}
                    title={t('item.openImage')}
                    aria-label={t('item.openImage')}
                  >
                    <img src={item.content} alt={t('item.image')} />
                    <span className="frequent-modal__image-hint">{t('frequent.openFullscreen')}</span>
                  </button>
                </div>
              ) : (
                <label className="frequent-modal__content-field">
                  <span>{t('frequent.contentField')}</span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={t('frequent.contentPlaceholder')}
                    rows={4}
                    required
                  />
                </label>
              )}
            </div>

            <div className="frequent-modal__actions">
              <div className="frequent-modal__icon-picker" ref={pickerRef}>
                <button
                  type="button"
                  className="frequent-modal__icon-trigger"
                  onClick={() => setIconPickerOpen((open) => !open)}
                  aria-label={t('frequent.icons.choose')}
                  aria-expanded={iconPickerOpen}
                  title={t(`frequent.icons.${icon}`)}
                  disabled={iconChoices.length <= 1}
                >
                  <FavoriteTypeIcon icon={icon} content={bodyForIcon} size={14} />
                </button>

                {iconPickerOpen && (
                  <div className="frequent-modal__icon-menu" role="listbox" aria-label={t('frequent.icons.choose')}>
                    {iconChoices.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={icon === id}
                        className={`frequent-modal__icon-option ${icon === id ? 'is-active' : ''}`}
                        title={t(`frequent.icons.${id}`)}
                        onClick={() => {
                          setIcon(id);
                          setIconPickerOpen(false);
                        }}
                      >
                        <FavoriteTypeIcon icon={id} size={14} />
                        <span>{t(`frequent.icons.${id}`)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="frequent-modal__action-btns">
                <button type="button" className="secondary-btn" onClick={onClose}>
                  {t('frequent.cancelEdit')}
                </button>
                <button type="submit" className="primary-btn">
                  {t('frequent.saveItem')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {previewOpen && (
        <ImagePreviewModal src={item.content} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
};

export default FrequentEditModal;
