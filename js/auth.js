// auth.js
// مدیریت احراز هویت - امپراتور فوتبال

import { supabase } from './supabase-client.js';
import { loginAsGuest } from './guest.js';

// ====================================================
// المان‌های صفحه
// ====================================================
const els = {
  welcomeStep: document.getElementById('welcomeStep'),
  signupStep: document.getElementById('signupStep'),
  loginStep: document.getElementById('loginStep'),
  guestStep: document.getElementById('guestStep'),
  
  hasAccountBtn: document.getElementById('hasAccountBtn'),
  noAccountBtn: document.getElementById('noAccountBtn'),
  backFromSignup: document.getElementById('backFromSignup'),
  backFromLogin: document.getElementById('backFromLogin'),
  backFromGuest: document.getElementById('backFromGuest'),
  guestBtn: document.getElementById('guestLoginBtn'),
  
  signupForm: document.getElementById('signupForm'),
  loginForm: document.getElementById('loginForm'),
  guestForm: document.getElementById('guestForm'),
  
  signupName: document.getElementById('signupName'),
  signupUsername: document.getElementById('signupUsername'),
  signupPassword: document.getElementById('signupPassword'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  guestName: document.getElementById('guestName'),
  
  errorMsg: document.getElementById('errorMessage'),
  successMsg: document.getElementById('successMessage'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  coachMessage: document.getElementById('coachMessage')
};

// دامنه جعلی برای ساخت ایمیل از یوزرنیم
const FAKE_DOMAIN = 'football-manager.local';

// ====================================================
// پیام‌های مربی
// ====================================================
const coachMessages = {
  welcome: 'سلام مدیر! خوش آمدی به امپراتور فوتبال ⚽',
  signup: 'یه مدیر جدید! بذار تیمت رو بسازیم 🌟',
  login: 'خوش برگشتی، مدیر! تیمت منتظرته 👋',
  guest: 'حالت چطوره مهمان؟ اسمت رو بگو تا شروع کنیم 👤'
};

function updateCoach(message) {
  if (els.coachMessage) {
    els.coachMessage.style.opacity = '0';
    setTimeout(() => {
      els.coachMessage.textContent = message;
      els.coachMessage.style.opacity = '1';
    }, 200);
  }
}

// ====================================================
// ساخت ایمیل از یوزرنیم
// ====================================================
function usernameToEmail(username) {
  return `${username.toLowerCase()}@${FAKE_DOMAIN}`;
}

// ====================================================
// مدیریت صفحه‌ها
// ====================================================
function showStep(step) {
  // مخفی کردن همه
  if (els.welcomeStep) els.welcomeStep.style.display = 'none';
  if (els.signupStep) els.signupStep.style.display = 'none';
  if (els.loginStep) els.loginStep.style.display = 'none';
  if (els.guestStep) els.guestStep.style.display = 'none';
  
  // نمایش صفحه مورد نظر
  if (step === 'welcome') {
    if (els.welcomeStep) els.welcomeStep.style.display = 'block';
    updateCoach(coachMessages.welcome);
  }
  if (step === 'signup') {
    if (els.signupStep) els.signupStep.style.display = 'block';
    updateCoach(coachMessages.signup);
  }
  if (step === 'login') {
    if (els.loginStep) els.loginStep.style.display = 'block';
    updateCoach(coachMessages.login);
  }
  if (step === 'guest') {
    if (els.guestStep) els.guestStep.style.display = 'block';
    updateCoach(coachMessages.guest);
  }
  
  clearMessages();
}

// ====================================================
// رویدادهای دکمه‌ها
// ====================================================
els.hasAccountBtn?.addEventListener('click', () => showStep('login'));
els.noAccountBtn?.addEventListener('click', () => showStep('signup'));
els.guestBtn?.addEventListener('click', () => showStep('guest'));
els.backFromSignup?.addEventListener('click', () => showStep('welcome'));
els.backFromLogin?.addEventListener('click', () => showStep('welcome'));
els.backFromGuest?.addEventListener('click', () => showStep('welcome'));

// ====================================================
// پیام‌ها
// ====================================================
function showError(msg) {
  if (els.errorMsg) els.errorMsg.textContent = msg;
  if (els.successMsg) els.successMsg.textContent = '';
}

function showSuccess(msg) {
  if (els.successMsg) els.successMsg.textContent = msg;
  if (els.errorMsg) els.errorMsg.textContent = '';
}

function clearMessages() {
  if (els.errorMsg) els.errorMsg.textContent = '';
  if (els.successMsg) els.successMsg.textContent = '';
}

// ====================================================
// ترجمه خطاهای Supabase
// ====================================================
function translateError(error) {
  const msg = error?.message || '';
  
  if (msg.includes('Invalid login credentials')) return 'یوزرنیم یا رمز عبور اشتباهه';
  if (msg.includes('User already registered')) return 'این یوزرنیم قبلاً گرفته شده';
  if (msg.includes('Password should be at least')) return 'رمز باید حداقل ۶ حرف باشه';
  if (msg.includes('rate limit')) return 'درخواست‌های زیاد. یه دقیقه صبر کن';
  if (msg.includes('network')) return 'مشکل اتصال اینترنت';
  if (msg.includes('duplicate') || msg.includes('unique')) return 'این یوزرنیم قبلاً گرفته شده';
  if (msg.includes('Unable to validate email')) return 'ایمیل معتبر نیست';
  
  return msg || 'خطای نامشخص. دوباره تلاش کن';
}

// ====================================================
// ثبت‌نام
// ====================================================
els.signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const name = els.signupName?.value.trim() || '';
  const username = els.signupUsername?.value.trim().toLowerCase() || '';
  const password = els.signupPassword?.value || '';
  
  // اعتبارسنجی
  if (!name || !username || !password) {
    showError('همه فیلدها رو پر کن');
    return;
  }
  
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    showError('یوزرنیم باید ۳ تا ۲۰ حرف انگلیسی، عدد یا _ باشه');
    return;
  }
  
  if (password.length < 6) {
    showError('رمز باید حداقل ۶ حرف باشه');
    return;
  }
  
  try {
    if (els.loadingText) els.loadingText.textContent = 'در حال ساخت اکانت...';
    if (els.loadingOverlay) els.loadingOverlay.hidden = false;
    
    console.log('🔵 [SIGNUP] شروع:', username);
    
    // چک یوزرنیم تکراری
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    
    if (existingUser) {
      if (els.loadingOverlay) els.loadingOverlay.hidden = true;
      showError('این یوزرنیم قبلاً گرفته شده');
      return;
    }
    
    const fakeEmail = usernameToEmail(username);
    
    console.log('🔵 [SIGNUP] ثبت‌نام در Auth...');
    
    // ثبت‌نام در Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: {
        data: {
          full_name: name,
          display_name: name,
          username: username
        }
      }
    });
    
    if (error) throw error;
    
    console.log('✅ [SIGNUP] کاربر ساخته شد:', data.user?.id);
    
    // ساخت پروفایل
    if (data.user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (!existingProfile) {
        console.log('🔵 [SIGNUP] ساخت پروفایل...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: fakeEmail,
            display_name: name,
            username: username,
            coins: 1000,
            gems: 50,
            level: 1
          });
        
        if (profileError) {
          console.error('⚠️ [SIGNUP] خطا در پروفایل:', profileError);
          // ادامه بده، dashboard.js خودش می‌سازه
        }
      }
    }
    
    if (els.loadingText) els.loadingText.textContent = '🎉 حالا تیمت رو انتخاب کن!';
    
    // رفتن به صفحه انتخاب لیگ
    setTimeout(() => {
      window.location.href = 'league-select.html';
    }, 1200);
    
  } catch (error) {
    console.error('❌ [SIGNUP] خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    showError(translateError(error));
  }
});

