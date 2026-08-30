import { useEffect, useRef, useState } from 'react';
import { eventToShortcut, formatShortcutDisplay } from '../utils/shortcutFormat';
import { useLanguage } from '../utils/i18n';

const TAKEN_FEEDBACK_MS = 1400;

export default function ShortcutField({ id, label, value, onChange, taken = [] }) {
  const { t, language } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [takenFlash, setTakenFlash] = useState(false);
  const buttonRef = useRef(null);
  const takenTimerRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(takenTimerRef.current);
  }, []);

  const flashTaken = () => {
    setRecording(false);
    setTakenFlash(true);
    window.clearTimeout(takenTimerRef.current);
    takenTimerRef.current = window.setTimeout(() => setTakenFlash(false), TAKEN_FEEDBACK_MS);
  };

  useEffect(() => {
    if (!recording) return undefined;

    const handleKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setRecording(false);
        return;
      }
      const shortcut = eventToShortcut(event);
      if (!shortcut) return;
      if (shortcut === value) {
        setRecording(false);
        return;
      }
      if (taken.includes(shortcut)) {
        onChange('');
        flashTaken();
        return;
      }
      onChange(shortcut);
      setRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onChange, recording, taken, value]);

  useEffect(() => {
    if (recording) buttonRef.current?.focus();
  }, [recording]);

  let display = formatShortcutDisplay(value, language);
  if (takenFlash) display = t('settings.shortcuts.taken');
  else if (recording) display = t('settings.shortcuts.pressKeys');

  return (
    <div className="preference-field preference-field--shortcut">
      <label htmlFor={id}>{label}</label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={[
          'shortcut-field',
          recording ? 'is-recording' : '',
          takenFlash ? 'is-taken' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => {
          setTakenFlash(false);
          setRecording(true);
        }}
        onBlur={() => setRecording(false)}
      >
        {display}
      </button>
    </div>
  );
}
