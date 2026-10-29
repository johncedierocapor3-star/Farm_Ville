function filterGallery(category){
  document.querySelectorAll('#gallery-tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === category)
  );

  const images = document.querySelectorAll('#masonry img');
  let visibleCount = 0;
  images.forEach(img => {
    const match = category === 'all' || img.dataset.category === category;
    img.classList.toggle('hidden', !match);
    if(match) visibleCount++;
  });

  const emptyEl = document.getElementById('gallery-empty');
  if(emptyEl) emptyEl.classList.toggle('hidden', visibleCount > 0);
}

function renderPublicGallery(){
  const container = document.getElementById('masonry');
  if(!container) return;
  const items = (typeof getGallery === 'function') ? getGallery() : [];
  if(!items.length){
    container.innerHTML = '';
    const emptyEl = document.getElementById('gallery-empty');
    if(emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  container.innerHTML = items.map(item => `
    <img src="${item.photo || item.src || ''}" data-category="${typeof esc === 'function' ? esc(item.category || 'resort') : (item.category || 'resort')}" alt="${typeof esc === 'function' ? esc(item.caption || item.category || 'Resort Photo') : (item.caption || 'Resort Photo')}">
  `).join('');

  const activeBtn = document.querySelector('#gallery-tabs button.active');
  filterGallery(activeBtn ? activeBtn.dataset.filter : 'all');
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', renderPublicGallery);
} else {
  renderPublicGallery();
}
