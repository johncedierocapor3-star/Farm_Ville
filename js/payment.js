function peso(n){ return '₱' + Number(n).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function genRef(){ return 'FV-' + Math.random().toString(36).slice(2,8).toUpperCase(); }
function maskCard(num){ return '•••• •••• •••• ' + num.slice(-4); }
function todayStr(){ return new Date().toLocaleDateString('en-PH', {year:'numeric', month:'long', day:'numeric'}); }

let selection = null;

function loadSelection(){
  const raw = localStorage.getItem('farmville_selection');
  if(!raw){
    document.getElementById('pay-section').innerHTML = `<div class="confirm-box">
      <h2>No Room Selected</h2>
      <p style="color:var(--muted);margin-bottom:20px;">Please search and choose a room before proceeding to payment.</p>
      <a href="booking.html" class="btn btn-primary">Back to Search</a>
    </div>`;
    return;
  }
  selection = JSON.parse(raw);
  document.getElementById('sum-room').textContent = selection.roomName;
  document.getElementById('sum-dates').textContent = `${selection.ci} → ${selection.co} (${selection.nights} night${selection.nights>1?'s':''})`;
  document.getElementById('sum-guests').textContent = `${selection.guests} guest${selection.guests>1?'s':''}`;
  document.getElementById('sum-subtotal').textContent = peso(selection.subtotal);
  document.getElementById('sum-fee').textContent = peso(selection.fee);
  document.getElementById('sum-total').textContent = peso(selection.total);
  document.getElementById('sum-deposit').textContent = peso(selection.deposit);
  document.getElementById('sum-balance').textContent = peso(selection.balance);
}

function prefillFromSession(){
  const s = getSession(); if(!s) return;
  const set = (id, v) => { const el = document.getElementById(id); if(el && !el.value) el.value = v || ''; };
  set('g-name', s.name); set('g-email', s.email); set('g-phone', s.phone);
}

function switchMethod(method){
  document.querySelectorAll('.pay-method-tabs button').forEach(b => b.classList.toggle('active', b.dataset.method === method));
  document.querySelectorAll('.pay-fields').forEach(f => f.classList.toggle('hidden', f.dataset.method !== method));
}

function formatCardNumber(e){
  let v = e.target.value.replace(/\D/g,'').slice(0,16);
  e.target.value = v.replace(/(.{4})/g,'$1 ').trim();
}
function formatExpiry(e){
  let v = e.target.value.replace(/\D/g,'').slice(0,4);
  if(v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
  e.target.value = v;
}
function formatCVV(e){ e.target.value = e.target.value.replace(/\D/g,'').slice(0,4); }
function formatMobile(e){ e.target.value = e.target.value.replace(/\D/g,'').slice(0,11); }

function validateGuest(){
  const name = document.getElementById('g-name').value.trim();
  const email = document.getElementById('g-email').value.trim();
  const phone = document.getElementById('g-phone').value.trim();
  if(!name) return 'Please enter the guest\'s full name.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if(!phone) return 'Please enter a contact phone number.';
  return null;
}

function validatePayment(method){
  if(method === 'card'){
    const name = document.getElementById('cc-name').value.trim();
    const num = document.getElementById('cc-number').value.replace(/\s/g,'');
    const exp = document.getElementById('cc-expiry').value;
    const cvv = document.getElementById('cc-cvv').value;
    if(!name) return 'Enter the name on the card.';
    if(num.length !== 16) return 'Card number must be 16 digits.';
    if(!/^\d{2}\/\d{2}$/.test(exp)) return 'Expiry must be in MM/YY format.';
    const [mm, yy] = exp.split('/').map(Number);
    if(mm < 1 || mm > 12) return 'Expiry month is invalid.';
    if(new Date(2000+yy, mm) < new Date()) return 'This card has expired.';
    if(cvv.length < 3) return 'CVV must be 3–4 digits.';
  } else if(method === 'gcash'){
    if(!/^09\d{9}$/.test(document.getElementById('gcash-number').value)) return 'Enter a valid GCash mobile number (e.g. 09171234567).';
  }
  return null;
}

function confirmPayment(){
  const err = document.getElementById('pay-error');
  if(!selection){ err.textContent = 'Please select a room first.'; err.classList.add('show'); return; }

  const guestProblem = validateGuest();
  if(guestProblem){ err.textContent = guestProblem; err.classList.add('show'); return; }

  const method = document.querySelector('.pay-method-tabs button.active').dataset.method;
  const payProblem = validatePayment(method);
  if(payProblem){ err.textContent = payProblem; err.classList.add('show'); return; }
  err.classList.remove('show');

  let methodDetail = '';
  if(method === 'card') methodDetail = `Credit/Debit Card (${maskCard(document.getElementById('cc-number').value.replace(/\s/g,''))})`;
  else methodDetail = `GCash (${document.getElementById('gcash-number').value})`;

  const matchedRoom = getRooms().find(r => (selection.roomId && r.id === selection.roomId) || (r.name && selection.roomName && r.name.toLowerCase() === selection.roomName.toLowerCase()));
  if(matchedRoom && !isRoomAvailable(matchedRoom, selection.ci, selection.co)){
    err.textContent = 'Sorry, this room has just been booked by another guest and is no longer available.';
    err.classList.add('show');
    return;
  }

  const booking = {
    ref: genRef(),
    roomId: selection.roomId || (matchedRoom ? matchedRoom.id : null),
    name: document.getElementById('g-name').value.trim(),
    email: document.getElementById('g-email').value.trim(),
    phone: document.getElementById('g-phone').value.trim(),
    roomName: selection.roomName,
    ci: selection.ci, co: selection.co,
    nights: selection.nights, guests: selection.guests,
    subtotal: selection.subtotal, fee: selection.fee, total: selection.total,
    deposit: selection.deposit, balance: selection.balance,
    methodDetail, dateBooked: todayStr()
  };

  const sess = getSession();
  const history = getBookings();
  history.push(Object.assign({}, booking, {status:'Confirmed', userEmail: sess ? sess.email : null, createdAt: Date.now()}));
  localStorage.setItem('farmville_bookings', JSON.stringify(history));
  localStorage.setItem('farmville_booking', JSON.stringify(booking));
  localStorage.removeItem('farmville_selection');
  window.location.href = 'receipt.html';
}

document.addEventListener('DOMContentLoaded', () => { loadSelection(); prefillFromSession(); });
