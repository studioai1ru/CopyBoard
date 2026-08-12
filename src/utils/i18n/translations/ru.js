export const ru = {
  app: {
    title: 'CopyBoard',
    loading: 'Загрузка…',
  },

  header: {
    items: {
      one: 'запись',
      few: 'записи',
      many: 'записей',
    },
    searchPlaceholder: 'Поиск по истории…',
    filter: 'Фильтр',
    clearAll: 'Очистить',
    settings: 'Настройки',
    viewGrid: 'Плитка',
    viewList: 'Список',
    clearSearch: 'Очистить поиск',
  },

  filter: {
    all: 'Все',
    text: 'Текст',
    images: 'Картинки',
    code: 'Код',
  },

  frequent: {
    title: 'Избранное',
    manage: 'Настроить',
    empty: 'Добавьте фразы, ссылки или шаблоны — они всегда под рукой.',
    tapToCopy: 'Нажмите, чтобы скопировать',
    copied: 'Скопировано',
    manageTitle: 'Избранное',
    editTitle: 'Редактировать избранное',
    labelField: 'Короткое имя',
    contentField: 'Текст',
    labelPlaceholder: 'Необязательно — иначе из первой строки',
    contentPlaceholder: 'Текст, который нужно быстро копировать',
    openFullscreen: 'Открыть на весь экран',
    addItem: 'Добавить',
    saveItem: 'Сохранить',
    cancelEdit: 'Отмена',
    edit: 'Редактировать',
    delete: 'Удалить',
    listEmpty: 'Пока ничего нет — добавьте первую запись выше.',
    icons: {
      choose: 'Выбрать значок',
      text: 'Текст',
      code: 'Код',
      image: 'Изображение',
      email: 'Почта',
      phone: 'Телефон',
      url: 'Ссылка',
    },
    display: {
      label: 'Отображение в избранном',
      iconText: 'Символ + текст',
      textOnly: 'Только текст',
      iconOnly: 'Только символ',
    },
  },

  item: {
    text: 'Текст',
    image: 'Изображение',
    code: 'Код',
    copy: 'Копировать',
    copied: 'Скопировано',
    edit: 'Изменить',
    delete: 'Удалить',
    addFavorite: 'В избранное',
    inFavorites: 'В избранном',
    removeFavorite: 'Убрать из избранного',
    openImage: 'Открыть изображение',
    justNow: 'Только что',
    minutesAgo: '{{count}} мин назад',
    hoursAgo: '{{count}} ч назад',
    daysAgo: '{{count}} дн назад',
  },

  empty: {
    title: 'История пуста',
    titleSearch: 'Ничего не найдено',
    description: 'Скопируйте что-нибудь — запись появится здесь.',
    descriptionSearch: 'По запросу «{{query}}» записей нет.',
  },

  edit: {
    title: 'Редактирование',
    save: 'Сохранить',
    cancel: 'Отмена',
    shortcuts: {
      save: 'сохранить',
      cancel: 'отмена',
    },
  },

  settings: {
    title: 'Настройки',
    save: 'Готово',
    cancel: 'Закрыть',

    sections: {
      application: 'Приложение',
      appearance: 'Внешний вид',
      language: 'Язык',
      storage: 'Хранилище',
      shortcuts: 'Горячие клавиши',
    },

    application: {
      closeBehavior: 'При закрытии окна',
      minimizeToTray: 'Свернуть в трей',
      closeApplication: 'Выход из программы',
      startWhenTurnsOn: 'Запускать с Windows',
      startMinimized: 'Старт свёрнутым',
      showTrayNotifications: 'Уведомления в трее',
      updating: 'Сохранение…',
    },

    appearance: {
      theme: 'Тема',
      themes: {
        dark: 'Тёмная',
        light: 'Светлая',
      },
      defaultView: 'Вид списка',
      gridView: 'Плитка',
      listView: 'Список',
    },

    language: {
      interfaceLanguage: 'Язык интерфейса',
    },

    storage: {
      maximumItems: 'Лимит записей',
      autoDelete: 'Удалять старые',
      items: '{{count}} шт.',
      never: 'Никогда',
      after5min: 'Через 5 мин',
      after15min: 'Через 15 мин',
      after30min: 'Через 30 мин',
      after1hour: 'Через 1 ч',
      after2hours: 'Через 2 ч',
      after6hours: 'Через 6 ч',
      after12hours: 'Через 12 ч',
      after1day: 'Через 1 день',
      after3days: 'Через 3 дня',
      after7days: 'Через 7 дней',
      after30days: 'Через 30 дней',
    },

    shortcuts: {
      quickAccess: 'Открыть CopyBoard',
      clearAll: 'Очистить историю',
      pressKeys: 'Нажмите сочетание…',
      cancel: 'Отмена',
    },

    danger: {
      clearAllData: 'Удалить историю',
      resetSettings: 'Сбросить настройки',
      confirmClear: 'Подтвердить удаление',
      confirmReset: 'Подтвердить сброс',
    },

    errors: {
      themeChangeFailed: 'Не удалось сменить тему',
      autoStartFailed: 'Не удалось изменить автозапуск',
    },
  },

  footer: {
    version: 'CopyBoard · v{{version}}',
  },

  titleBar: {
    minimize: 'Свернуть',
    maximize: 'Развернуть',
    restore: 'Восстановить',
    close: 'Закрыть',
  },

  errors: {
    copyFailed: 'Не удалось скопировать',
  },
};