// ====================================================
// ورود
// ====================================================
els.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const username = els.loginUsername?.value.trim().toLowerCase() || '';
  const password = els.loginPassword?.value || '';
  
  if (!username || !password) {
    showError('یوزرنیم و رمز عبور رو پر کن');
    return;
  }
  
  try {
    if (els.loadingText) els.loadingText.textContent = 'در حال ورود...';
    if (els.loadingOverlay) els.loadingOverlay.hidden = false;
    
    console.log('🔵 [LOGIN] شروع:', username);
    
    const fakeEmail = usernameToEmail(username);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password
    });
    
    if (error) throw error;
    
    console.log('✅ [LOGIN] ورود موفق');
    
    // چک کن تیم داره
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('taken_by', data.user.id)
      .maybeSingle();
    
    if (els.loadingText) els.loadingText.textContent = '👋 خوش برگشتی!';
    
    setTimeout(() => {
      if (team) {
        // تیم داره → داشبورد
        window.location.href = 'dashboard.html';
      } else {
        // تیم نداره → انتخاب لیگ
        window.location.href = 'league-select.html';
      }
    }, 800);
    
  } catch (error) {
    console.error('❌ [LOGIN] خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    showError(translateError(error));
  }
});

// ====================================================
// ورود مهمان
// ====================================================
els.guestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const name = els.guestName?.value.trim() || '';
  
  if (!name || name.length < 2) {
    showError('اسمت رو درست وارد کن (حداقل ۲ حرف)');
    return;
  }
  
  try {
    if (els.loadingText) els.loadingText.textContent = 'در حال ورود به بازی...';
    if (els.loadingOverlay) els.loadingOverlay.hidden = false;
    
    console.log('🔵 [GUEST] شروع:', name);
    
    await loginAsGuest(name);
    
    console.log('✅ [GUEST] موفق');
    
    if (els.loadingText) els.loadingText.textContent = '🎮 خوش اومدی ' + name + '!';
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    console.error('❌ [GUEST] خطا:', error);
    if (els.loadingOverlay) els.loadingOverlay.hidden = true;
    showError('خطا در ورود مهمان. دوباره تلاش کن');
  }
});

// ====================================================
// چک نشست قبلی
// ====================================================
async function checkExistingSession() {
  console.log('🔵 [CHECK] چک نشست...');
  
  // چک کاربر لاگین‌کرده
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    console.log('✅ [CHECK] کاربر لاگین‌کرده');
    
    // چک کن تیم داره
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('taken_by', session.user.id)
      .maybeSingle();
    
    if (team) {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'league-select.html';
    }
    return;
  }
  
  // چک مهمان
  const guestId = localStorage.getItem('fm_guest_id');
  if (guestId) {
    console.log('🔵 [CHECK] چک مهمان...');
    
    const { data } = await supabase
      .from('guests')
      .select('id')
      .eq('device_id', guestId)
      .maybeSingle();
    
    if (data) {
      console.log('✅ [CHECK] مهمان پیدا شد');
      window.location.href = 'dashboard.html';
      return;
    }
  }
  
  console.log('🔵 [CHECK] نه کاربر، نه مهمان → بمون');
}

// ====================================================
// شروع
// ====================================================
checkExistingSession();
