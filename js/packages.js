function peso(n){ return '₱' + Number(n).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); }

/* ---- "View" button: reuses the shared #info-modal (same one footer links use) ---- */
function openPackageInfo(id){
  const pkg = (typeof PACKAGE_DATA !== 'undefined') && PACKAGE_DATA[id];
  const modal = document.getElementById('info-modal');
  if(!pkg || !modal) return;

  document.getElementById('info-title').textContent = pkg.name;
  document.getElementById('info-body').innerHTML = `
    <img src="https://picsum.photos/seed/${pkg.img}/700/380" alt="${pkg.name}"
         style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:16px;">
    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
      <span style="color:var(--gold); font-weight:700; font-size:18px;">${peso(pkg.price)}</span>
      <span style="color:var(--muted); font-size:13px;">👥 ${pkg.guests} guests · ${pkg.nights} night${pkg.nights > 1 ? 's' : ''}</span>
    </div>
    <p style="color:var(--muted); font-size:14px; margin-bottom:16px;">${pkg.desc}</p>
    <p style="font-weight:700; color:var(--navy); font-size:13px; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px;">What's Included</p>
    <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
      ${pkg.inclusions.map(i => `<li style="font-size:13px; color:var(--slate);">✓ ${i}</li>`).join('')}
    </ul>
    <button class="btn btn-primary" style="width:100%;" onclick="closeInfoModal(); openPackageBooking('${id}');">Book This Package</button>`;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeInfoModal(){
  const modal = document.getElementById('info-modal');
  if(modal){ modal.classList.add('hidden'); document.body.style.overflow = ''; }
}

/* ---- "Book Package": its own confirmation modal, then off to payment.html ---- */
function openPackageBooking(id){
  const pkg = (typeof PACKAGE_DATA !== 'undefined') && PACKAGE_DATA[id];
  const modal = document.getElementById('pkg-book-modal');
  if(!pkg || !modal) return;

  const subtotal = pkg.price;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;
  const deposit = Math.round(total * 0.3);
  const balance = total - deposit;
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  document.getElementById('pkg-book-title').textContent = pkg.name;
  document.getElementById('pkg-book-body').innerHTML = `
    <div class="summary-line"><span>Package</span><span>${pkg.name}</span></div>
    <div class="summary-line"><span>Duration</span><span>${pkg.nights} night${pkg.nights > 1 ? 's' : ''}</span></div>
    <div class="summary-line"><span>Guests</span><span>${pkg.guests}</span></div>
    <div class="summary-line" style="border-top:1px solid var(--border); margin-top:10px; padding-top:10px;"><span>Package price</span><span>${peso(subtotal)}</span></div>
    <div class="summary-line"><span>Eco/resort fee (5%)</span><span>${peso(fee)}</span></div>
    <div class="summary-line total"><span>Total</span><span>${peso(total)}</span></div>
    <div class="summary-line down"><span>Down Payment Due Now (30%)</span><span>${peso(deposit)}</span></div>
    <div class="summary-line"><span>Balance Due at Check-in</span><span>${peso(balance)}</span></div>
    <label style="display:block; font-size:13px; font-weight:600; margin:16px 0 6px;">Preferred Check-in Date</label>
    <input type="date" id="pkg-date" min="${minDate}" value="${minDate}" style="width:100%; border:1px solid var(--border); border-radius:10px; padding:12px; font-family:'Inter',sans-serif; font-size:14px;">
    <p class="error-text" id="pkg-book-error"></p>
    <button class="btn btn-primary" style="width:100%; margin-top:18px; padding:14px;" id="pkg-confirm-btn">Confirm &amp; Proceed to Payment</button>`;

  document.getElementById('pkg-confirm-btn').onclick = () => confirmPackageBooking(id, subtotal, fee, total, deposit, balance);

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function confirmPackageBooking(id, subtotal, fee, total, deposit, balance){
  const pkg = PACKAGE_DATA[id];
  const dateInput = document.getElementById('pkg-date');
  const err = document.getElementById('pkg-book-error');
  if(!dateInput.value){ err.textContent = 'Please choose a check-in date.'; err.classList.add('show'); return; }

  const ci = dateInput.value;
  const co = new Date(new Date(ci).getTime() + pkg.nights * 86400000).toISOString().slice(0, 10);

  localStorage.setItem('farmville_selection', JSON.stringify({
    roomName: pkg.name, ci, co, guests: pkg.guests, nights: pkg.nights,
    subtotal, fee, total, deposit, balance
  }));
  window.location.href = 'payment.html';
}

function closePkgBookModal(){
  const modal = document.getElementById('pkg-book-modal');
  if(modal){ modal.classList.add('hidden'); document.body.style.overflow = ''; }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('pkg-book-modal');
  if(!modal) return;
  document.getElementById('pkg-book-close').addEventListener('click', closePkgBookModal);
  modal.addEventListener('click', e => { if(e.target === modal) closePkgBookModal(); });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !modal.classList.contains('hidden')) closePkgBookModal();
  });
});
