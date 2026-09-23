// player-photos.js
// سیستم چند-منبعی برای گرفتن عکس بازیکنان

// ====================================================
// ۱. Wikipedia (کار می‌کنه از ایران)
// ====================================================
async function getFromWikipedia(playerName) {
  try {
    // تبدیل اسم به فرمت Wikipedia
    const wikiName = playerName.replace(/ /g, '_');
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.thumbnail && data.thumbnail.source) {
      // عکس با سایز بزرگ‌تر
      return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
    }
    if (data.originalimage && data.originalimage.source) {
      return data.originalimage.source;
    }
    return null;
  } catch (error) {
    console.warn('Wikipedia خطا:', playerName, error.message);
    return null;
  }
}

// ====================================================
// ۲. TheSportsDB با Proxy
// ====================================================
async function getFromSportsDB(playerName) {
  try {
    const apiUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`;
    
    // استفاده از Proxy برای دور زدن فیلتر
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.player && data.player[0]) {
      const photo = data.player[0].strThumb || 
                    data.player[0].strCutout || 
                    data.player[0].strRender;
      if (photo) return photo;
    }
    return null;
  } catch (error) {
    console.warn('SportsDB خطا:', playerName, error.message);
    return null;
  }
}

// ====================================================
// ۳. تولید آواتار جذاب (fallback)
// ====================================================
export function generateAvatar(playerName, team = null, shirtNumber = null) {
  const initial = (playerName || 'P').charAt(0).toUpperCase();
  
  let color1 = '#7c3aed';
  let color2 = '#ec4899';
  
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
      <circle cx="100" cy="75" r="40" fill="rgba(255,255,255,0.2)"/>
      <text x="100" y="90" font-size="55" font-weight="bold" 
            fill="white" text-anchor="middle" font-family="Arial">
        ${initial}
      </text>
      ${shirtNumber ? `
        <circle cx="170" cy="30" r="22" fill="rgba(0,0,0,0.3)"/>
        <text x="170" y="38" font-size="22" font-weight="bold" 
              fill="white" text-anchor="middle" font-family="Arial">
          ${shirtNumber}
        </text>
      ` : ''}
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ====================================================
// گرفتن عکس از همه منابع
// ====================================================
export async function getPlayerPhoto(playerName, team = null, shirtNumber = null) {
  if (!playerName) return null;
  
  console.log('🔍 جستجو:', playerName);
  
  // ۱. Wikipedia (سریع‌ترین)
  let photo = await getFromWikipedia(playerName);
  if (photo) {
    console.log('✅ Wikipedia:', playerName);
    return photo;
  }
  
  // ۲. TheSportsDB با Proxy
  photo = await getFromSportsDB(playerName);
  if (photo) {
    console.log('✅ SportsDB:', playerName);
    return photo;
  }
  
  // ۳. آواتار
  console.log('⚠️ آواتار:', playerName);
  return generateAvatar(playerName, team, shirtNumber);
}

// ====================================================
// بارگذاری عکس برای همه بازیکنان
// ====================================================
export async function loadAllPlayerPhotos(players, team, onProgress) {
  console.log('📸 بارگذاری', players.length, 'عکس...');
  
  const results = [];
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    
    try {
      const photo = await getPlayerPhoto(player.name, team, player.shirt_number);
      results.push({ id: player.id, photo });
      
      if (onProgress) {
        onProgress(i + 1, players.length, player.name);
      }
    } catch (error) {
      console.error('خطا:', player.name, error);
      results.push({ 
        id: player.id, 
        photo: generateAvatar(player.name, team, player.shirt_number) 
      });
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('✅ همه عکس‌ها گرفته شد');
  return results;
}
