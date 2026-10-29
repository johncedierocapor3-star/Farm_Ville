/* ===== Farmville auth (no database: everything lives in this browser's storage) ===== */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

const DEFAULT_ROOMS = [
  {id:'standard', name:'Standard Room', price:180, capacity:2, capacityLabel:'2 Adults', img:'room-a', photo:null, active:true,
   cardDesc:"Thoughtfully furnished with locally made decor and forest views.",
   shortDesc:"Thoughtfully furnished with locally made decor and forest views.",
   desc:"A cozy, sunlit cabin perfect for solo travelers or couples who want the essentials done beautifully — a comfortable queen bed, a private porch, and quiet forest views right outside your window.",
   features:["Queen bed","Private porch","Forest view","Free Wi-Fi","Rain shower","Daily housekeeping"]},
  {id:'deluxe', name:'Deluxe Cabin', price:290, capacity:4, capacityLabel:'4 Guests', img:'room-b', photo:null, active:true,
   cardDesc:"Spacious cabin with private deck facing the valley.",
   shortDesc:"Spacious cabin with private deck facing the valley.",
   desc:"Extra room to breathe, with a separate sitting area and a private deck facing the valley. Ideal for small families or friends who want their own space at the end of the day.",
   features:["Queen bed","Sitting area","Private deck","Free Wi-Fi","Rain shower","Mini fridge"]},
  {id:'suite', name:'Forest Suite', price:420, capacity:2, capacityLabel:'2 Adults', img:'room-c', photo:null, active:true,
   cardDesc:"Our most romantic stay with king bed and soaking tub.",
   shortDesc:"Our most romantic stay with king bed and soaking tub.",
   desc:"Our most romantic stay — a king suite with a soaking tub, floor-to-ceiling windows, and a private firepit tucked just outside, framed by old-growth trees.",
   features:["King bed","Soaking tub","Private firepit","Free Wi-Fi","Floor-to-ceiling windows","Turndown service"]},
  {id:'villa', name:'Family Villa', price:550, capacity:6, capacityLabel:'6 Guests', img:'room-d', photo:null, active:true,
   cardDesc:"A full two-story cabin with room for the whole family to unwind together.",
   shortDesc:"A full two-story cabin with room for the whole family to unwind together.",
   desc:"A full two-story cabin built for gatherings, with two bedrooms, a shared lounge, and a wraparound porch big enough for the whole family to unwind together.",
   features:["2 bedrooms","Shared lounge","Wraparound porch","Free Wi-Fi","Full kitchenette","Board games included"]},
  {id:'cottage', name:'Glass Cottage', price:490, capacity:2, capacityLabel:'2 Guests', img:'room-e', photo:null, active:true,
   cardDesc:"An all-glass cottage with stargazing deck and total privacy.",
   shortDesc:"An all-glass cottage with stargazing deck and total privacy.",
   desc:"A striking all-glass cottage that puts the forest right in your living room. Wake up to birdsong and fall asleep under a canopy of stars, with total privacy.",
   features:["Queen bed","All-glass walls","Blackout curtains","Free Wi-Fi","Stargazing deck","Rain shower"]},
];

