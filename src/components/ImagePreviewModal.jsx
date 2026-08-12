import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../utils/i18n';
import { useEscapeKey } from '../hooks/useEscapeKey';
import '../scss/ImagePreviewModal.scss';

const ImagePreviewModal = ({ src, onClose }) => {
  const { t } = useLanguage();

  useEscapeKey(Boolean(src), onClose);

  useEffect(() => {
    if (!src) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [src]);

  if (!src) return null;

  return createPortal(
    <div
      className="image-preview-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('item.image')}
    >
      <button
        type="button"
        className="image-preview-overlay__close"
        onClick={onClose}
        aria-label={t('settings.cancel')}
      >
        ×
      </button>
      <div
        className="image-preview-overlay__content"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={src} alt={t('item.image')} />
      </div>
    </div>,
    document.body,
  );
};

export default ImagePreviewModal;
