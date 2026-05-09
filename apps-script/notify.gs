/**
 * แจ้งเตือนยอดต่ำผ่าน n8n webhook
 * — ถ้า N8N_WEBHOOK_URL ไม่ได้ตั้ง = skip (log ไว้)
 */

function sendLowStockAlert_(payload) {
  const url = PropertiesService.getScriptProperties().getProperty('N8N_WEBHOOK_URL');
  if (!url) {
    // ยังไม่ได้ตั้ง webhook → ข้าม (log ไว้ใน Sheet Logs)
    logError_('sendLowStockAlert', '', new Error('N8N_WEBHOOK_URL not set — skipped: ' + JSON.stringify(payload)));
    return;
  }
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