function readJSON(key, fallback){
  try{ const v = JSON.parse(localStorage.getItem(key)); return (v === null || v === undefined) ? fallback : v; }
  catch(e){ return fallback; }
}
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function peso(n){
  return '₱' + Number(n || 0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function getUsers(){ const u = readJSON('farmville_users', []); return Array.isArray(u) ? u : []; }
function saveUsers(list){ localStorage.setItem('farmville_users', JSON.stringify(list)); }
function getBookings(){ const b = readJSON('farmville_bookings', []); return Array.isArray(b) ? b : []; }
function getRooms(){ const r = readJSON('farmville_rooms', null); return (Array.isArray(r) && r.length) ? r : DEFAULT_ROOMS; }

const DEFAULT_GALLERY = [
  {id:'gal-1', category:'resort', caption:'Valley Sunset View', src:'https://picsum.photos/seed/gallery-1/500/650'},
  {id:'gal-2', category:'rooms', caption:'Forest Suite Bedroom', src:'https://picsum.photos/seed/gallery-2/500/400'},
  {id:'gal-3', category:'pool', caption:'Geothermal Heated Spring', src:'https://picsum.photos/seed/gallery-3/500/650'},
  {id:'gal-4', category:'garden', caption:'Organic Farm Flora', src:'https://picsum.photos/seed/gallery-4/500/400'},
  {id:'gal-5', category:'garden', caption:'Greenhouse Sanctuary', src:'https://picsum.photos/seed/gallery-5/500/400'},
  {id:'gal-6', category:'resort', caption:'Morning Pine Mist', src:'https://picsum.photos/seed/gallery-6/500/650'},
  {id:'gal-7', category:'pool', caption:'Poolside Loungers', src:'https://picsum.photos/seed/gallery-7/500/400'},
  {id:'gal-8', category:'resort', caption:'Main Lodge Architecture', src:'https://picsum.photos/seed/gallery-8/500/400'},
  {id:'gal-9', category:'rooms', caption:'Glass Cottage Canopy', src:'https://picsum.photos/seed/gallery-9/500/400'},
  {id:'gal-10', category:'pool', caption:'Night Dip Firepits', src:'https://picsum.photos/seed/gallery-10/500/400'},
  {id:'gal-11', category:'garden', caption:'Wildflower Walking Path', src:'https://picsum.photos/seed/gallery-11/500/650'},
  {id:'gal-12', category:'rooms', caption:'Deluxe Cabin Balcony', src:'https://picsum.photos/seed/gallery-12/500/400'}
];

function getGallery(){
  const g = readJSON('farmville_gallery', null);
  return Array.isArray(g) ? g : DEFAULT_GALLERY;
}
function saveGallery(list){
  localStorage.setItem('farmville_gallery', JSON.stringify(list));
}

function getActiveBookingForRoom(roomId, roomName, ciDate, coDate){
  const bookings = getBookings();
  const activeStatuses = ['Confirmed', 'Checked-in'];
  const activeBookings = bookings.filter(b => activeStatuses.includes(b.status || 'Confirmed'));

  return activeBookings.find(b => {
    const isRoom = (b.roomId && roomId && b.roomId === roomId) || (b.roomName && roomName && b.roomName.trim().toLowerCase() === roomName.trim().toLowerCase());
    if(!isRoom) return false;

    // If specific dates are requested, check date interval overlap:
    if(ciDate && coDate){
      const tStart = new Date(ciDate).getTime();
      const tEnd = new Date(coDate).getTime();
      const bStart = new Date(b.ci).getTime();
      const bEnd = new Date(b.co).getTime();
      if(!isNaN(tStart) && !isNaN(tEnd) && !isNaN(bStart) && !isNaN(bEnd)){
        return (tStart < bEnd && tEnd > bStart);
      }
    }

    // Default: room is occupied if checkout date hasn't passed
    const today = new Date().toISOString().slice(0, 10);
    return !b.co || b.co >= today;
  });
}

function isRoomAvailable(room, ciDate, coDate){
  if(!room) return false;
  if(room.active === false) return false;
  if(room.occupied === true) return false;
  const activeBooking = getActiveBookingForRoom(room.id, room.name, ciDate, coDate);
  return !activeBooking;
}

function getSession(){
  try{ return JSON.parse(sessionStorage.getItem('farmville_session') || localStorage.getItem('farmville_session')); }
  catch(e){ return null; }
}
function clearSession(){ sessionStorage.removeItem('farmville_session'); localStorage.removeItem('farmville_session'); }
function setSession(user, remember){
  clearSession();
  const data = JSON.stringify({name:user.name, email:user.email, phone:user.phone});
  (remember ? localStorage : sessionStorage).setItem('farmville_session', data);
}

/* ---- form helpers ---- */
function setErr(fieldId, msg){
  const f = document.getElementById(fieldId); if(!f) return;
  f.classList.add('error');
  const m = f.querySelector('.err-msg'); if(m) m.textContent = msg;
}
function showMsg(id, type, text){
  const m = document.getElementById(id); if(!m) return;
  m.className = 'form-msg show ' + type; m.textContent = text;
}
function resetForm(form){
  form.querySelectorAll('.field.error').forEach(f => f.classList.remove('error'));
  const m = form.querySelector('.form-msg'); if(m){ m.className = 'form-msg'; m.textContent = ''; }
}
function clearOnInput(form){
  form.addEventListener('input', e => { const f = e.target.closest('.field'); if(f) f.classList.remove('error'); });
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---- login (also accepts the admin account) ---- */
function initLogin(){
  const form = document.getElementById('login-form'); if(!form) return;
  clearOnInput(form);
  if(new URLSearchParams(location.search).get('registered')) showMsg('login-msg', 'success', 'Account created! You can now sign in.');

  document.getElementById('forgot-link').addEventListener('click', e => {
    e.preventDefault();
    showMsg('login-msg', 'info', "Password reset isn't available in this demo. Please contact stay@farmvilleresort.com.");
  });

  form.addEventListener('submit', e => {
    e.preventDefault(); resetForm(form);
    const id = document.getElementById('l-id').value.trim();
    const pw = document.getElementById('l-pw').value;
    let bad = false;
    if(!id){ setErr('f-l-id', 'Please enter your email address'); bad = true; }
    if(!pw){ setErr('f-l-pw', 'Please enter your password'); bad = true; }
    if(bad) return;

    if(id.toLowerCase() === ADMIN_USER && pw === ADMIN_PASS){
      sessionStorage.setItem('farmville_admin', '1');
      location.href = 'admin.html'; return;
    }
    const user = getUsers().find(u => u.email.toLowerCase() === id.toLowerCase());
    if(!user || user.password !== pw){ showMsg('login-msg', 'error', 'Incorrect email or password.'); return; }
    setSession(user, document.getElementById('l-remember').checked);
    location.href = 'index.html';
  });
}

/* ---- register ---- */
function initRegister(){
  const form = document.getElementById('register-form'); if(!form) return;
  clearOnInput(form);
  form.addEventListener('submit', e => {
    e.preventDefault(); resetForm(form);
    const name = (document.getElementById('r-name') ? document.getElementById('r-name').value : '').trim();
    const email = document.getElementById('r-email').value.trim();
    const phone = document.getElementById('r-phone').value.trim();
    const pw = document.getElementById('r-pw').value;
    const pw2 = document.getElementById('r-pw2').value;
    let bad = false;

    if(!name){ setErr('f-r-name', 'Please enter your full name'); bad = true; }
    if(!EMAIL_RE.test(email)){ setErr('f-r-email', 'Please enter a valid email address'); bad = true; }
    else if(email.toLowerCase() === ADMIN_USER || getUsers().some(u => u.email.toLowerCase() === email.toLowerCase())){
      setErr('f-r-email', 'An account with this email already exists'); bad = true;
    }
    if(!/^[0-9+\-\s()]{7,}$/.test(phone)){ setErr('f-r-phone', 'Please enter a valid mobile number'); bad = true; }
    if(pw.length < 8){ setErr('f-r-pw', 'At least 8 characters'); bad = true; }
    if(!pw2 || pw2 !== pw){ setErr('f-r-pw2', 'Passwords do not match'); bad = true; }
    if(bad) return;
    if(!document.getElementById('r-terms').checked){
      showMsg('reg-msg', 'error', 'Please agree to the Terms of Service & Privacy Policy.'); return;
    }

    const users = getUsers();
    users.push({name, email, phone, password: pw, createdAt: Date.now()});
    saveUsers(users);
    location.href = 'login.html?registered=1';
  });
}

/* ---- admin portal login ---- */
function initAdminLogin(){
  const form = document.getElementById('admin-form'); if(!form) return;
  if(sessionStorage.getItem('farmville_admin') === '1'){ location.replace('admin.html'); return; }
  clearOnInput(form);
  form.addEventListener('submit', e => {
    e.preventDefault(); resetForm(form);
    const u = document.getElementById('a-user').value.trim();
    const p = document.getElementById('a-pass').value;
    let bad = false;
    if(!u){ setErr('f-a-user', 'Please enter your username'); bad = true; }
    if(!p){ setErr('f-a-pass', 'Please enter your password'); bad = true; }
    if(bad) return;
    if(u === ADMIN_USER && p === ADMIN_PASS){
      sessionStorage.setItem('farmville_admin', '1');
      location.href = 'admin.html';
    } else {
      showMsg('admin-msg', 'error', 'Incorrect username or password.');
    }
  });
}

/* ---- site header: Login / "Hi (full name of user)! · Sign out" ---- */
function renderHeaderAuth(){
  const el = document.getElementById('auth-area'); if(!el) return;
  const s = getSession();
  if(s){
    const fullName = esc(String(s.name || '').trim());
    const greeting = fullName ? `<span class="hi">Hi ${fullName}!</span>` : '';
    el.innerHTML = `${greeting}<a href="login.html" id="logout-link">Sign out</a>`;
    document.getElementById('logout-link').addEventListener('click', e => {
      e.preventDefault();
      clearSession();
      window.location.href = 'login.html';
    });
  } else {
    el.innerHTML = '<a href="login.html">Login</a>';
  }
}

/* ---- show/hide password toggle (padlock) ---- */
function initPasswordToggles(){
  const regForm = document.getElementById('register-form');
  if(regForm){
    // In register form: clicking either padlock toggles both password and confirm password fields together
    const regToggles = regForm.querySelectorAll('.pw-toggle');
    regToggles.forEach(btn => {
      btn.textContent = '🔒';
      btn.setAttribute('aria-label', 'Show password');
      btn.setAttribute('title', 'Show password');
      btn.addEventListener('click', () => {
        const pwInput = document.getElementById('r-pw');
        const pw2Input = document.getElementById('r-pw2');
        if(!pwInput) return;
        const willShow = pwInput.type === 'password';
        const nextType = willShow ? 'text' : 'password';
        const nextIcon = willShow ? '🔓' : '🔒';
        const nextLabel = willShow ? 'Hide password' : 'Show password';

        if(pwInput) pwInput.type = nextType;
        if(pw2Input) pw2Input.type = nextType;

        regToggles.forEach(b => {
          b.textContent = nextIcon;
          b.setAttribute('aria-label', nextLabel);
          b.setAttribute('title', nextLabel);
        });
      });
    });
  }

  // Handle any other standalone toggles (e.g. login, admin login)
  document.querySelectorAll('form:not(#register-form) .pw-toggle').forEach(btn => {
    btn.textContent = '🔒';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('title', 'Show password');
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.for;
      const input = document.getElementById(targetId);
      if(!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🔓' : '🔒';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin(); initRegister(); initAdminLogin(); renderHeaderAuth(); initPasswordToggles();
});
