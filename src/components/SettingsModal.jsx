import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../utils/i18n';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { desktop } from '../utils/desktop';
import '../scss/SettingsModal.scss';

function SelectField({ id, label, value, onChange, children }) {
  return (
    <div className="preference-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  );
}

function ChoiceGroup({ legend, name, value, onChange, options }) {
  return (
    <fieldset className="preference-choice">
      <legend>{legend}</legend>
      <div className="preference-choice__options">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ checked, disabled = false, label, onChange }) {
  return (
    <label className="preference-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" className="preference-toggle__track"><span /></span>
      <span>{label}</span>
    </label>
  );
}

const SettingsModal = ({
  open,
  onDismiss,
  onClearHistory,
  onRestoreDefaults,
  preferences,
}) => {
  const { t, language, setLanguage: setRuntimeLanguage, getSupportedLanguages } = useLanguage();
  const { current, change } = preferences;
  const dialogRef = useRef(null);
  const clearTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => () => {
    window.clearTimeout(clearTimerRef.current);
    window.clearTimeout(resetTimerRef.current);
  }, []);

  const disarmConfirmations = () => {
    setConfirmClear(false);
    setConfirmReset(false);
  };

  const requestClose = () => {
    if (confirmClear || confirmReset) {
      disarmConfirmations();
      return;
    }
    onDismiss();
  };

  useEscapeKey(open, requestClose);

  const armConfirmation = (kind) => {
    const isClear = kind === 'clear';
    const setArmed = isClear ? setConfirmClear : setConfirmReset;
    const timerRef = isClear ? clearTimerRef : resetTimerRef;

    setConfirmClear(isClear);
    setConfirmReset(!isClear);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setArmed(false), 3000);
  };

  const changeLanguage = async (nextLanguage) => {
    if (nextLanguage === language) return;
    const changed = await setRuntimeLanguage(nextLanguage);
    if (changed) change.language(nextLanguage);
  };

  const changeAutoStart = async (enabled) => {
    setAutoStartLoading(true);
    try {
      const api = desktop();
      const changed = api?.settings?.setAutoStart
        ? await api.settings.setAutoStart(enabled)
        : true;
      if (changed) change.autoStart(enabled);
    } catch {
      window.alert(t('settings.errors.autoStartFailed'));
    } finally {
      setAutoStartLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="preferences-dialog"
      aria-labelledby="preferences-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="preferences-dialog__surface">
        <header className="preferences-dialog__header">
          <div>
            <span className="preferences-dialog__eyebrow">CopyBoard</span>
            <h2 id="preferences-title">{t('settings.title')}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={requestClose} aria-label={t('settings.cancel')}>
            ×
          </button>
        </header>

        <div className="preferences-dialog__content">
          <section className="preference-card">
            <h3>{t('settings.sections.application')}</h3>
            <ChoiceGroup
              legend={t('settings.application.closeBehavior')}
              name="close-behavior"
              value={current.closeBehavior}
              onChange={change.closeBehavior}
              options={[
                { value: 'minimize', label: t('settings.application.minimizeToTray') },
                { value: 'close', label: t('settings.application.closeApplication') },
              ]}
            />
            <div className="preference-card__toggles" aria-busy={autoStartLoading}>
              <Toggle
                checked={current.autoStart}
                disabled={autoStartLoading}
                onChange={changeAutoStart}
                label={t('settings.application.startWhenTurnsOn')}
              />
              <Toggle
                checked={current.startMinimized}
                onChange={change.startMinimized}
                label={t('settings.application.startMinimized')}
              />
              <Toggle
                checked={current.showTrayNotifications}
                onChange={change.showTrayNotifications}
                label={t('settings.application.showTrayNotifications')}
              />
            </div>
          </section>

          <section className="preference-card">
            <h3>{t('settings.sections.appearance')}</h3>
            <SelectField id="theme-mode" label={t('settings.appearance.theme')} value={current.theme} onChange={change.theme}>
              <option value="system">{t('settings.appearance.themes.system')}</option>
              <option value="dark">{t('settings.appearance.themes.dark')}</option>
              <option value="light">{t('settings.appearance.themes.light')}</option>
            </SelectField>
            <ChoiceGroup
              legend={t('settings.appearance.defaultView')}
              name="default-view"
              value={current.viewMode}
              onChange={change.viewMode}
              options={[
                { value: 'list', label: t('settings.appearance.listView') },
                { value: 'grid', label: t('settings.appearance.gridView') },
              ]}
            />
          </section>

          <section className="preference-card">
            <h3>{t('settings.sections.language')}</h3>
            <SelectField
              id="interface-language"
              label={t('settings.language.interfaceLanguage')}
              value={language}
              onChange={changeLanguage}
            >
              {getSupportedLanguages().map((entry) => (
                <option key={entry.code} value={entry.code}>{entry.shortLabel} — {entry.name}</option>
              ))}
            </SelectField>
          </section>

          <section className="preference-card">
            <h3>{t('settings.sections.storage')}</h3>
            <SelectField
              id="history-limit"
              label={t('settings.storage.maximumItems')}
              value={String(current.maxItems)}
              onChange={(value) => change.maxItems(Number(value))}
            >
              {[50, 100, 200, 500].map((count) => (
                <option key={count} value={count}>{t('settings.storage.items', { count })}</option>
              ))}
            </SelectField>
            <SelectField id="history-retention" label={t('settings.storage.autoDelete')} value={current.autoDelete} onChange={change.autoDelete}>
              <option value="never">{t('settings.storage.never')}</option>
              <option value="5min">{t('settings.storage.after5min')}</option>
              <option value="15min">{t('settings.storage.after15min')}</option>
              <option value="30min">{t('settings.storage.after30min')}</option>
              <option value="1hour">{t('settings.storage.after1hour')}</option>
              <option value="1day">{t('settings.storage.after1day')}</option>
              <option value="7days">{t('settings.storage.after7days')}</option>
              <option value="30days">{t('settings.storage.after30days')}</option>
            </SelectField>
          </section>
        </div>

        <footer className="preferences-dialog__footer">
          <div className="preferences-dialog__danger">
            <button
              type="button"
              className={confirmClear ? 'is-armed' : ''}
              onClick={() => {
                if (!confirmClear) return armConfirmation('clear');
                onClearHistory();
                disarmConfirmations();
                onDismiss();
              }}
            >
              {confirmClear ? t('settings.danger.confirmClear') : t('settings.danger.clearAllData')}
            </button>
            <button
              type="button"
              className={confirmReset ? 'is-armed' : ''}
              onClick={() => {
                if (!confirmReset) return armConfirmation('reset');
                onRestoreDefaults();
                disarmConfirmations();
                onDismiss();
              }}
            >
              {confirmReset ? t('settings.danger.confirmReset') : t('settings.danger.resetSettings')}
            </button>
          </div>
          <button type="button" className="primary-action" onClick={requestClose}>{t('settings.save')}</button>
        </footer>
      </div>
    </dialog>
  );
};

export default SettingsModal;
