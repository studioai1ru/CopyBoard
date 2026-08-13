import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import {
  CUSTOM_FAVORITE_COLOR_PICKER_DEFAULT,
  CUSTOM_FAVORITE_COLORS,
  CUSTOM_FAVORITE_SYMBOLS,
  createDefaultCustomFavoriteIcon,
  isCustomFavoriteHexColor,
  normalizeCustomFavoriteIcon,
  resolveCustomFavoriteColor,
} from '../utils/customFavoriteIcons';
import { useLanguage } from '../utils/i18n';

export default function CustomFavoriteIconForm({ value, onApply, onCancel }) {
  const { t } = useLanguage();
  const initial = useMemo(
    () => normalizeCustomFavoriteIcon(value)
      || createDefaultCustomFavoriteIcon(t('frequent.customIcon.defaultName')),
    [t, value],
  );
  const [name, setName] = useState(initial.name);
  const [symbol, setSymbol] = useState(initial.symbol);
  const [color, setColor] = useState(initial.color);
  const nameRef = useRef(null);
  const colorInputRef = useRef(null);
  const isCustomColor = isCustomFavoriteHexColor(color);
  const pickerValue = isCustomColor ? color : CUSTOM_FAVORITE_COLOR_PICKER_DEFAULT;
  const customColorVisual = isCustomColor ? resolveCustomFavoriteColor(color) : null;

  useEffect(() => {
    setName(initial.name);
    setSymbol(initial.symbol);
    setColor(initial.color);
    const frame = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [initial]);

  const apply = () => {
    const next = normalizeCustomFavoriteIcon({ name, symbol, color });
    if (next) onApply(next);
  };

  const openColorPicker = () => {
    const input = colorInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Fall through to click() when the browser blocks showPicker().
      }
    }
    input.click();
  };

  return (
    <section
      className="custom-favorite-icon"
      role="dialog"
      aria-label={t('frequent.customIcon.title')}
    >
      <label className="custom-favorite-icon__name">
        <span>{t('frequent.customIcon.name')}</span>
        <input
          ref={nameRef}
          type="text"
          value={name}
          maxLength={24}
          required
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            apply();
          }}
        />
      </label>

      <fieldset className="custom-favorite-icon__group">
        <legend>{t('frequent.customIcon.symbol')}</legend>
        <div className="custom-favorite-icon__symbols">
          {CUSTOM_FAVORITE_SYMBOLS.map(({ id, Icon }) => (
            <button
              key={id}
              type="button"
              className={symbol === id ? 'is-active' : ''}
              aria-pressed={symbol === id}
              aria-label={t(`frequent.customIcon.symbols.${id}`)}
              title={t(`frequent.customIcon.symbols.${id}`)}
              onClick={() => setSymbol(id)}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="custom-favorite-icon__group">
        <legend>{t('frequent.customIcon.color')}</legend>
        <div className="custom-favorite-icon__colors">
          {CUSTOM_FAVORITE_COLORS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={color === option.id ? 'is-active' : ''}
              style={{ '--custom-icon-color': option.bg, '--custom-icon-fg': option.fg }}
              aria-pressed={color === option.id}
              aria-label={t(`frequent.customIcon.colors.${option.id}`)}
              title={t(`frequent.customIcon.colors.${option.id}`)}
              onClick={() => setColor(option.id)}
            >
              {color === option.id && <FiCheck aria-hidden="true" />}
            </button>
          ))}
          <button
            type="button"
            className={`custom-favorite-icon__color-custom${isCustomColor ? ' is-active' : ''}`}
            style={customColorVisual
              ? {
                '--custom-icon-color': customColorVisual.bg,
                '--custom-icon-fg': customColorVisual.fg,
              }
              : undefined}
            aria-pressed={isCustomColor}
            aria-label={t('frequent.customIcon.colors.custom')}
            title={t('frequent.customIcon.colors.custom')}
            onClick={openColorPicker}
          >
            {isCustomColor && <FiCheck aria-hidden="true" />}
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="custom-favorite-icon__color-input"
            value={pickerValue}
            aria-label={t('frequent.customIcon.colors.custom')}
            tabIndex={-1}
            onChange={(event) => setColor(event.target.value.toLowerCase())}
          />
        </div>
      </fieldset>

      <div className="custom-favorite-icon__actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          {t('frequent.customIcon.cancel')}
        </button>
        <button type="button" className="primary-btn" disabled={!name.trim()} onClick={apply}>
          {t('frequent.customIcon.apply')}
        </button>
      </div>
    </section>
  );
}
