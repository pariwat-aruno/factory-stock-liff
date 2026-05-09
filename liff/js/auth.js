import { CONFIG } from './config.js';

// state ของ user — set หลัง initAuth
export const state = {
  lineUserId: null,
  profile: null,   // {userId, displayName, pictureUrl}
  user: null,      // จาก /me — {line_user_id, ชื่อ, role, registered_at}
};

export async function initAuth() {
  if (CONFIG.DEV_MOCK_LIFF) {
    state.lineUserId = CONFIG.DEV_MOCK_USER_ID;
    state.profile = { userId: state.lineUserId, displayName: '(dev)', pictureUrl: '' };
    return;
  }

  if (typeof liff === 'undefined') {
    throw new Error('LIFF SDK ยังไม่โหลด');
  }
  await liff.init({ liffId: CONFIG.LIFF_ID });
  if (!liff.isLoggedIn()) {
    liff.login();
    return; // จะ redirect แล้วโหลดใหม่
  }
  state.profile = await liff.getProfile();
  state.lineUserId = state.profile.userId;
}

export function isOwner() {
  return state.user && state.user.role === 'เจ้าของ';
}
