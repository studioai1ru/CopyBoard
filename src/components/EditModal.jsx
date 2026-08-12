import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../utils/i18n';
import '../scss/EditModal.scss';

const EditModal = ({ item, onSave, onCancel }) => {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(item.content);

  useEffect(() => {
    setDraft(item.content);
  }, [item]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    onSave(item.id, draft);
  };

  const handleCancel = (event) => {
    event.preventDefault();
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className="editor-dialog"
      aria-labelledby="editor-dialog-title"
      onCancel={handleCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form className="editor-dialog__surface" onSubmit={submit}>
        <header className="editor-dialog__header">
          <h2 id="editor-dialog-title">{t('edit.title')}</h2>
          <button type="button" className="dialog-close" onClick={onCancel} aria-label={t('edit.cancel')}>
            ×
          </button>
        </header>

        <div className="editor-dialog__content">
          <label className="sr-only" htmlFor="clipboard-entry-editor">{t('edit.title')}</label>
          <textarea
            id="clipboard-entry-editor"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            autoFocus
            rows={item.type === 'code' ? 18 : 9}
          />
        </div>

        <footer className="editor-dialog__footer">
          <p className="editor-dialog__hint">
            <kbd>Ctrl+Enter</kbd> {t('edit.shortcuts.save')}
          </p>
          <div className="editor-dialog__actions">
            <button type="button" className="secondary-action" onClick={onCancel}>
              {t('edit.cancel')}
            </button>
            <button type="submit" className="primary-action">
              {t('edit.save')}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
};

export default EditModal;
