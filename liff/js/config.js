// Config — single LIFF, all 4 tabs visible
// Admin tab visible to everyone but page-level role check blocks staff

export const CONFIG = {
  LIFF_ID: '2010026617-i9TGbuOF',
  API_URL: 'https://script.google.com/macros/s/AKfycbz31uqRMAtGeMShTJr9pnbCo8_DwWNCk12dZPtkxd5wGXzvcT_2C79BhNid-3rIz6pvGw/exec',

  TABS: ['stockIn', 'stockOut', 'production', 'balance', 'admin'],
  DEFAULT_TAB: 'stockIn',
  OWNER_ONLY_TABS: ['admin'],

  DEV_MOCK_LIFF: false,
  DEV_MOCK_USER_ID: 'U_STAFF_TBD',
};
