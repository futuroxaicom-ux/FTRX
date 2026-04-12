const API = process.env.REACT_APP_BACKEND_URL || '';

function detectSource() {
  const ref = document.referrer || '';
  if (!ref) return 'direct';
  if (ref.includes('google')) return 'google';
  if (ref.includes('twitter') || ref.includes('x.com')) return 'twitter';
  if (ref.includes('telegram') || ref.includes('t.me')) return 'telegram';
  if (ref.includes('discord')) return 'discord';
  if (ref.includes('raydium')) return 'raydium';
  if (ref.includes('jupiter') || ref.includes('jup.ag')) return 'jupiter';
  if (ref.includes('dexscreener')) return 'dexscreener';
  if (ref.includes('solscan')) return 'solscan';
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook';
  if (ref.includes('reddit')) return 'reddit';
  if (ref.includes('youtube')) return 'youtube';
  if (ref.includes('tiktok')) return 'tiktok';
  if (ref.includes('instagram')) return 'instagram';
  return ref.split('/')[2] || 'other';
}

export function trackVisit(page = '/') {
  try {
    fetch(`${API}/api/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        referrer: document.referrer || 'direct',
        source: detectSource(),
        user_agent: navigator.userAgent,
      }),
    }).catch(() => {});
  } catch {}
}

export function trackChat(question, answer, language) {
  try {
    fetch(`${API}/api/analytics/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer: answer?.substring(0, 200), language }),
    }).catch(() => {});
  } catch {}
}
