// drama.js
// مدیریت حواشی (شایعه، دروغ، بحث داغ)

import { supabase } from './supabase-client.js';

// ====================================================
// گرفتن حواشی لیگ
// ====================================================
export async function getLeagueDrama(leagueId, limit = 20) {
  const { data, error } = await supabase
    .from('drama')
    .select('*')
    .eq('league', leagueId)
    .order('heat', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('خطا:', error);
    return [];
  }
  return data || [];
}

// ====================================================
// گرفتن حواشی یک تیم
// ====================================================
export async function getTeamDrama(teamId, limit = 10) {
  const { data } = await supabase
    .from('drama')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}

// ====================================================
// ساخت حاشیه جدید
// ====================================================
export async function createDrama({
  league,
  title,
  content = '',
  type = 'rumor',
  teamId = null,
  playerId = null,
  isTrue = false,
  heat = 3
}) {
  const { data, error } = await supabase
    .from('drama')
    .insert({
      league,
      title,
      content,
      type,
      team_id: teamId,
      player_id: playerId,
      is_true: isTrue,
      heat
    })
    .select()
    .single();
  
  if (error) {
    console.error('خطا:', error);
    return null;
  }
  return data;
}

// ====================================================
// الگوهای حاشیه
// ====================================================
const DRAMA_TEMPLATES = [
  // شایعه‌ها
  {
    type: 'rumor',
    title: '🔥 شایعه: {player} به {team} لینک شد',
    content: 'منابع نزدیک به باشگاه می‌گویند که {team} به دنبال جذب {player} است. گفته می‌شود مذاکرات در مرحله ابتدایی قرار دارد.',
    heat: 4,
    isTrue: false
  },
  {
    type: 'rumor',
    title: '💬 {player} از {team} ناراضی است',
    content: 'شنیده‌ها حاکی از نارضایتی {player} از شرایط فعلی در {team} است. گفته می‌شود او به دنبال جدایی در پنجره بعدی است.',
    heat: 4,
    isTrue: false
  },
  {
    type: 'rumor',
    title: '⚡ {team} به دنبال مربی جدید',
    content: 'برخی منابع خبری از احتمال تغییر کادر فنی {team} خبر می‌دهند.',
    heat: 3,
    isTrue: false
  },
  
  // دروغ‌ها
  {
    type: 'fake',
    title: '❌ تکذیب: خبر جدایی {player} صحت ندارد',
    content: 'باشگاه {team} اخبار منتشر شده درباره جدایی {player} را تکذیب کرد و آن را شایعه خواند.',
    heat: 2,
    isTrue: false
  },
  {
    type: 'fake',
    title: '🚫 شایعه بی‌اساس درباره {team}',
    content: 'منابع معتبر اعلام کردند اخبار منتشر شده درباره {team} صحت ندارد.',
    heat: 2,
    isTrue: false
  },
  
  // درگیری
  {
    type: 'conflict',
    title: '😡 تنش در رختکن {team}',
    content: 'شنیده‌ها حاکی از درگیری لفظی بین دو بازیکن {team} در تمرین امروز است. کادر فنی در حال بررسی موضوع است.',
    heat: 5,
    isTrue: true
  },
  {
    type: 'conflict',
    title: '😤 هواداران {team} معترض شدند',
    content: 'هواداران {team} با تجمع در مقابل باشگاه، به عملکرد اخیر تیم اعتراض کردند.',
    heat: 4,
    isTrue: true
  },
  
  // رسوایی
  {
    type: 'scandal',
    title: '🚨 رسوایی: بازیکن {team} در پارتی',
    content: 'گزارش‌ها از حضور یکی از بازیکنان {team} در یک پارتی شبانه قبل از بازی مهم حکایت دارد.',
    heat: 5,
    isTrue: false
  },
  
  // افشاگری
  {
    type: 'leak',
    title: '📸 افشاگری: قرارداد مخفی {player}',
    content: 'تصاویری از قرارداد مخفی {player} با {team} منتشر شد که نشان می‌دهد دستمزد او بسیار بیشتر از اعلام رسمی است.',
    heat: 4,
    isTrue: false
  },
  
  // پیش‌بینی
  {
    type: 'prediction',
    title: '🎯 پیش‌بینی: {team} قهرمان می‌شود؟',
    content: 'کارشناسان معتقدند {team} با عملکرد اخیر خود، شانس زیادی برای قهرمانی در این فصل دارد.',
    heat: 3,
    isTrue: true
  },
  {
    type: 'prediction',
    title: '📉 هشدار: {team} در خطر سقوط',
    content: 'تحلیلگران معتقدند {team} در صورت ادامه این روند، در خطر سقوط قرار دارد.',
    heat: 4,
    isTrue: false
  },
  
  // شایعه جدایی
  {
    type: 'rumor',
    title: '✈️ {player} با تیم دیگری مذاکره کرد',
    content: 'گفته می‌شود {player} به صورت مخفیانه با یکی از تیم‌های بزرگ اروپایی مذاکره کرده است.',
    heat: 5,
    isTrue: false
  },
  {
    type: 'rumor',
    title: '💰 پیشنهاد نجومی برای {player}',
    content: 'شنیده‌ها حاکی از دریافت پیشنهاد سنگین برای جذب {player} از {team} است.',
    heat: 4,
    isTrue: false
  },
  
  // بحث داغ
  {
    type: 'conflict',
    title: '🥊 دعوای مربیان {team} و رقیب',
    content: 'مربیان دو تیم در کنفرانس خبری به شدت با هم درگیر شدند.',
    heat: 5,
    isTrue: true
  },
  {
    type: 'rumor',
    title: '❓ آینده {player} در هاله‌ای از ابهام',
    content: 'با پایان یافتن قرارداد {player}، آینده او در {team} نامشخص است.',
    heat: 3,
    isTrue: true
  }
];

