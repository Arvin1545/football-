// team-name-map.js
// نقشه اسم فارسی تیم‌ها به انگلیسی

export const TEAM_NAME_MAP = {
  
  // ============================================
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 لیگ انگلیس
  // ============================================
  'بورنموث': 'Bournemouth',
  'آرسنال': 'Arsenal',
  'استون ویلا': 'Aston Villa',
  'برنتفورد': 'Brentford',
  'برایتن': 'Brighton',
  'چلسی': 'Chelsea',
  'کریستال پالاس': 'Crystal Palace',
  'اورتون': 'Everton',
  'فولام': 'Fulham',
  'ایپسویچ': 'Ipswich Town',
  'لیدز': 'Leeds United',
  'لیورپول': 'Liverpool',
  'منچستر سیتی': 'Manchester City',
  'منچستر یونایتد': 'Manchester United',
  'نیوکاسل': 'Newcastle United',
  'ناتینگهام': 'Nottingham Forest',
  'ناتینگهام فارست': 'Nottingham Forest',
  'ساندرلند': 'Sunderland',
  'تاتنهام': 'Tottenham Hotspur',
  'وستهام': 'West Ham United',
  'ولورهمپتون': 'Wolverhampton',
  
  // ============================================
  // 🇪🇸 لا لیگا
  // ============================================
  'رئال مادرید': 'Real Madrid',
  'بارسلونا': 'Barcelona',
  'اتلتیکو مادرید': 'Atletico Madrid',
  'اتلتیک بیلبائو': 'Athletic Bilbao',
  'رئال بتیس': 'Real Betis',
  'اوساسونا': 'Osasuna',
  'سلتاویگو': 'Celta Vigo',
  'دپورتیوو آلاوس': 'Deportivo Alaves',
  'الچه': 'Elche',
  'ختافه': 'Getafe',
  'لوانته': 'Levante',
  'مالاگا': 'Malaga',
  'ریسینگ سانتاندر': 'Racing Santander',
  'رایو وایکانو': 'Rayo Vallecano',
  'دپورتیوو لاکرونیا': 'Deportivo La Coruna',
  'اسپانیول': 'Espanyol',
  'رئال سوسیداد': 'Real Sociedad',
  'سویا': 'Sevilla',
  'والنسیا': 'Valencia',
  'ویارئال': 'Villarreal',
  'خیرونا': 'Girona',
  
  // ============================================
  // 🇩🇪 بوندس‌لیگا
  // ============================================
  'بایرن مونیخ': 'Bayern Munich',
  'دورتموند': 'Borussia Dortmund',
  'لایپزیگ': 'RB Leipzig',
  'بایر لورکوزن': 'Bayer Leverkusen',
  'اشتوتگارت': 'VfB Stuttgart',
  'فرانکفورت': 'Eintracht Frankfurt',
  'وولفسبورگ': 'VfL Wolfsburg',
  'فرایبورگ': 'SC Freiburg',
  'هوفنهایم': 'TSG Hoffenheim',
  'مونشن‌گلادباخ': 'Borussia Monchengladbach',
  'ماینتس': 'Mainz 05',
  'یونیون برلین': 'Union Berlin',
  'بوخوم': 'VfL Bochum',
  'وردربرمن': 'Werder Bremen',
  'آگزبورگ': 'FC Augsburg',
  'هایدنهایم': 'Heidenheim',
  'سنت پائولی': 'St. Pauli',
  'هولشتاین کیل': 'Holstein Kiel',
  
  // ============================================
  // 🇮🇹 سری آ
  // ============================================
  'اینتر': 'Inter',
  'اینتر میلان': 'Inter',
  'میلان': 'AC Milan',
  'یوونتوس': 'Juventus',
  'ناپولی': 'Napoli',
  'رم': 'AS Roma',
  'لاتزیو': 'Lazio',
  'آتالانتا': 'Atalanta',
  'فیورنتینا': 'Fiorentina',
  'بولونیا': 'Bologna',
  'تورینو': 'Torino',
  'اودینزه': 'Udinese',
  'کالیاری': 'Cagliari',
  'کومو': 'Como',
  'جنوا': 'Genoa',
  'لچه': 'Lecce',
  'مونزا': 'Monza',
  'پارما': 'Parma',
  'ساسولو': 'Sassuolo',
  'ونیزیا': 'Venezia',
  'فروزینونه': 'Frosinone',
  'پیزا': 'AC Pisa',
  
  // ============================================
  // 🇫🇷 لیگ ۱
  // ============================================
  'پاری سن ژرمن': 'Paris Saint-Germain',
  'پاری سن‌ژرمن': 'Paris Saint-Germain',
  'مارسی': 'Marseille',
  'موناکو': 'Monaco',
  'لیون': 'Lyon',
  'لیل': 'Lille',
  'نیس': 'Nice',
  'لانس': 'Lens',
  'رن': 'Rennes',
  'استراسبورگ': 'Strasbourg',
  'تولوز': 'Toulouse',
  'نانت': 'Nantes',
  'رنس': 'Reims',
  'برست': 'Brest',
  'لوهاور': 'Le Havre',
  'لو آور': 'Le Havre',
  'متز': 'Metz',
  'سن اتین': 'Saint-Etienne',
  'سنت اتین': 'Saint-Etienne',
  'آنژه': 'Angers',
  'اوسر': 'Auxerre'
};

// ====================================================
// تبدیل اسم فارسی به انگلیسی
// ====================================================
export function toEnglishTeamName(persianName) {
  if (!persianName) return null;
  return TEAM_NAME_MAP[persianName] || persianName;
}

// ====================================================
// تبدیل اسم انگلیسی به فارسی
// ====================================================
export function toPersianTeamName(englishName) {
  if (!englishName) return null;
  const entry = Object.entries(TEAM_NAME_MAP).find(([_, en]) => en === englishName);
  return entry ? entry[0] : englishName;
}
