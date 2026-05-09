/**
 * Authentication & authorization
 * — ตรวจ line_user_id จาก request
 * — lookup role ใน Sheet `Users`
 */

// คืน object {line_user_id, ชื่อ, role, registered_at} หรือ null ถ้าไม่พบ
function getUser_(lineUserId) {
  if (!lineUserId) return null;
  const users = readSheet_('Users');
  for (let i = 0; i < users.length; i++) {
    if (String(users[i].line_user_id) === String(lineUserId)) {
      return users[i];
    }
  }
  return null;
}

// ตรวจว่า user ลงทะเบียนแล้ว ไม่งั้น throw
function requireUser_(lineUserId) {
  const user = getUser_(lineUserId);
  if (!user) {
    throw new Error('ยังไม่ได้ลงทะเบียน ติดต่อเจ้าของ');
  }
  return user;
}

// ตรวจว่า user เป็นเจ้าของ
function requireOwner_(lineUserId) {
  const user = requireUser_(lineUserId);
  if (user.role !== 'เจ้าของ') {
    throw new Error('สิทธิ์ไม่พอ — เฉพาะเจ้าของ');
  }
  return user;
}

// ตรวจ shared secret สำหรับ endpoint ที่ n8n เรียก
function requireN8nSecret_(secret) {
  const expected = prop_('N8N_SECRET');
  if (!secret || secret !== expected) {
    throw new Error('Invalid n8n secret');
  }
}
