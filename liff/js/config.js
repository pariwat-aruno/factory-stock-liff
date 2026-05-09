// Config — แก้ค่าให้ตรงกับของจริง
// LIFF_ID หาได้จาก LINE Developers Console → channel → tab LIFF
// API_URL คือ Web App URL ของ Apps Script (ลงท้าย /exec)

export const CONFIG = {
  LIFF_ID: '2010026617-i9TGbuOF',
  API_URL: 'https://script.google.com/macros/s/AKfycbz31uqRMAtGeMShTJr9pnbCo8_DwWNCk12dZPtkxd5wGXzvcT_2C79BhNid-3rIz6pvGw/exec',

  // dev mode — ถ้า true จะ mock LIFF (ใช้ test ใน browser ปกติได้)
  // เปลี่ยนเป็น false ตอน deploy production
  DEV_MOCK_LIFF: false,
  DEV_MOCK_USER_ID: 'U_STAFF_TBD',
};
