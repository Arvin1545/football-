// player-photos.js
// سیستم چند-منبعی برای گرفتن عکس بازیکنان

// ====================================================
// ۱. TheSportsDB
// ====================================================
async function getFromSportsDB(playerName) {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.player && data.player[0]) {
      const photo = data.player[0].strThumb || 
                    data.player[0].strCutout || 
                    data.player[0].strRender;
      if (photo) return photo;
    }
    return null;
  } catch (error) {
    console.warn('TheSportsDB خطا:', error);
    return null;
  }
}

// ====================================================
// ۲. Wikipedia (بدون کلید API)
// ====================================================
async function getFromWikipedia(playerName) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(playerName)}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.thumbnail && data.thumbnail.source) {
      return data.thumbnail.source;
    }
    if (data.originalimage && data.originalimage.source) {
      return data.originalimage.source;
    }
    return null;
  } catch (error) {
    console.warn('Wikipedia خطا:', error);
    return null;
  }
}

// ====================================================
// ۳. تولید آواتار جذاب (fallback)
// ====================================================
export function generateAvatar(playerName, team = null) {
  const initial = (playerName || 'P').charAt(0).toUpperCase();
  
  // رنگ پیش‌فرض
  let color1 = '#7c3aed';
  let color2 = '#ec4899';
  
  // اگه تیم داشت، از رنگ تیم استفاده کن
  if (team) {
    color1 = team.primary_color || color1;
    color2 = team.secondary_color || color2;
  }
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#g)"/>
      <circle cx="100" cy="80" r="35" fill="rgba(255,255,255,0.25)"/>
      <text x="100" y="175" font-size="70" font-weight="bold" 
            fill="white" text-anchor="middle" font-family="Arial">
        ${initial}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ====================================================
// گرفتن عکس از همه منابع
// ====================================================
export async function getPlayerPhoto(playerName, team = null) {
  if (!playerName) return null;
  
  console.log('🔍 جستجوی عکس:', playerName);
  
  // ۱. TheSportsDB
  let photo = await getFromSportsDB(playerName);
  if (photo) {
    console.log('✅ TheSportsDB:', playerName);
    return photo;
  }
  
  // ۲. Wikipedia
  photo = await getFromWikipedia(playerName);
  if (photo) {
    console.log('✅ Wikipedia:', playerName);
    return photo;
  }
  
  // ۳. آواتار
  console.log('⚠️ آواتار:', playerName);
  return generateAvatar(playerName, team);
}

// ====================================================
// بارگذاری عکس برای همه بازیکنان یک تیم
// ====================================================
export async function loadAllPlayerPhotos(players, team, onProgress) {
  console.log('📸 شروع بارگذاری', players.length, 'عکس...');
  
  const results = [];
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    
    try {
      const photo = await getPlayerPhoto(player.name, team);
      results.push({ id: player.id, photo });
      
      if (onProgress) {
        onProgress(i + 1, players.length, player.name);
      }
    } catch (error) {
      console.error('خطا:', player.name, error);
      results.push({ 
        id: player.id, 
        photo: generateAvatar(player.name, team) 
      });
    }
    
    // تاخیر برای جلوگیری از محدودیت API
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('✅ همه عکس‌ها گرفته شد');
  return results;
}
