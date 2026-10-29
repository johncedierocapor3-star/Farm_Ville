/* Admin panel — all data comes from this browser's storage (no database). */
(function(){
  if(sessionStorage.getItem('farmville_admin') !== '1'){ location.replace('admin-login.html'); return; }

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
  const STATUSES = ['Confirmed', 'Checked-in', 'Completed', 'Cancelled'];
  const TITLES = {dashboard:'Dashboard', bookings:'Bookings', payments:'Payments', rooms:'Rooms', gallery:'Gallery Management', users:'Guests'};
  const st = b => b.status || 'Confirmed';
  const saveBookings = list => localStorage.setItem('farmville_bookings', JSON.stringify(list));
  const saveRooms = list => localStorage.setItem('farmville_rooms', JSON.stringify(list));
  const saveGallery = list => localStorage.setItem('farmville_gallery', JSON.stringify(list));
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('en-PH', {year:'numeric', month:'short', day:'numeric'}) : '—';
  const badge = s => `<span class="badge b-${String(s).toLowerCase().replace(/[^a-z]/g, '')}">${esc(s)}</span>`;

  let toastTimer;
  function toast(msg){
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard(){
    const all = getBookings();
    const active = all.filter(b => st(b) !== 'Cancelled');
    const collected = active.reduce((s, b) => s + (+b.deposit || 0), 0);
    const owed = active.filter(b => st(b) === 'Confirmed' || st(b) === 'Checked-in').reduce((s, b) => s + (+b.balance || 0), 0);

    const rooms = getRooms();
    const occupiedCount = rooms.filter(r => !isRoomAvailable(r)).length;
    const availableCount = rooms.length - occupiedCount;

    $('#stats').innerHTML = [
      ['🗓️', 'Total Bookings', active.length],
      ['💰', 'Down Payments Collected', peso(collected)],
      ['🧾', 'Balance Outstanding', peso(owed)],
      ['👥', 'Registered Guests', getUsers().length],
      ['🛏️', 'Room Availability', `<span style="color:#2e7d32;font-weight:700;">${availableCount} Available</span> · <span style="color:#c62828;font-weight:700;">${occupiedCount} Occupied</span>`]
    ].map(([ic, l, v]) => `<div class="stat"><div class="stat-ic">${ic}</div><div><div class="stat-v">${v}</div><div class="stat-l">${l}</div></div></div>`).join('');

    const byRoom = {};
    active.forEach(b => { byRoom[b.roomName] = (byRoom[b.roomName] || 0) + 1; });
    const entries = Object.entries(byRoom);
    const max = Math.max(1, ...entries.map(e => e[1]));
    $('#room-bars').innerHTML = entries.length
      ? entries.map(([n, c]) => `<div class="bar-row"><span>${esc(n)}</span><div class="bar"><i style="width:${c / max * 100}%"></i></div><b>${c}</b></div>`).join('')
      : '<p class="muted">No bookings yet.</p>';

    const recent = all.slice().reverse().slice(0, 5);
    $('#recent-body').innerHTML = recent.length
      ? recent.map(b => `<tr><td><b>${esc(b.ref)}</b></td><td>${esc(b.name)}</td><td>${esc(b.roomName)}</td><td>${peso(b.total)}</td><td>${badge(st(b))}</td></tr>`).join('')
      : '<tr><td colspan="5" class="muted">No bookings yet.</td></tr>';
    $('#dash-empty').classList.toggle('hidden', all.length > 0);
  }

  /* ---------- Bookings ---------- */
  function renderBookings(){
    const q = $('#bk-search').value.trim().toLowerCase();
    const f = $('#bk-status').value;
    const rows = getBookings().map((b, i) => ({b, i})).reverse().filter(({b}) =>
      (f === 'all' || st(b) === f) && (!q || [b.ref, b.name, b.email, b.roomName].join(' ').toLowerCase().includes(q)));
    $('#bk-body').innerHTML = rows.map(({b, i}) => `<tr>
      <td><b>${esc(b.ref)}</b><div class="sub">${esc(b.dateBooked)}</div></td>
      <td>${esc(b.name)}<div class="sub">${esc(b.email)}</div></td>
      <td>${esc(b.roomName)}</td>
      <td>${esc(b.ci)} → ${esc(b.co)}<div class="sub">${esc(b.nights)} night(s) · ${esc(b.guests)} guest(s)</div></td>
      <td>${peso(b.total)}</td>
      <td><select class="st-sel" data-i="${i}">${STATUSES.map(s => `<option${s === st(b) ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
      <td class="acts"><button class="mini" data-act="view" data-i="${i}">View</button><button class="mini danger" data-act="del" data-i="${i}">Delete</button></td>
    </tr>`).join('');
    $('#bk-empty').classList.toggle('hidden', rows.length > 0);
  }

  function showBooking(b){
    const kv = (k, v) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`;
    $('#modal-title').textContent = 'Booking ' + b.ref;
    $('#modal-body').innerHTML = [
      kv('Status', badge(st(b))), kv('Guest', esc(b.name)), kv('Email', esc(b.email)), kv('Phone', esc(b.phone)),
      kv('Room', esc(b.roomName)), kv('Check-in', esc(b.ci)), kv('Check-out', esc(b.co)),
      kv('Nights', esc(b.nights)), kv('Guests', esc(b.guests)),
      kv('Room subtotal', peso(b.subtotal)), kv('Eco/resort fee', peso(b.fee)), kv('Total', peso(b.total)),
      kv('Down payment paid', peso(b.deposit)), kv('Balance at check-in', peso(b.balance)),
      kv('Payment method', esc(b.methodDetail)), kv('Date booked', esc(b.dateBooked))
    ].join('');
    $('#modal').classList.remove('hidden');
  }

  /* ---------- Payments ---------- */
  function renderPayments(){
    const all = getBookings().slice().reverse();
    $('#pay-body').innerHTML = all.length ? all.map(b => {
      const remaining = Math.max(0, (+b.total || 0) - (+b.deposit || 0));
      return `<tr>
      <td><b>${esc(b.ref)}</b></td><td>${esc(b.name)}</td><td>${esc(b.methodDetail)}</td>
      <td>${peso(b.total)}</td>
      <td style="color:var(--green);font-weight:600;">− ${peso(b.deposit)}</td>
      <td style="color:${remaining > 0 ? 'var(--red)' : 'var(--green)'};font-weight:700;">${st(b) === 'Cancelled' ? '—' : peso(remaining)}</td>
      <td>${badge(st(b))}</td></tr>`;
    }).join('')
      : '<tr><td colspan="7" class="muted">No payments yet.</td></tr>';
    const act = all.filter(b => st(b) !== 'Cancelled');
    const totalPrice = act.reduce((s, b) => s + (+b.total || 0), 0);
    const totalPaid = act.reduce((s, b) => s + (+b.deposit || 0), 0);
    const totalRemaining = Math.max(0, totalPrice - totalPaid);
    $('#pay-foot').innerHTML = all.length
      ? `<tr><td><b>Totals</b></td><td colspan="2" style="font-size:11px;color:var(--muted);">(excluding cancelled)</td><td>${peso(totalPrice)}</td><td style="color:var(--green);font-weight:700;">− ${peso(totalPaid)}</td><td style="color:${totalRemaining > 0 ? 'var(--red)' : 'var(--green)'};font-weight:700;">${peso(totalRemaining)}</td><td></td></tr>` : '';
  }

  /* ---------- Rooms ---------- */
  let pendingPhotos = {}; // row index -> newly chosen photo data URL (not yet saved)

  function loadHeic2any(){
    if(window.heic2any) return Promise.resolve(window.heic2any);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => resolve(window.heic2any);
      s.onerror = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
        s2.onload = () => resolve(window.heic2any);
        s2.onerror = () => reject(new Error('HEIC converter library could not be loaded'));
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    });
  }

  async function detectAndNormalizeImage(file){
    let buffer;
    try {
      buffer = await file.slice(0, 64).arrayBuffer();
    } catch(e) {
      return file;
    }
    const arr = new Uint8Array(buffer);
    const len = arr.length;

    // JPEG (FF D8 FF)
    if(len >= 3 && arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF){
      return new Blob([file], {type: 'image/jpeg'});
    }

    // PNG (89 50 4E 47 0D 0A 1A 0A)
    if(len >= 4 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47){
      return new Blob([file], {type: 'image/png'});
    }

    // GIF (GIF87a / GIF89a: 47 49 46 38)
    if(len >= 4 && arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38){
      return new Blob([file], {type: 'image/gif'});
    }

    // WEBP (RIFF....WEBP)
    if(len >= 12 && arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
       arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50){
      return new Blob([file], {type: 'image/webp'});
    }

    // BMP (BM: 42 4D)
    if(len >= 2 && arr[0] === 0x42 && arr[1] === 0x4D){
      return new Blob([file], {type: 'image/bmp'});
    }

    // TIFF (II*. or MM.*)
    if(len >= 4 && ((arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2A && arr[3] === 0x00) ||
                    (arr[0] === 0x4D && arr[1] === 0x4D && arr[2] === 0x00 && arr[3] === 0x2A))){
      return new Blob([file], {type: 'image/tiff'});
    }

    // HEIC / HEIF / AVIF (ftyp box at byte 4)
    const ftyp = len >= 8 ? String.fromCharCode(...arr.slice(4, 8)) : '';
    const brand = len >= 12 ? String.fromCharCode(...arr.slice(8, 12)).toLowerCase() : '';
    const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'];
    const isHeic = (ftyp === 'ftyp' && heicBrands.includes(brand)) ||
                   /\.(heic|heif)$/i.test(file.name) ||
                   file.type === 'image/heic' || file.type === 'image/heif';

    if(isHeic){
      return { isHeic: true, file };
    }

    // AVIF
    if((ftyp === 'ftyp' && brand === 'avif') || /\.avif$/i.test(file.name) || file.type === 'image/avif'){
      return new Blob([file], {type: 'image/avif'});
    }

    // SVG
    try {
      const textSample = new TextDecoder('utf-8').decode(arr.slice(0, 64)).trim();
      if(textSample.startsWith('<svg') || (textSample.startsWith('<?xml') && textSample.includes('<svg'))){
        return new Blob([file], {type: 'image/svg+xml'});
      }
    } catch(e){}

    // Map common image extensions if browser gave empty or generic octet-stream MIME (e.g. .img renamed)
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const extMimes = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon',
      jfif: 'image/jpeg', tif: 'image/tiff', tiff: 'image/tiff'
    };
    if(extMimes[ext]){
      return new Blob([file], {type: extMimes[ext]});
    }

    return file;
  }

  async function resizeImage(file, maxW){
    if(!file) throw new Error('No file provided');

    let target = await detectAndNormalizeImage(file);

    if(target && target.isHeic){
      const canNative = await new Promise(resolve => {
        const testUrl = URL.createObjectURL(target.file);
        const testImg = new Image();
        testImg.onload = () => { URL.revokeObjectURL(testUrl); resolve(true); };
        testImg.onerror = () => { URL.revokeObjectURL(testUrl); resolve(false); };
        testImg.src = testUrl;
      });

      if(!canNative){
        await loadHeic2any();
        if(typeof heic2any === 'function'){
          const conv = await heic2any({ blob: target.file, toType: 'image/jpeg', quality: 0.85 });
          target = Array.isArray(conv) ? conv[0] : conv;
        } else {
          throw new Error('HEIC conversion library could not be loaded');
        }
      } else {
        target = target.file;
      }
    }

    if(typeof createImageBitmap === 'function'){
      try {
        const bmp = await createImageBitmap(target);
        const scale = Math.min(1, maxW / bmp.width);
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0, w, h);
        if(bmp.close) bmp.close();
        return canvas.toDataURL('image/jpeg', 0.70);
      } catch(e){}
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(target);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', 0.70));
        } catch(err){
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = e => {
          const fb = new Image();
          fb.onload = () => {
            const scale = Math.min(1, maxW / fb.width);
            const w = Math.max(1, Math.round(fb.width * scale));
            const h = Math.max(1, Math.round(fb.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(fb, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.70));
          };
          fb.onerror = () => reject(new Error('Unsupported or corrupted image file format'));
          fb.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(target);
      };
      img.src = url;
    });
  }

  const PLACEHOLDER_THUMB = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='140' viewBox='0 0 200 140'><rect width='200' height='140' fill='%23eef2f6'/><path d='M70 65l16-20 20 25 14-16 32 38H56z' fill='%23cbd5e1'/><circle cx='82' cy='44' r='8' fill='%23cbd5e1'/><text x='50%' y='108' font-family='sans-serif' font-size='11' font-weight='600' fill='%2394a3b8' text-anchor='middle'>No Photo Selected</text></svg>";

  function roomThumb(r){
    if(r.photo) return r.photo;
    if(r.img) return `https://picsum.photos/seed/${r.img}/200/140`;
    return PLACEHOLDER_THUMB;
  }

  function renderRooms(){
    pendingPhotos = {};
    $('#room-body').innerHTML = getRooms().map((r, i) => {
      const b = getActiveBookingForRoom(r.id, r.name);
      const isOcc = !isRoomAvailable(r);
      const statusBanner = b
        ? `<div class="room-avail-banner occupied">
             <div class="room-avail-info">
               <span class="avail-dot red"></span>
               <b>Occupied (Confirmed Booking)</b>
               <span class="sub">Guest: <b>${esc(b.name)}</b> · Stay: ${esc(b.ci)} → ${esc(b.co)} · Ref: <b>${esc(b.ref)}</b></span>
             </div>
             <div class="room-avail-actions">
               <button type="button" class="mini" data-act="view-ref" data-ref="${esc(b.ref)}">View Booking</button>
               <button type="button" class="mini danger" data-act="free-room" data-ref="${esc(b.ref)}">Free Room</button>
             </div>
           </div>`
        : (r.occupied
          ? `<div class="room-avail-banner occupied">
               <div class="room-avail-info">
                 <span class="avail-dot red"></span>
                 <b>Manually Set to Occupied</b>
                 <span class="sub">Room is locked from public website</span>
               </div>
               <div class="room-avail-actions">
                 <button type="button" class="mini danger" data-act="free-manual" data-i="${i}">Mark Available</button>
               </div>
             </div>`
          : `<div class="room-avail-banner available">
               <div class="room-avail-info">
                 <span class="avail-dot green"></span>
                 <b>Available</b>
                 <span class="sub">Ready for guest bookings</span>
               </div>
             </div>`);

      return `<div class="room-edit" data-i="${i}">
        ${statusBanner}
        <div class="room-edit-top">
          <div class="room-thumb-wrap">
            <img class="room-thumb" id="thumb-${i}" src="${roomThumb(r)}" alt="${esc(r.name)}">
            <input type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.heic,.HEIC,.heif,.HEIF,.avif,.jfif,.tiff,.tif,.img,.IMG,*" data-photo="${i}">
          </div>
          <div class="room-fields">
            <div class="frow">
              <div><label>Name</label><input data-f="name" value="${esc(r.name)}"></div>
              <div><label>Price / night (₱)</label><input data-f="price" type="number" min="0" value="${esc(r.price)}"></div>
            </div>
            <div class="frow">
              <div><label>Max guests</label><input data-f="capacity" type="number" min="1" max="20" value="${esc(r.capacity)}"></div>
            </div>
            <label class="sw"><input data-f="active" type="checkbox"${r.active !== false ? ' checked' : ''}> Available on website</label>
            <label class="sw" style="margin-top:6px;"><input data-f="occupied" type="checkbox"${r.occupied === true ? ' checked' : ''}> Manually Mark as Occupied (e.g. Maintenance or Walk-in)</label>
          </div>
        </div>
        <div class="room-edit-bottom">
          <div><label>Card Description (shown on Accommodations cards)</label><input data-f="cardDesc" type="text" value="${esc(r.cardDesc || r.shortDesc || '')}" placeholder="Short summary shown on room cards..."></div>
          <div><label>Full Description (shown in "View Details")</label><textarea data-f="desc" placeholder="What makes this room stand out...">${esc(r.desc || '')}</textarea></div>
          <div><label>Features (comma-separated)</label><input data-f="features" type="text" value="${esc((r.features || []).join(', '))}" placeholder=""></div>
          <div class="room-edit-foot"><span class="muted">ID: ${esc(r.id)}</span><button class="mini danger" data-act="rm" data-i="${i}">Remove Room</button></div>
        </div>
      </div>`;
    }).join('');
  }

  function collectRooms(){
    const saved = getRooms();
    return $$('#room-body .room-edit').map(card => {
      const i = card.dataset.i;
      const base = saved[+i] || {};
      const g = f => card.querySelector(`[data-f="${f}"]`);
      const cap = Math.max(1, parseInt(g('capacity').value, 10) || 1);
      const features = g('features').value.split(',').map(s => s.trim()).filter(Boolean);
      const cardDesc = g('cardDesc') ? g('cardDesc').value.trim() : (base.cardDesc || base.shortDesc || '');
      const updated = Object.assign({}, base, {
        name: g('name').value.trim() || 'Room',
        price: Math.max(0, parseFloat(g('price').value) || 0),
        capacity: cap, capacityLabel: cap + (cap === 1 ? ' Guest' : ' Guests'),
        active: g('active').checked,
        occupied: g('occupied') ? g('occupied').checked : false,
        cardDesc: cardDesc,
        shortDesc: cardDesc,
        desc: g('desc').value.trim(),
        features,
        photo: pendingPhotos[i] !== undefined ? pendingPhotos[i] : (base.photo || null)
      });
      delete updated.size;
      return updated;
    });
  }

  /* ---------- Guests ---------- */
  function renderUsers(){
    const users = getUsers(), bks = getBookings();
    $('#user-body').innerHTML = users.length ? users.map((u, i) => `<tr>
      <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${fmtDate(u.createdAt)}</td>
      <td>${bks.filter(b => b.userEmail && b.userEmail.toLowerCase() === u.email.toLowerCase()).length}</td>
      <td class="acts"><button class="mini danger" data-act="del" data-i="${i}">Delete</button></td></tr>`).join('')
      : '<tr><td colspan="6" class="muted">No registered guests yet.</td></tr>';
  }

  /* ---------- Gallery ---------- */
  let pendingGalPhotos = {};
  let currentGalFilter = 'all';

  const PLACEHOLDER_GAL_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><rect width='300' height='200' fill='%23eef2f6'/><path d='M110 90l20-24 25 30 18-20 40 46H90z' fill='%23cbd5e1'/><circle cx='125' cy='65' r='11' fill='%23cbd5e1'/><text x='50%' y='140' font-family='sans-serif' font-size='12' font-weight='600' fill='%2394a3b8' text-anchor='middle'>No Photo Selected</text></svg>";

  function galThumb(item){
    if(item.photo) return item.photo;
    if(item.src) return item.src;
    return PLACEHOLDER_GAL_IMG;
  }

  const GAL_CATEGORIES = [
    {id:'resort', label:'Resort'},
    {id:'rooms', label:'Rooms'},
    {id:'pool', label:'Pool'},
    {id:'garden', label:'Garden'}
  ];

  function renderGallery(){
    pendingGalPhotos = {};
    const items = getGallery();
    const filterEl = $('#admin-gal-filter');
    if(filterEl) currentGalFilter = filterEl.value;

    const filtered = items.map((item, originalIndex) => ({item, originalIndex}))
      .filter(({item}) => currentGalFilter === 'all' || item.category === currentGalFilter);

    if(!filtered.length){
      $('#gallery-body').innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; background:#fff; border:1px solid var(--border); border-radius:14px;">
          <p class="muted" style="margin-bottom:12px;">No pictures found in this category.</p>
          <button type="button" class="btn ghost" id="gal-add-in-cat">+ Add Picture to ${esc((currentGalFilter === 'all' ? 'Resort' : currentGalFilter).toUpperCase())}</button>
        </div>`;
      const addInCatBtn = $('#gal-add-in-cat');
      if(addInCatBtn) addInCatBtn.onclick = () => addGalleryItem(currentGalFilter === 'all' ? 'resort' : currentGalFilter);
      return;
    }

    $('#gallery-body').innerHTML = filtered.map(({item, originalIndex: i}) => {
      const catOptions = GAL_CATEGORIES.map(c => 
        `<option value="${c.id}"${item.category === c.id ? ' selected' : ''}>${c.label}</option>`
      ).join('');

      return `
        <div class="gal-card" data-i="${i}">
          <div class="gal-img-wrap">
            <button type="button" class="gal-card-del-btn" data-act="rm-gal" data-i="${i}" title="Remove this card">&times;</button>
            <img class="gal-thumb" id="gal-thumb-${i}" src="${galThumb(item)}" alt="${esc(item.caption || item.category)}">
          </div>
          <div class="gal-card-body">
            <div>
              <label>Choose Picture File</label>
              <input type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.heic,.HEIC,.heif,.HEIF,.avif,.jfif,.tiff,.tif,*" data-gal-photo="${i}">
            </div>
            <div>
              <label>Gallery Category Choice</label>
              <select data-f="category">
                ${catOptions}
              </select>
            </div>
            <div>
              <label>Caption / Alt Text</label>
              <input type="text" data-f="caption" value="${esc(item.caption || '')}" placeholder="e.g. Sunset view from deck...">
            </div>
            <div class="gal-card-foot">
              <span class="muted" style="font-size:11px;">#${i + 1}</span>
              <button type="button" class="mini danger" data-act="rm-gal" data-i="${i}">🗑 Remove Card</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function collectGallery(){
    const saved = getGallery();
    const cards = $$('#gallery-body .gal-card');
    cards.forEach(card => {
      const i = +card.dataset.i;
      const base = saved[i] || {};
      const catEl = card.querySelector('[data-f="category"]');
      const capEl = card.querySelector('[data-f="caption"]');
      const photo = pendingGalPhotos[i] !== undefined ? pendingGalPhotos[i] : (base.photo || base.src || null);

      saved[i] = Object.assign({}, base, {
        id: base.id || ('gal-' + Date.now() + '-' + i),
        category: catEl ? catEl.value : (base.category || 'resort'),
        caption: capEl ? capEl.value.trim() : (base.caption || ''),
        photo: photo,
        src: photo
      });
    });
    return saved;
  }

  function addGalleryItem(prefCategory){
    const items = collectGallery();
    const cat = prefCategory && prefCategory !== 'all' ? prefCategory : (currentGalFilter !== 'all' ? currentGalFilter : 'resort');
    items.unshift({
      id: 'gal-' + Date.now(),
      category: cat,
      caption: '',
      photo: null,
      src: null
    });
    saveGallery(items);
    renderGallery();
    toast('New picture card added — choose a photo and category, then Save');
  }

  /* ---------- Sample data ---------- */
  function addSample(){
    const rooms = getRooms().filter(r => r.active !== false);
    if(!rooms.length){ toast('Enable at least one room first'); return; }
    const guests = [['Maria Santos', 'maria.santos@email.com', '09171234501'], ['Juan Dela Cruz', 'juan.dc@email.com', '09281234502'],
                    ['Ana Reyes', 'ana.reyes@email.com', '09391234503'], ['Carlo Mendoza', 'carlo.m@email.com', '09451234504']];
    const methods = ['Credit/Debit Card (•••• •••• •••• 4242)', 'GCash (09281234502)', 'Bank Transfer (BDO — pending verification)', 'GCash (09451234504)'];
    const statuses = ['Confirmed', 'Confirmed', 'Checked-in', 'Completed'];
    const iso = d => d.toISOString().slice(0, 10);
    const list = getBookings();
    guests.forEach((g, k) => {
      const room = rooms[k % rooms.length], nights = 1 + (k % 3);
      const start = new Date(Date.now() + (k + 2) * 3 * 86400000), end = new Date(start.getTime() + nights * 86400000);
      const subtotal = room.price * nights, fee = Math.round(subtotal * 0.05), total = subtotal + fee, deposit = Math.round(total * 0.3);
      list.push({ref:'FV-' + Math.random().toString(36).slice(2, 8).toUpperCase(), name:g[0], email:g[1], phone:g[2],
        roomId:room.id, roomName:room.name, ci:iso(start), co:iso(end), nights, guests:2, subtotal, fee, total, deposit, balance:total - deposit,
        methodDetail:methods[k], dateBooked:new Date().toLocaleDateString('en-PH', {year:'numeric', month:'long', day:'numeric'}),
        status:statuses[k], createdAt:Date.now() - k * 3600000});
    });
    saveBookings(list); show(view); toast('Sample bookings added');
  }

  /* ---------- Navigation ---------- */
  const RENDER = {dashboard:renderDashboard, bookings:renderBookings, payments:renderPayments, rooms:renderRooms, gallery:renderGallery, users:renderUsers};
  let view = 'dashboard';
  function show(v){
    view = v;
    $$('.view').forEach(s => s.classList.toggle('hidden', s.id !== 'view-' + v));
    $$('#side-nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('#view-title').textContent = TITLES[v];
    RENDER[v]();
    history.replaceState(null, '', '#' + v);
  }

  /* ---------- Drawer (Mobile / Tablet) ---------- */
  const sideEl = $('.side');
  const backdropEl = $('#drawer-backdrop');
  const drawerBtn = $('#admin-drawer-toggle');

  function openDrawer(){
    if(sideEl) sideEl.classList.add('open');
    if(backdropEl) backdropEl.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    if(sideEl) sideEl.classList.remove('open');
    if(backdropEl) backdropEl.classList.remove('show');
    document.body.style.overflow = '';
  }

  if(drawerBtn) drawerBtn.addEventListener('click', openDrawer);
  if(backdropEl) backdropEl.addEventListener('click', closeDrawer);

  $$('#side-nav button').forEach(b => b.addEventListener('click', () => {
    show(b.dataset.view);
    closeDrawer();
    window.scrollTo(0, 0);
  }));
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem('farmville_admin'); location.href = 'admin-login.html'; });
  $('#sample-btn').addEventListener('click', addSample);
  $('#bk-search').addEventListener('input', renderBookings);
  $('#bk-status').addEventListener('change', renderBookings);

  $('#bk-body').addEventListener('change', e => {
    if(!e.target.classList.contains('st-sel')) return;
    const list = getBookings(); list[+e.target.dataset.i].status = e.target.value;
    saveBookings(list);
    renderDashboard();
    renderRooms();
    toast('Status updated');
  });
  $('#bk-body').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if(!btn) return;
    const list = getBookings(), i = +btn.dataset.i;
    if(btn.dataset.act === 'view') showBooking(list[i]);
    else if(btn.dataset.act === 'del' && confirm('Delete booking ' + list[i].ref + '?')){
      list.splice(i, 1);
      saveBookings(list);
      renderBookings();
      renderDashboard();
      renderRooms();
      toast('Booking deleted');
    }
  });

  /* Re-compress a data-URL image to a smaller JPEG at given maxWidth and quality */
  function recompressDataUrl(dataUrl, maxW, quality){
    return new Promise((resolve, reject) => {
      if(!dataUrl || !dataUrl.startsWith('data:image')) { resolve(dataUrl); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', quality));
        } catch(err){ reject(err); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /* Progressively compress all photo data URLs in an array of objects until it fits localStorage */
  async function compressAndSave(items, saveFunc, photoKeys){
    const keys = photoKeys || ['photo'];
    // First attempt: save as-is
    try { saveFunc(items); return true; } catch(e){}

    // Compression levels: [maxWidth, quality]
    const levels = [
      [700, 0.65],
      [500, 0.50],
      [400, 0.40],
      [300, 0.30],
      [200, 0.22]
    ];

    for(const [maxW, q] of levels){
      toast(`Compressing photos (${maxW}px, ${Math.round(q*100)}% quality)…`);
      for(let i = 0; i < items.length; i++){
        for(const key of keys){
          if(items[i][key] && items[i][key].startsWith('data:image')){
            items[i][key] = await recompressDataUrl(items[i][key], maxW, q);
          }
        }
      }
      try { saveFunc(items); return true; } catch(e){}
    }

    toast('Could not save — storage is completely full. Try removing some rooms or pictures first.');
    return false;
  }

  async function trySaveRooms(rooms){
    return compressAndSave(rooms, saveRooms, ['photo']);
  }

  $('#room-save').addEventListener('click', async () => { if(await trySaveRooms(collectRooms())){ renderRooms(); toast('Rooms saved'); } });
  $('#room-add').addEventListener('click', async () => {
    const rooms = collectRooms(), n = Date.now();
    rooms.unshift({id:'room-' + n, name:'New Room', price:200, capacity:2, capacityLabel:'2 Guests',
      img:null, photo:null, active:true, cardDesc:'', shortDesc:'', desc:'', features:[]});
    if(await trySaveRooms(rooms)){
      renderRooms();
      const firstCard = $('#room-body .room-edit');
      if(firstCard) firstCard.scrollIntoView({behavior:'smooth', block:'center'});
      toast('Room added on top — fill in its details below, then Save');
    }
  });
  $('#room-reset').addEventListener('click', () => {
    if(confirm('Reset all rooms to the original defaults? This removes any rooms or photos you added.')){
      localStorage.removeItem('farmville_rooms'); renderRooms(); toast('Rooms reset');
    }
  });
  $('#room-body').addEventListener('click', async e => {
    const viewBtn = e.target.closest('[data-act="view-ref"]');
    if(viewBtn){
      const ref = viewRefBtn = viewBtn.dataset.ref;
      show('bookings');
      const q = $('#bk-search');
      if(q){ q.value = ref; renderBookings(); }
      return;
    }

    const freeBtn = e.target.closest('[data-act="free-room"]');
    if(freeBtn){
      const ref = freeBtn.dataset.ref;
      if(confirm('Cancel booking ' + ref + ' and free up this room?')){
        const list = getBookings();
        const b = list.find(item => item.ref === ref);
        if(b){ b.status = 'Cancelled'; saveBookings(list); }
        renderRooms();
        renderDashboard();
        toast('Booking cancelled — room is now available!');
      }
      return;
    }

    const freeManualBtn = e.target.closest('[data-act="free-manual"]');
    if(freeManualBtn){
      const i = +freeManualBtn.dataset.i;
      const rooms = collectRooms();
      if(rooms[i]){
        rooms[i].occupied = false;
        if(await trySaveRooms(rooms)){
          renderRooms();
          renderDashboard();
          toast('Room marked available!');
        }
      }
      return;
    }

    const btn = e.target.closest('[data-act="rm"]'); if(!btn) return;
    const rooms = collectRooms();
    if(rooms.length <= 1){ toast('Keep at least one room'); return; }
    rooms.splice(+btn.dataset.i, 1);
    if(await trySaveRooms(rooms)){ renderRooms(); toast('Room removed'); }
  });
  $('#room-body').addEventListener('change', async e => {
    const input = e.target.closest('[data-photo]'); if(!input || !input.files[0]) return;
    const i = input.dataset.photo;
    const file = input.files[0];
    toast('Processing photo...');
    try {
      const dataUrl = await resizeImage(file, 600);
      pendingPhotos[i] = dataUrl;
      const thumb = document.getElementById('thumb-' + i);
      if(thumb) thumb.src = dataUrl;
      toast('Photo ready — click Save changes to apply it');
    } catch(err){
      console.error('Image loading error:', err);
      toast('Could not read image file (' + (err.message || 'unsupported format') + ')');
    }
  });

  /* Gallery events */
  $('#gallery-save').addEventListener('click', async () => {
    const list = collectGallery();
    if(await compressAndSave(list, saveGallery, ['photo', 'src'])){
      renderGallery();
      toast('Gallery changes saved successfully!');
    }
  });
  $('#gallery-add').addEventListener('click', () => addGalleryItem());
  $('#admin-gal-filter').addEventListener('change', () => renderGallery());
  $('#gallery-reset').addEventListener('click', () => {
    if(confirm('Are you sure you want to delete all pictures from the gallery? This action cannot be undone.')){
      saveGallery([]);
      renderGallery();
      toast('All gallery pictures have been deleted');
    }
  });

  $('#gallery-body').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="rm-gal"]');
    if(!btn) return;
    const i = +btn.dataset.i;
    const list = collectGallery();
    if(confirm('Are you sure you want to remove this gallery card?')){
      list.splice(i, 1);
      delete pendingGalPhotos[i];
      saveGallery(list);
      renderGallery();
      toast('Gallery card removed');
    }
  });

  $('#gallery-body').addEventListener('change', async e => {
    const input = e.target.closest('[data-gal-photo]');
    if(!input || !input.files[0]) return;
    const i = input.dataset.galPhoto;
    const file = input.files[0];
    toast('Processing photo...');
    try {
      const dataUrl = await resizeImage(file, 600);
      pendingGalPhotos[i] = dataUrl;
      const thumb = document.getElementById('gal-thumb-' + i);
      if(thumb) thumb.src = dataUrl;
      toast('Photo ready — click Save Gallery to publish');
    } catch(err){
      console.error('Image loading error:', err);
      toast('Could not read image file (' + (err.message || 'unsupported format') + ')');
    }
  });

  $('#user-body').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="del"]'); if(!btn) return;
    const users = getUsers(), i = +btn.dataset.i;
    if(confirm('Delete guest ' + users[i].name + '?')){ users.splice(i, 1); saveUsers(users); renderUsers(); toast('Guest deleted'); }
  });

  const closeModal = () => $('#modal').classList.add('hidden');
  $('#modal-x').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if(e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  const start = location.hash.slice(1);
  show(TITLES[start] ? start : 'dashboard');
})();
