const en = {
  meta: {
    lang:      'en',
    dir:       'ltr',
    label:     'English',
    fontClass: 'font-en',
  },

  // ─── Navigation ───
  nav: {
    home:          'Prayer Times',
    nearby:        'Nearby',
    subscriptions: 'My Mosques',
    settings:      'Settings',
  },

  // ─── Prayer names ───
  prayers: {
    fajr:    'Fajr',
    zuhr:    'Zuhr',
    asr:     'Asr',
    maghrib: 'Maghrib',
    isha:    'Isha',
    jumma:   'Jumu\'ah',
  },

  // ─── Home page ───
  home: {
    title:           'Prayer Times',
    searchPlaceholder: 'Search mosques...',
    filterByArea:    'Filter by area',
    allAreas:        'All areas',
    nearbyFirst:     'Nearest first',
    noMosques:       'No mosques found',
    noMosquesHint:   'Try a different area or search term',
    nextPrayer:      'Next prayer',
    timeRemaining:   'Time remaining',
  },

  // ─── Mosque card ───
  mosque: {
    subscribersCount: '{{count}} subscribers',
    viewDetails:     'View details',
    subscribe:       'Subscribe',
    unsubscribe:     'Unsubscribe',
    subscribed:      'Subscribed',
    updatedAt:       'Updated {{date}}',
    noTimesYet:      'Times not set yet',
    eidPrayer:       'Eid Prayer',
    jummaTime:       'Jumu\'ah',
    pending:         'Pending',
  },

  // ─── Eid ───
  eid: {
    fitr:            'Eid ul-Fitr',
    adha:            'Eid ul-Adha',
    prayerAt:        'Prayer at {{time}} on {{date}}',
    upcoming:        'Upcoming Eid',
  },

  // ─── Settings ───
  settings: {
    title:           'Settings',
    language:        'Language',
    theme:           'Theme',
    notifications:   'Notifications',
    notifEnabled:    'Enabled',
    notifDisabled:   'Disabled',
    about:           'About',
    version:         'Version',
    donate:          'Support this Sadaqah Jariyah',
    donateHint:      'Keep this service free for everyone',
  },

  // ─── Themes ───
  themes: {
    light:    'Light',
    dark:     'Dark',
    warm:     'Warm',
    midnight: 'Midnight',
  },

  // ─── Auth ───
  auth: {
    signIn:          'Sign In',
    signUp:          'Create Account',
    signOut:         'Sign Out',
    email:           'Email',
    password:        'Password',
    displayName:     'Display Name',
    forgotPassword:  'Forgot password?',
    noAccount:       'Don\'t have an account?',
    haveAccount:     'Already have an account?',
  },

  // ─── Imam panel ───
  imam: {
    updateTimes:     'Update Prayer Times',
    mosque:          'Your Mosque',
    saveChanges:     'Save Changes',
    saved:           'Changes saved',
    postEid:         'Post Eid Prayer',
    eidType:         'Eid Type',
    eidDate:         'Date',
    eidTime:         'Time',
    auditLog:        'Change History',
    tabs: {
      times: 'Prayer Times',
      eid: 'Eid Prayer',
      history: 'History',
    },
    maghribAuto: 'Auto — sunset',
    unsavedChanges: 'Unsaved changes',
    noChanges: 'No changes',
  },

  // ─── Errors / feedback ───
  errors: {
    generic:         'Something went wrong. Please try again.',
    network:         'Check your connection.',
    notFound:        'Not found.',
    unauthorized:    'Please sign in.',
    forbidden:       'You don\'t have permission.',
  },

  common: {
    loading:         'Loading...',
    save:            'Save',
    cancel:          'Cancel',
    confirm:         'Confirm',
    delete:          'Delete',
    edit:            'Edit',
    back:            'Back',
    close:           'Close',
    today:           'Today',
    tomorrow:        'Tomorrow',
    auto:            'Auto',
  },
}

export default en