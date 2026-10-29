// Mini floating footer: visible while scrolling, slides away once the
// real footer scrolls into view, then slides back if the user scrolls up again.
document.addEventListener('DOMContentLoaded', () => {

  const mini = document.getElementById('mini-footer');
  const fullFooter = document.querySelector('footer.site');
  if (!mini || !fullFooter) return;

  if (!('IntersectionObserver' in window)) { return; } // fail quietly, mini bar just stays put

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      mini.classList.toggle('hide', entry.isIntersecting);
    });
  }, { threshold: 0.01 });

  observer.observe(fullFooter);
});

// ---- Footer info popups ----
// Edit the text below to change what each footer link shows.
const FOOTER_INFO = {
  policies: {
    title: 'Resort Policies',
    body: `<ul>
      <li><b>Check-in:</b> 2:00 PM &nbsp; <b>Check-out:</b> 12:00 NN</li>
      <li><b>Down payment:</b> 30% of the total stay is required to confirm a booking; the balance is paid at check-in.</li>
      <li><b>Cancellations:</b> Please contact us at least 7 days before arrival to change or cancel your booking.</li>
      <li><b>Quiet hours:</b> 10:00 PM – 6:00 AM, to keep the valley peaceful.</li>
      <li><b>Pets:</b> Small pets are welcome in selected cabins. Please ask when booking.</li>
    </ul>`
  },
  health: {
    title: 'Health & Safety',
    body: `<ul>
      <li>All cabins, linens, and shared areas are cleaned and sanitized between guests.</li>
      <li>A first-aid station is available at the front lodge, with trained staff on site daily.</li>
      <li>Firepits are lit and supervised by staff only. Please keep children within sight near open fires.</li>
      <li>Trail maps and guides are provided before every hike. Stay on marked paths.</li>
      <li><b>Emergency line:</b> +1 (555) 764-3232</li>
    </ul>`
  },
  careers: {
    title: 'Careers at Farmville',
    body: `<p>We're always looking for warm, hands-on people who love the outdoors.</p>
    <ul>
      <li>Front Desk &amp; Guest Relations</li>
      <li>Farm-to-Table Kitchen Staff</li>
      <li>Housekeeping &amp; Cabin Care</li>
      <li>Eco-Trail Guides</li>
    </ul>
    <p>Send your resume to <a href="mailto:stay@farmvilleresort.com?subject=Careers%20Application">stay@farmvilleresort.com</a>.</p>`
  },
  contact: {
    title: 'Contact Us',
    body: `<ul>
      <li><b>Address:</b> <a href="https://www.google.com/maps/search/?api=1&query=104+Forest+Eco+Road%2C+Hills+Valley%2C+CA+90210" target="_blank" rel="noopener">104 Forest Eco Road, Hills Valley, CA 90210</a></li>
      <li><b>Email:</b> <a href="mailto:stay@farmvilleresort.com">stay@farmvilleresort.com</a></li>
      <li><b>Phone:</b> <a href="tel:+15557643232">+1 (555) 764-3232</a></li>
      <li><b>Front desk hours:</b> 7:00 AM – 10:00 PM daily</li>
    </ul>`
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  const titleEl = document.getElementById('info-title');
  const bodyEl = document.getElementById('info-body');

  function openInfo(key){
    const item = FOOTER_INFO[key];
    if (!item) return;
    titleEl.textContent = item.title;
    bodyEl.innerHTML = item.body;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeInfo(){
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-info]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); openInfo(link.dataset.info); });
  });
  document.getElementById('info-close').addEventListener('click', closeInfo);
  modal.addEventListener('click', e => { if (e.target === modal) closeInfo(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInfo(); });

  initHomeBookingBar();
});

// ---- Home page booking bar redirect to booking.html ----
function searchFromHome(){
  const ci = document.getElementById('checkin') ? document.getElementById('checkin').value : '';
  const co = document.getElementById('checkout') ? document.getElementById('checkout').value : '';
  const guests = parseInt(document.getElementById('guests') ? document.getElementById('guests').value : 2, 10) || 1;
  const type = document.getElementById('room-type') ? document.getElementById('room-type').value : 'all';
  const err = document.getElementById('search-error');

  if(!ci || !co || (new Date(co) - new Date(ci) <= 0)){
    if(err){
      err.textContent = 'Please choose a valid check-out date after check-in.';
      err.classList.add('show');
    }
    return;
  }
  if(err) err.classList.remove('show');

  const q = new URLSearchParams({
    checkin: ci,
    checkout: co,
    guests: String(guests),
    type: type || 'all'
  });
  window.location.href = 'booking.html?' + q.toString();
}

function initHomeBookingBar(){
  const ci = document.getElementById('checkin');
  const co = document.getElementById('checkout');
  const typeSel = document.getElementById('room-type');
  // Only run if on a page with booking bar that is NOT booking.html (which has #result-list)
  if(!ci || document.getElementById('result-list')) return;

  const today = new Date();
  const t1 = new Date(today.getTime() + 86400000);
  const t2 = new Date(today.getTime() + 3 * 86400000);
  ci.min = today.toISOString().slice(0, 10);
  if(!ci.value) ci.value = t1.toISOString().slice(0, 10);
  if(co){
    co.min = t1.toISOString().slice(0, 10);
    if(!co.value) co.value = t2.toISOString().slice(0, 10);
    ci.addEventListener('change', () => {
      co.min = ci.value;
      if(co.value <= ci.value){
        const d = new Date(ci.value);
        d.setDate(d.getDate() + 1);
        co.value = d.toISOString().slice(0, 10);
      }
    });
  }

  if(typeSel && typeof getRooms === 'function'){
    typeSel.innerHTML = '<option value="all">All Types</option>' +
      getRooms().filter(r => r.active !== false).map(r => `<option value="${r.id}">${typeof esc === 'function' ? esc(r.name) : r.name}</option>`).join('');
  }

  const bar = document.querySelector('.booking-bar');
  if(bar){
    bar.addEventListener('keydown', e => {
      if(e.key === 'Enter'){
        e.preventDefault();
        searchFromHome();
      }
    });
  }
}
