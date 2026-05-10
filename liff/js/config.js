// Config — 2 modes: staff (เฉพาะรับเข้า+เบิก) / admin (ครบทุกอย่าง)
// mode มาจาก <body data-mode="staff|admin"> ใน HTML
// LIFF ID แต่ละ mode สร้างคนละตัวใน LINE Developers (endpoint URL คนละหน้า)

const APP_MODE = (document.body && document.body.dataset.mode) || 'staff';

const LIFF_IDS = {
  staff: '2010026617-i9TGbuOF',
  admin: 'REPLACE_WITH_ADMIN_LIFF_ID',
};

// แสดง tab ตาม mode
const TABS = {
  staff: ['stockIn', 'stockOut'],
  admin: ['stockIn', 'stockOut', 'balance', 'admin'],
};

const DEFAULT_TAB = {
  staff: 'stockIn',
  admin: 'balance',
};

export const CONFIG = {
  MODE: APP_MODE,
  LIFF_ID: LIFF_IDS[APP_MODE] || LIFF_IDS.staff,
  TABS: TABS[APP_MODE] || TABS.staff,
  DEFAULT_TAB: DEFAULT_TAB[APP_MODE] || 'stockIn',

  API_URL: 'https://script.google.com/macros/s/AKfycbz31uqRMAtGeMShTJr9pnbCo8_DwWNCk12dZPtkxd5wGXzvcT_2C79BhNid-3rIz6pvGw/exec',

  DEV_MOCK_LIFF: false,
  DEV_MOCK_USER_ID: 'U_STAFF_TBD',
};
