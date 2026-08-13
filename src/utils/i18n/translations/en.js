export const en = {
  app: {
    title: 'CopyBoard',
    loading: 'Loading…',
  },

  header: {
    items: {
      one: 'entry',
      few: 'entries',
      many: 'entries',
    },
    searchPlaceholder: 'Search history…',
    filter: 'Filter',
    clearAll: 'Clear',
    settings: 'Settings',
    viewGrid: 'Grid view',
    viewList: 'List view',
    clearSearch: 'Clear search',
  },

  filter: {
    all: 'All',
    text: 'Text',
    images: 'Images',
    code: 'Code',
  },

  frequent: {
    title: 'Favorites',
    manage: 'Manage',
    empty: 'Add phrases, links, or templates for one-click copy.',
    tapToCopy: 'Click to copy',
    copied: 'Copied',
    manageTitle: 'Favorites',
    editTitle: 'Edit favorite',
    labelField: 'Short name',
    contentField: 'Text',
    labelPlaceholder: 'Optional — otherwise from the first line',
    contentPlaceholder: 'Text you copy often',
    openFullscreen: 'Open fullscreen',
    addItem: 'Add',
    saveItem: 'Save',
    cancelEdit: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    listEmpty: 'Nothing here yet — add your first item above.',
    icons: {
      choose: 'Choose icon',
      text: 'Text',
      code: 'Code',
      image: 'Image',
      email: 'Email',
      phone: 'Phone',
      url: 'Link',
    },
    display: {
      label: 'Favorite display',
      iconText: 'Icon + text',
      textOnly: 'Text only',
      iconOnly: 'Icon only',
    },
  },

  quickAccess: {
    title: 'Templates',
    hint: 'Choose a value to copy it and add it to history.',
    empty: 'Add templates to CopyBoard favorites.',
    copy: 'Copy “{{label}}”',
    copied: 'Copied',
  },

  item: {
    text: 'Text',
    image: 'Image',
    code: 'Code',
    copy: 'Copy',
    copied: 'Copied',
    edit: 'Edit',
    delete: 'Delete',
    addFavorite: 'Favorite',
    inFavorites: 'Saved',
    removeFavorite: 'Remove from favorites',
    openImage: 'Open image',
    justNow: 'Just now',
    minutesAgo: '{{count}} min ago',
    hoursAgo: '{{count}} h ago',
    daysAgo: '{{count}} d ago',
  },

  empty: {
    title: 'No history yet',
    titleSearch: 'No matches',
    description: 'Copy something — it will show up here.',
    descriptionSearch: 'No entries for “{{query}}”.',
  },

  edit: {
    title: 'Edit entry',
    save: 'Save',
    cancel: 'Cancel',
    shortcuts: {
      save: 'to save',
      cancel: 'to cancel',
    },
  },

  settings: {
    title: 'Settings',
    save: 'Done',
    cancel: 'Close',

    sections: {
      application: 'Application',
      appearance: 'Appearance',
      language: 'Language',
      storage: 'Storage',
      shortcuts: 'Shortcuts',
    },

    application: {
      closeBehavior: 'When closing the window',
      minimizeToTray: 'Minimize to tray',
      closeApplication: 'Quit app',
      startWhenTurnsOn: 'Start with Windows',
      startMinimized: 'Start minimized',
      showTrayNotifications: 'Tray notifications',
      updating: 'Saving…',
    },

    appearance: {
      theme: 'Theme',
      themes: {
        system: 'System',
        dark: 'Dark',
        light: 'Light',
      },
      defaultView: 'Default view',
      gridView: 'Grid',
      listView: 'List',
    },

    language: {
      interfaceLanguage: 'Interface language',
      showQuickAccessEdge: 'Show drawer edge',
    },

    storage: {
      maximumItems: 'History limit',
      autoDelete: 'Auto-delete old',
      items: '{{count}} items',
      never: 'Never',
      after5min: 'After 5 min',
      after15min: 'After 15 min',
      after30min: 'After 30 min',
      after1hour: 'After 1 hour',
      after2hours: 'After 2 hours',
      after6hours: 'After 6 hours',
      after12hours: 'After 12 hours',
      after1day: 'After 1 day',
      after3days: 'After 3 days',
      after7days: 'After 7 days',
      after30days: 'After 30 days',
    },

    shortcuts: {
      quickAccess: 'Open CopyBoard',
      clearAll: 'Clear history',
      pressKeys: 'Press shortcut…',
      cancel: 'Cancel',
    },

    danger: {
      clearAllData: 'Delete history',
      resetSettings: 'Reset settings',
      confirmClear: 'Confirm delete',
      confirmReset: 'Confirm reset',
    },

    errors: {
      themeChangeFailed: 'Failed to change theme',
      autoStartFailed: 'Failed to change autostart',
    },
  },

  footer: {
    version: 'CopyBoard · v{{version}}',
  },

  titleBar: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },

  errors: {
    copyFailed: 'Copy failed',
  },
};
