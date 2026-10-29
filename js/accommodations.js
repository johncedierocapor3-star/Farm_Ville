const PLACEHOLDER_ROOM_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='380' viewBox='0 0 500 380'><rect width='500' height='380' fill='%23eef2f6'/><path d='M190 170l35-42 42 52 28-34 65 78H160z' fill='%23cbd5e1'/><circle cx='210' cy='130' r='18' fill='%23cbd5e1'/><text x='50%' y='255' font-family='sans-serif' font-size='15' font-weight='600' fill='%2394a3b8' text-anchor='middle'>No Photo Available</text></svg>";
function roomImg(r, w, h){
  if(r.photo) return r.photo;
  if(r.img) return `https://picsum.photos/seed/${r.img}/${w}/${h}`;
  return PLACEHOLDER_ROOM_IMG;
}
function peso(n){
  return '₱' + Number(n || 0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
}

/* ---- Render room cards from admin-managed data (getRooms(), from auth.js) ---- */
function renderRoomCards(filteredList){
  const grid = document.getElementById('room-grid');
  if(!grid) return;
  const rooms = filteredList !== undefined ? filteredList : getRooms().filter(r => isRoomAvailable(r));

  if(!rooms.length){
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:50px 20px; background:#fff; border:1px solid var(--border); border-radius:16px;">
        <h3 style="color:var(--navy); margin-bottom:8px; font-size:20px;">No accommodations match your filters</h3>
        <p style="color:var(--muted); font-size:14px; margin-bottom:18px;">Try adjusting your selected type, guest capacity, or price range.</p>
        <button class="btn btn-primary" onclick="resetFilters()">Reset All Filters</button>
      </div>`;
    return;
  }

    grid.innerHTML = rooms.map(r => `
    <div class="card"><img src="${roomImg(r, 500, 380)}" alt="${esc(r.name)}"><div class="body">
      <div class="row"><h3>${esc(r.name)}</h3><span class="price">${peso(r.price)}</span></div>
      <p>${esc(r.cardDesc || r.shortDesc || 'Thoughtfully furnished with locally made decor and forest views.')}</p>
      <div class="meta"><span>👥 ${esc(r.capacityLabel || (r.capacity + ' Guests'))}</span>
        <button class="btn btn-primary" style="padding:10px 18px;" onclick="openRoomModal('${r.id}')">View Details</button></div>
    </div></div>`).join('');
}

/* ---- Filter logic for accommodations.html ---- */
function populateFilterTypeSelect(){
  const sel = document.getElementById('filter-type');
  if(!sel) return;
  const currentVal = sel.value;
  // Sort rooms lower to upper by price
  const rooms = getRooms().filter(r => isRoomAvailable(r)).sort((a,b) => a.price - b.price);
  sel.innerHTML = '<option value="all">All Lodgings</option>' +
    rooms.map(r => `<option value="${r.id}">${esc(r.name)} (${peso(r.price)})</option>`).join('');
  if(currentVal && Array.from(sel.options).some(o => o.value === currentVal)){
    sel.value = currentVal;
  }
}

function updateFilterDetailsBanner(rooms, selectedType, selectedGuests, selectedPrice){
  const wrap = document.getElementById('filter-details-wrap');
  if(!wrap) return;

  const countBadge = document.getElementById('filter-count-badge');
  const chipType = document.getElementById('filter-chip-type');
  const chipGuests = document.getElementById('filter-chip-guests');
  const chipPrice = document.getElementById('filter-chip-price');

  const typeEl = document.getElementById('filter-type');
  const guestsEl = document.getElementById('filter-guests');
  const priceEl = document.getElementById('filter-price');

  const typeText = typeEl && typeEl.selectedOptions[0] ? typeEl.selectedOptions[0].text : 'All Lodgings';
  const guestsText = guestsEl && guestsEl.selectedOptions[0] ? guestsEl.selectedOptions[0].text : 'Any Capacity';
  const priceText = priceEl && priceEl.selectedOptions[0] ? priceEl.selectedOptions[0].text : 'All Prices';

  if(countBadge){
    countBadge.textContent = `${rooms.length} Available ${rooms.length === 1 ? 'Lodging' : 'Lodgings'}`;
    countBadge.style.background = rooms.length > 0 ? 'var(--forest)' : '#e11d48';
  }
  if(chipType) chipType.textContent = `Type: ${typeText}`;
  if(chipGuests) chipGuests.textContent = `Capacity: ${guestsText}`;
  if(chipPrice) chipPrice.textContent = `Price: ${priceText}`;

  wrap.style.display = 'block';
  const box = document.getElementById('filter-details-box');
  if(box){
    box.style.animation = 'none';
    box.offsetHeight; // trigger reflow
    box.style.animation = 'fadeInPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  }
}

function applyFilters(shouldScroll){
  const typeEl = document.getElementById('filter-type');
  const guestsEl = document.getElementById('filter-guests');
  const priceEl = document.getElementById('filter-price');

  const selectedType = typeEl ? typeEl.value : 'all';
  const selectedGuests = guestsEl ? guestsEl.value : 'all';
  const selectedPrice = priceEl ? priceEl.value : 'all';

  let rooms = getRooms().filter(r => isRoomAvailable(r));

  if(selectedType !== 'all'){
    rooms = rooms.filter(r => r.id === selectedType);
  }

  if(selectedGuests !== 'all'){
    const minGuests = parseInt(selectedGuests, 10) || 1;
    rooms = rooms.filter(r => (r.capacity || 1) >= minGuests);
  }

  if(selectedPrice !== 'all'){
    if(selectedPrice === 'under-250'){
      rooms = rooms.filter(r => r.price < 250);
    } else if(selectedPrice === '250-500' || selectedPrice === '250-450'){
      rooms = rooms.filter(r => r.price >= 250 && r.price <= (selectedPrice === '250-450' ? 450 : 500));
    } else if(selectedPrice === '500-750'){
      rooms = rooms.filter(r => r.price >= 500 && r.price <= 750);
    } else if(selectedPrice === '750-1000'){
      rooms = rooms.filter(r => r.price >= 750 && r.price <= 1000);
    } else if(selectedPrice === '1000-plus' || selectedPrice === 'above-1000'){
      rooms = rooms.filter(r => r.price >= 1000);
    } else if(selectedPrice === 'above-450'){
      rooms = rooms.filter(r => r.price >= 450);
    }
  }

  // Sort matched rooms from lower to upper price
  rooms.sort((a,b) => a.price - b.price);

  renderRoomCards(rooms);
  updateFilterDetailsBanner(rooms, selectedType, selectedGuests, selectedPrice);

  if(shouldScroll === true){
    const target = document.getElementById('filter-details-wrap') || document.getElementById('room-grid');
    if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
  }
}

function resetFilters(){
  const t = document.getElementById('filter-type');
  const g = document.getElementById('filter-guests');
  const p = document.getElementById('filter-price');
  if(t) t.value = 'all';
  if(g) g.value = 'all';
  if(p) p.value = 'all';
  applyFilters();
}

/* ---- "View Details": reuses the shared #info-modal (same one footer links use) ---- */
function openRoomModal(id){
  const room = getRooms().find(r => r.id === id);
  const modal = document.getElementById('info-modal');
  if(!room || !modal) return;
  if(!isRoomAvailable(room)){
    alert('Sorry, this room is currently occupied or unavailable.');
    return;
  }

  const features = room.features && room.features.length
    ? `<p style="font-weight:700; color:var(--navy); font-size:13px; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px;">Room Features</p>
       <ul style="list-style:none; display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px;">
         ${room.features.map(f => `<li style="font-size:13px; color:var(--slate);">✓ ${esc(f)}</li>`).join('')}
       </ul>`
    : '';

  document.getElementById('info-title').textContent = room.name;
  document.getElementById('info-body').innerHTML = `
    <img src="${roomImg(room, 700, 380)}" alt="${esc(room.name)}"
         style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:16px;">
    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
      <span style="color:var(--gold); font-weight:700; font-size:18px;">${peso(room.price)}</span>
      <span style="color:var(--muted); font-size:13px;">👥 ${esc(room.capacityLabel || '')}</span>
    </div>
    <p style="color:var(--muted); font-size:14px; margin-bottom:16px;">${esc(room.desc || 'No description yet.')}</p>
    ${features}
    <button class="btn btn-primary" style="width:100%;" onclick="closeInfoModal(); openRoomBooking('${id}');">Book Now</button>`;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeInfoModal(){
  const modal = document.getElementById('info-modal');
  if(modal){ modal.classList.add('hidden'); document.body.style.overflow = ''; }
}

/* ---- "Book Now": its own confirmation modal, then off to payment.html ---- */
function openRoomBooking(id){
  const room = getRooms().find(r => r.id === id);
  const modal = document.getElementById('room-book-modal');
  if(!room || !modal) return;
  if(!isRoomAvailable(room)){
    alert('Sorry, this room is currently occupied or unavailable.');
    return;
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  document.getElementById('room-book-title').textContent = room.name;
  document.getElementById('room-book-body').innerHTML = `
    <div class="summary-line"><span>Room</span><span>${esc(room.name)}</span></div>
    <div class="summary-line"><span>Rate</span><span>${peso(room.price)}</span></div>
    <label style="display:block; font-size:13px; font-weight:600; margin:16px 0 6px;">Check-in</label>
    <input type="date" id="room-ci" min="${tomorrow}" value="${tomorrow}" style="width:100%; border:1px solid var(--border); border-radius:10px; padding:12px; font-family:'Inter',sans-serif; font-size:14px;">
    <label style="display:block; font-size:13px; font-weight:600; margin:14px 0 6px;">Check-out</label>
    <input type="date" id="room-co" min="${dayAfter}" value="${dayAfter}" style="width:100%; border:1px solid var(--border); border-radius:10px; padding:12px; font-family:'Inter',sans-serif; font-size:14px;">
    <label style="display:block; font-size:13px; font-weight:600; margin:14px 0 6px;">Guests</label>
    <input type="number" id="room-guests" min="1" max="${room.capacity}" value="${Math.min(2, room.capacity)}" style="width:100%; border:1px solid var(--border); border-radius:10px; padding:12px; font-family:'Inter',sans-serif; font-size:14px;">
    <div id="room-price-breakdown" style="margin-top:16px;"></div>
    <p class="error-text" id="room-book-error"></p>
    <button class="btn btn-primary" style="width:100%; margin-top:12px; padding:14px;" id="room-confirm-btn">Confirm &amp; Proceed to Payment</button>`;

  const update = () => updateRoomPricing(room);
  document.getElementById('room-ci').addEventListener('change', update);
  document.getElementById('room-co').addEventListener('change', update);
  document.getElementById('room-confirm-btn').onclick = () => confirmRoomBooking(id, room);
  update();

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function updateRoomPricing(room){
  const ci = document.getElementById('room-ci').value;
  const co = document.getElementById('room-co').value;
  const box = document.getElementById('room-price-breakdown');
  const err = document.getElementById('room-book-error');
  const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);

  if(!ci || !co || nights <= 0){
    box.innerHTML = '';
    err.textContent = 'Please choose a check-out date after check-in.';
    err.classList.add('show');
    return null;
  }
  err.classList.remove('show');

  const subtotal = room.price * nights;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;
  const deposit = Math.round(total * 0.3);
  const balance = total - deposit;

  box.innerHTML = `
    <div class="summary-line" style="border-top:1px solid var(--border); padding-top:10px;"><span>${nights} night${nights > 1 ? 's' : ''} subtotal</span><span>${peso(subtotal)}</span></div>
    <div class="summary-line"><span>Eco/resort fee (5%)</span><span>${peso(fee)}</span></div>
    <div class="summary-line total"><span>Total</span><span>${peso(total)}</span></div>
    <div class="summary-line down"><span>Down Payment Due Now (30%)</span><span>${peso(deposit)}</span></div>
    <div class="summary-line"><span>Balance Due at Check-in</span><span>${peso(balance)}</span></div>`;

  return {nights, subtotal, fee, total, deposit, balance};
}

function confirmRoomBooking(id, room){
  const ci = document.getElementById('room-ci').value;
  const co = document.getElementById('room-co').value;
  const guests = parseInt(document.getElementById('room-guests').value, 10) || 1;
  const err = document.getElementById('room-book-error');

  const pricing = updateRoomPricing(room);
  if(!pricing){ err.textContent = 'Please choose a check-out date after check-in.'; err.classList.add('show'); return; }

  if(!isRoomAvailable(room, ci, co)){
    err.textContent = 'This room is occupied or already booked for the selected dates. Please choose different dates.';
    err.classList.add('show');
    return;
  }

  localStorage.setItem('farmville_selection', JSON.stringify({
    roomId: room.id,
    roomName: room.name, ci, co, guests, nights: pricing.nights,
    subtotal: pricing.subtotal, fee: pricing.fee, total: pricing.total,
    deposit: pricing.deposit, balance: pricing.balance
  }));
  window.location.href = 'payment.html';
}

function closeRoomBookModal(){
  const modal = document.getElementById('room-book-modal');
  if(modal){ modal.classList.add('hidden'); document.body.style.overflow = ''; }
}

function initAccommodations(){
  populateFilterTypeSelect();

  const t = document.getElementById('filter-type');
  const g = document.getElementById('filter-guests');
  const p = document.getElementById('filter-price');
  const btn = document.getElementById('filter-btn');

  // Check URL query parameters if passed from other links
  const params = new URLSearchParams(window.location.search);
  if(params.get('type') && t) t.value = params.get('type');
  if(params.get('guests') && g) g.value = params.get('guests');
  if(params.get('price') && p) p.value = params.get('price');

  if(t) t.addEventListener('change', () => {
    // If user selects "All Lodgings", reset other filters to show all available rooms instantly
    if(t.value === 'all'){
      if(g) g.value = 'all';
      if(p) p.value = 'all';
    }
    applyFilters(false);
  });
  if(g) g.addEventListener('change', () => applyFilters(false));
  if(p) p.addEventListener('change', () => applyFilters(false));
  if(btn) btn.addEventListener('click', () => applyFilters(true));

  // Instantly show all available rooms
  applyFilters(false);

  const modal = document.getElementById('room-book-modal');
  if(!modal) return;
  const closeBtn = document.getElementById('room-book-close');
  if(closeBtn) closeBtn.addEventListener('click', closeRoomBookModal);
  modal.addEventListener('click', e => { if(e.target === modal) closeRoomBookModal(); });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !modal.classList.contains('hidden')) closeRoomBookModal();
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initAccommodations);
} else {
  initAccommodations();
}
