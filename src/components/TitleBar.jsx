import { useEffect, useState } from 'react';
import { FiCopy, FiMinus, FiSquare, FiX } from 'react-icons/fi';
import { useLanguage } from '../utils/i18n';
import { desktop, isDesktop } from '../utils/desktop';
import '../scss/TitleBar.scss';

const TitleBar = () => {
  const { t } = useLanguage();
  const [maximized, setMaximized] = useState(false);
  const [controlsAvailable, setControlsAvailable] = useState(false);

  useEffect(() => {
    const windowApi = desktop()?.window;
    setControlsAvailable(Boolean(windowApi));
    if (!windowApi) return undefined;

    windowApi.isMaximized().then(setMaximized).catch(() => {});
    return windowApi.onMaximizedChange?.(setMaximized);
  }, []);

  return (
    <div className="window-chrome">
      <div className="window-chrome__identity">
        <img src="./images/CopyBoard_Logo.png" alt="" aria-hidden="true" />
        <span>{t('app.title')}</span>
      </div>

      {(controlsAvailable || isDesktop()) && (
        <div className="window-chrome__controls">
          <button
            type="button"
            onClick={() => desktop()?.window?.minimize?.()}
            aria-label={t('titleBar.minimize')}
            title={t('titleBar.minimize')}
          >
            <FiMinus aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => desktop()?.window?.toggleMaximize?.()}
            aria-label={maximized ? t('titleBar.restore') : t('titleBar.maximize')}
            title={maximized ? t('titleBar.restore') : t('titleBar.maximize')}
          >
            {maximized ? <FiCopy aria-hidden="true" /> : <FiSquare aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="window-chrome__close"
            onClick={() => desktop()?.window?.close?.()}
            aria-label={t('titleBar.close')}
            title={t('titleBar.close')}
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TitleBar;
