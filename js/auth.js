// auth.js
// مدیریت احراز هویت

import { supabase } from './supabase-client.js';
import { loginAsGuest } from './guest.js';

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
  loadingText: document.getElementById('loadingText')
};

const FAKE_DOMAIN = 'football-manager.local';

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${FAKE_DOMAIN}`;
}

function showStep(step) {
  els.welcomeStep.style.display = 'none';
  els.signupStep.style.display = 'none';
  els.loginStep.style.display = 'none';
  els.guestStep.style.display = 'none';
  
  if (step === 'welcome') els.welcomeStep.style.display = 'block';
  if (step === 'signup') els.signupStep.style.display = 'block';
  if (step === 'login') els.loginStep.style.display = 'block';
  if (step === 'guest') els.guestStep.style.display = 'block';
  
  clearMessages();
}

els.hasAccountBtn?.addEventListener('click', () => showStep('login'));
els.noAccountBtn?.addEventListener('click', () => showStep('signup'));
els.guestBtn?.addEventListener('click', () => showStep('guest'));
els.backFromSignup?.addEventListener('click', () => showStep('welcome'));
els.backFromLogin?.addEventListener('click', () => showStep('welcome'));
els.backFromGuest?.addEventListener('click', () => showStep('welcome'));

function showError(msg) {
  els.errorMsg.textContent = msg;
  els.successMsg.textContent = '';
}

function showSuccess(msg) {
  els.successMsg.textContent = msg;
  els.errorMsg.textContent = '';
}

function clearMessages() {
  els.errorMsg.textContent = '';
  els.successMsg.textContent = '';
}

function translateError(error) {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) return 'یوزرنیم یا رمز عبور اشتباهه';
  if (msg.includes('User already registered')) return 'این یوزرنیم قبلاً گرفته شده';
  if (msg.includes('Password should be at least')) return 'رمز باید حداقل ۶ حرف باشه';
  if (msg.includes('rate limit')) return 'درخواست‌های زیاد. صبر کن';
  if (msg.includes('network')) return 'مشکل اتصال اینترنت';
  if (msg.includes('duplicate') || msg.includes('unique')) return 'این یوزرنیم قبلاً گرفته شده';
  return msg || 'خطای نامشخص';
}

// ====================================================
// ثبت‌نام → برو انتخاب تیم
// ====================================================
els.signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const name = els.signupName.value.trim();
  const username = els.signupUsername.value.trim().toLowerCase();
  const password = els.signupPassword.value;
  
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
    els.loadingText.textContent = 'در حال ساخت اکانت...';
    els.loadingOverlay.hidden = false;
    
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    
    if (existingUser) {
      els.loadingOverlay.hidden = true;
      showError('این یوزرنیم قبلاً گرفته شده');
      return;
    }
    
    const fakeEmail = usernameToEmail(username);
    
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
    
    showSuccess('🎉 اکانت ساخته شد! حالا تیمت رو انتخاب کن');
    setTimeout(() => {
      window.location.href = 'team-select.html';
    }, 1200);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError(translateError(error));
  }
});

// ====================================================
// ورود
// ====================================================
els.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const username = els.loginUsername.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  
  if (!username || !password) {
    showError('یوزرنیم و رمز عبور رو پر کن');
    return;
  }
  
  try {
    els.loadingText.textContent = 'در حال ورود...';
    els.loadingOverlay.hidden = false;
    
    const fakeEmail = usernameToEmail(username);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password
    });
    
    if (error) throw error;
    
    // چک کن تیم داره یا نه
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('taken_by', data.user.id)
      .maybeSingle();
    
    showSuccess('👋 خوش برگشتی!');
    setTimeout(() => {
      if (team) {
        window.location.href = 'dashboard.html';
      } else {
        window.location.href = 'team-select.html';
      }
    }, 800);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError(translateError(error));
  }
});

// ====================================================
// مهمان
// ====================================================
els.guestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  
  const name = els.guestName.value.trim();
  
  if (!name || name.length < 2) {
    showError('اسمت رو درست وارد کن');
    return;
  }
  
  try {
    els.loadingText.textContent = 'در حال ورود...';
    els.loadingOverlay.hidden = false;
    
    await loginAsGuest(name);
    
    showSuccess('🎮 خوش اومدی ' + name + '!');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
    
  } catch (error) {
    console.error(error);
    els.loadingOverlay.hidden = true;
    showError('خطا در ورود مهمان');
  }
});

// ====================================================
// چک نشست
// ====================================================
async function checkExistingSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('taken_by', session.user.id)
      .maybeSingle();
    
    if (team) {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'team-select.html';
    }
    return;
  }
  
  const guestId = localStorage.getItem('fm_guest_id');
  if (guestId) {
    const { data } = await supabase
      .from('guests')
      .select('id')
      .eq('device_id', guestId)
      .maybeSingle();
    
    if (data) {
      window.location.href = 'dashboard.html';
    }
  }
}

checkExistingSession();
