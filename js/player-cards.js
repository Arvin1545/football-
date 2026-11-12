// player-cards.js
// ساخت کارت گرافیکی برای بازیکنان (بدون عکس)

// ====================================================
// آرم‌های تیم‌ها (ایموجی)
// ====================================================
const TEAM_EMBLEMS = {
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 لیگ انگلیس
  'Arsenal': '🔴',
  'Manchester City': '🔵',
  'Liverpool': '🔴',
  'Manchester United': '🔴',
  'Chelsea': '🔵',
  'Tottenham Hotspur': '⚪',
  'Newcastle United': '⚫',
  'Aston Villa': '🟣',
  'Brighton': '🔵',
  'West Ham United': '🔴',
  'Crystal Palace': '🔵',
  'Everton': '🔵',
  'Fulham': '⚪',
  'Brentford': '🔴',
  'Wolverhampton': '🟠',
  'Nottingham Forest': '🔴',
  'Bournemouth': '🔴',
  'Leeds United': '⚪',
  'Ipswich Town': '🔵',
  'Sunderland': '🔴',
  
  // 🇪🇸 لا لیگا
  'Real Madrid': '⚪',
  'Barcelona': '🔵',
  'Atletico Madrid': '🔴',
  'Athletic Bilbao': '🔴',
  'Real Betis': '🟢',
  'Osasuna': '🔴',
  'Celta Vigo': '🔵',
  'Deportivo Alaves': '🔵',
  'Elche': '⚪',
  'Getafe': '🔵',
  'Levante': '🔴',
  'Malaga': '🔵',
  'Racing Santander': '🔵',
  'Rayo Vallecano': '⚪',
  'Deportivo La Coruna': '🔵',
  'Espanyol': '🔵',
  'Real Sociedad': '🔵',
  'Sevilla': '🔴',
  'Valencia': '⚪',
  'Villarreal': '🟡',
  'Girona': '🔴',
  
  // 🇩🇪 بوندس‌لیگا
  'Bayern Munich': '🔴',
  'Borussia Dortmund': '🟡',
  'RB Leipzig': '🔴',
  'Bayer Leverkusen': '🔴',
  'VfB Stuttgart': '⚪',
  'Eintracht Frankfurt': '⚫',
  'VfL Wolfsburg': '🟢',
  'SC Freiburg': '⚫',
  'TSG Hoffenheim': '🔵',
  'Borussia Monchengladbach': '⚫',
  'Mainz 05': '🔴',
  'Union Berlin': '🔴',
  'VfL Bochum': '🔵',
  'Werder Bremen': '🟢',
  'FC Augsburg': '🔴',
  'Heidenheim': '🔴',
  'St. Pauli': '🟤',
  'Holstein Kiel': '🔵',
  
  // 🇮🇹 سری آ
  'Inter': '🔵',
  'AC Milan': '🔴',
  'Juventus': '⚫',
  'Napoli': '🔵',
  'AS Roma': '🟡',
  'Lazio': '🔵',
  'Atalanta': '🔵',
  'Fiorentina': '🟣',
  'Bologna': '🔴',
  'Torino': '🔴',
  'Udinese': '⚫',
  'Cagliari': '🔴',
  'Como': '🔵',
  'Genoa': '🔴',
  'Lecce': '🔴',
  'Monza': '🔴',
  'Parma': '🟡',
  'Sassuolo': '🟢',
  'Venezia': '🟢',
  
  // 🇫🇷 لیگ ۱
  'Paris Saint-Germain': '🔵',
  'Marseille': '🔵',
  'Monaco': '🔴',
  'Lyon': '⚪',
  'Lille': '🔴',
  'Nice': '🔴',
  'Lens': '🟡',
  'Rennes': '🔴',
  'Strasbourg': '🔵',
  'Toulouse': '🟣',
  'Nantes': '🟡',
  'Reims': '🔴',
  'Brest': '🔴',
  'Le Havre': '🔵',
  'Metz': '🔴',
  'Saint-Etienne': '🟢',
  'Angers': '⚫',
  'Auxerre': '⚪'
};

// ====================================================
// گرفتن آرم تیم
// ====================================================
export function getTeamEmblem(teamName) {
  return TEAM_EMBLEMS[teamName] || '⚽';
}

// ====================================================
// ساخت کارت بازیکن (HTML)
// ====================================================
export function renderPlayerCard(player, team) {
  const tier = getOverallTier(player.overall);
  const posColor = getPositionColor(player.position);
  const emblem = getTeamEmblem(team.name);
  
  return `
    <div class="player-card" 
         data-id="${player.id}"
         style="--team-primary: ${team.primary_color}; --team-secondary: ${team.secondary_color};">
      
      <div class="player-card-bg"></div>
      
      <div class="player-card-content">
        <!-- بالا: اورال + پست -->
        <div class="player-card-top">
          <div class="player-overall" style="color: ${tier.color};">
            ${player.overall}
            <span class="ovr-label">OVR</span>
          </div>
          <div class="player-position" style="background: ${posColor};">
            ${player.position}
          </div>
        </div>
        
        <!-- وسط: آرم تیم + اسم -->
        <div class="player-card-middle">
          <div class="team-emblem">${emblem}</div>
          <div class="player-name-large">${player.name}</div>
        </div>
        
        <!-- پایین: شماره + اطلاعات -->
        <div class="player-card-bottom">
          <div class="shirt-number">${player.shirt_number || '?'}</div>
          <div class="player-mini-info">
            <span>${player.age} سال</span>
            <span>•</span>
            <span>${player.total_goals || 0} گل</span>
          </div>
        </div>
      </div>
      
      ${player.is_starter ? '<div class="starter-badge">✅</div>' : ''}
    </div>
  `;
}

// ====================================================
// رنگ اورال
// ====================================================
function getOverallTier(overall) {
  if (overall >= 90) return { tier: 'legendary', color: '#fbbf24' };
  if (overall >= 85) return { tier: 'epic', color: '#a855f7' };
  if (overall >= 80) return { tier: 'gold', color: '#f59e0b' };
  if (overall >= 75) return { tier: 'silver', color: '#94a3b8' };
  return { tier: 'bronze', color: '#cd7f32' };
}

// ====================================================
// رنگ پست
// ====================================================
function getPositionColor(pos) {
  if (pos === 'GK') return '#f59e0b';
  if (['CB', 'LB', 'RB'].includes(pos)) return '#3b82f6';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return '#10b981';
  if (['LW', 'RW', 'ST'].includes(pos)) return '#ef4444';
  return '#6b7280';
  }
