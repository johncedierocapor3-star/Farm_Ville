const DOWNPAYMENT_RATE = 0.3; // 30% deposit, common resort policy

const PLACEHOLDER_BOOK_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><rect width='300' height='200' fill='%23eef2f6'/><path d='M110 90l20-24 25 30 18-20 40 46H90z' fill='%23cbd5e1'/><circle cx='125' cy='65' r='11' fill='%23cbd5e1'/><text x='50%' y='140' font-family='sans-serif' font-size='12' font-weight='600' fill='%2394a3b8' text-anchor='middle'>No Photo Available</text></svg>";
function img(seed,w,h){ return `https://picsum.photos/seed/${seed}/${w}/${h}`; }
function peso(n){ return '₱' + n.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function nightsBetween(a,b){ const ms = new Date(b) - new Date(a); return Math.round(ms / 86400000); }

function populateRoomTypeSelect(){
  const sel = document.getElementById('room-type');
  if(!sel) return;
  sel.innerHTML = '<option value="all">All Types</option>' +
    getRooms().filter(r => isRoomAvailable(r)).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
}

function initDates(){
  const ci = document.getElementById('checkin');
  const co = document.getElementById('checkout');
  const today = new Date();
  const t1 = new Date(today.getTime() + 86400000);
  const t2 = new Date(today.getTime() + 3*86400000);
  ci.min = today.toISOString().slice(0,10);
  ci.value = t1.toISOString().slice(0,10);
  co.min = t1.toISOString().slice(0,10);
  co.value = t2.toISOString().slice(0,10);
  ci.addEventListener('change', () => { co.min = ci.value; if(co.value <= ci.value){ const d = new Date(ci.value); d.setDate(d.getDate()+1); co.value = d.toISOString().slice(0,10);} });
}

function runSearch(){
  const ci = document.getElementById('checkin').value;
  const co = document.getElementById('checkout').value;
  const guests = parseInt(document.getElementById('guests').value, 10) || 1;
  const type = document.getElementById('room-type').value;
  const err = document.getElementById('search-error');
  const nights = nightsBetween(ci, co);

  if(!ci || !co || nights <= 0){ err.textContent = 'Please choose a valid check-out date after check-in.'; err.classList.add('show'); return; }
  err.classList.remove('show');

  const matches = getRooms().filter(r => 
    isRoomAvailable(r) &&
    isRoomAvailable(r, ci, co) &&
    (type === 'all' || r.id === type) &&
    r.capacity >= guests
  );
  const list = document.getElementById('result-list');
  const section = document.getElementById('results-section');
  if(!list || !section) return;

  document.getElementById('results-title').textContent = `Available Lodgings · ${nights} night${nights>1?'s':''} · ${guests} guest${guests>1?'s':''}`;

  if(matches.length === 0){
    list.innerHTML = `<p style="color:var(--muted);">No accommodations are currently available for ${guests} guest${guests>1?'s':''}. All matching rooms may be occupied or already booked. Try adjusting your search criteria or dates.</p>`;
  } else {
    list.innerHTML = matches.map(r => `
      <div class="result-card">
        <img src="${r.photo || (r.img ? img(r.img,300,200) : PLACEHOLDER_BOOK_IMG)}" alt="${typeof esc === 'function' ? esc(r.name) : r.name}">
        <div class="info">
          <h3>${typeof esc === 'function' ? esc(r.name) : r.name}</h3>
          <span>👥 ${typeof esc === 'function' ? esc(r.capacityLabel || (r.capacity + ' Guests')) : r.capacityLabel}</span>
        </div>
        <div class="price-col">
          <button class="btn btn-primary" style="padding:10px 20px;" onclick="selectRoom('${r.id}','${ci}','${co}',${guests})">Book Now</button>
        </div>
      </div>`).join('');
  }
  section.classList.remove('hidden');
  setTimeout(() => section.scrollIntoView({behavior:'smooth'}), 80);
}

function selectRoom(roomId, ci, co, guests){
  const room = getRooms().find(r => r.id === roomId);
  if(!room || !isRoomAvailable(room) || !isRoomAvailable(room, ci, co)){
    alert('Sorry, this room is no longer available.');
    return;
  }
  const nights = nightsBetween(ci, co);
  const subtotal = room.price * nights;
  const fee = Math.round(subtotal * 0.05); // resort/eco fee
  const total = subtotal + fee;
  const deposit = Math.round(total * DOWNPAYMENT_RATE);
  const balance = total - deposit;

  const chosenRoom = {
    roomId: room.id,
    roomName: room.name, ci, co, guests, nights,
    subtotal, fee, total, deposit, balance
  };
  localStorage.setItem('farmville_selection', JSON.stringify(chosenRoom));
  window.location.href = 'payment.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('checkin')) initDates();
  populateRoomTypeSelect();

  // Read URL parameters passed from index.html (or other pages)
  const params = new URLSearchParams(window.location.search);
  const ci = params.get('checkin');
  const co = params.get('checkout');
  const guests = params.get('guests');
  const type = params.get('type') || params.get('room-type');

  if(ci && co){
    const ciEl = document.getElementById('checkin');
    const coEl = document.getElementById('checkout');
    const guestsEl = document.getElementById('guests');
    const typeEl = document.getElementById('room-type');

    if(ciEl) ciEl.value = ci;
    if(coEl){
      coEl.min = ci;
      coEl.value = co;
    }
    if(guestsEl && guests) guestsEl.value = guests;
    if(typeEl && type) typeEl.value = type;

    // Automatically show matching rooms
    runSearch();
  }
});