// ====================================================
// تولید حاشیه تصادفی
// ====================================================
export function generateRandomDrama(league, teams, players = []) {
  if (!teams || teams.length === 0) return null;
  
  const template = DRAMA_TEMPLATES[Math.floor(Math.random() * DRAMA_TEMPLATES.length)];
  const team = teams[Math.floor(Math.random() * teams.length)];
  const player = players.length > 0 
    ? players[Math.floor(Math.random() * players.length)] 
    : { name: 'یک بازیکن' };
  
  const title = template.title
    .replace('{team}', team.name)
    .replace('{player}', player.name);
  
  const content = template.content
    .replace('{team}', team.name)
    .replace('{player}', player.name);
  
  return {
    league,
    title,
    content,
    type: template.type,
    teamId: team.id,
    playerId: player.id || null,
    isTrue: template.isTrue,
    heat: template.heat
  };
}

// ====================================================
// تولید چند حاشیه تصادفی
// ====================================================
export async function generateMultipleDrama(league, count = 5) {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league', league);
  
  if (!teams || teams.length === 0) return [];
  
  const dramas = [];
  
  for (let i = 0; i < count; i++) {
    const drama = generateRandomDrama(league, teams);
    if (drama) {
      const created = await createDrama(drama);
      if (created) dramas.push(created);
    }
  }
  
  return dramas;
}

// ====================================================
// آیکون حاشیه
// ====================================================
export function getDramaIcon(type) {
  const icons = {
    'rumor': '🔥',
    'fake': '❌',
    'conflict': '😡',
    'scandal': '🚨',
    'leak': '📸',
    'prediction': '🎯'
  };
  return icons[type] || '🔥';
}

// ====================================================
// رنگ حاشیه بر اساس داغی
// ====================================================
export function getDramaColor(heat) {
  if (heat >= 5) return '#dc2626';
  if (heat >= 4) return '#f59e0b';
  if (heat >= 3) return '#eab308';
  return '#6b7280';
}

// ====================================================
// متن داغی
// ====================================================
export function getHeatText(heat) {
  if (heat >= 5) return '🔥 خیلی داغ';
  if (heat >= 4) return '🔥 داغ';
  if (heat >= 3) return '⚡ متوسط';
  return '💤 سرد';
}

// ====================================================
// فرمت زمان
// ====================================================
export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  const toPersian = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${toPersian(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersian(Math.floor(diff / 3600))} ساعت پیش`;
  return `${toPersian(Math.floor(diff / 86400))} روز پیش`;
        }
