// ==========================================
// 1. GLOBAL CONSTANTS & CONFIGURATIONS
// ==========================================
const STORAGE_KEY = 'shelfed_users_v1';
const CURRENT_EMAIL_KEY = 'shelfed_current_email';

const THEMES = [
  { id: 'paper',  name: 'Paper',  colors: { accent: '#b06a1e', accentDeep: '#5a3a14', accent2: '#4a6b5d' } },
  { id: 'forest', name: 'Forest', colors: { accent: '#3e7a4f', accentDeep: '#22452d', accent2: '#7a5a2e' } },
  { id: 'ocean',  name: 'Ocean',  colors: { accent: '#2f6f9f', accentDeep: '#1c3f5e', accent2: '#3e7a72' } },
  { id: 'berry',  name: 'Berry',  colors: { accent: '#a24a6e', accentDeep: '#5e2b41', accent2: '#4a5a8a' } },
  { id: 'slate',  name: 'Slate',  colors: { accent: '#5a6472', accentDeep: '#2e343c', accent2: '#8a6d3b' } },
  {
    id: 'magic',
    name: 'The Wizarding Library',
    magic: true,
    emblem: '🦉',
    desc: 'Floating candles, starlight, and gilded shelves.',
    colors: { accent: '#a8842c', accentDeep: '#5c451a', accent2: '#5b4a86' }
  }
];

const LEGACY_THEME_MAP = { hogwarts: 'magic', middleearth: 'paper', gatsby: 'paper', sherlock: 'slate' };

const AVATARS = [
  { name: 'The Wizard', emoji: '🧙', bg: '#5b4a86' },
  { name: 'The Night Owl', emoji: '🦉', bg: '#7a5a2e' },
  { name: 'The Detective', emoji: '🕵️', bg: '#3e4a56' },
  { name: 'The Explorer', emoji: '🧭', bg: '#2f6f9f' },
  { name: 'The Dreamer', emoji: '🌙', bg: '#4a5a8a' },
  { name: 'The Bookworm', emoji: '🐛', bg: '#3e7a4f' },
  { name: 'The Dragon', emoji: '🐉', bg: '#a24a6e' },
  { name: 'The Star Reader', emoji: '✨', bg: '#a8842c' }
];

const GENRE_RULES = [
  { label: 'Fantasy', keys: ['fantasy', 'magic', 'wizard', 'dragons', 'epic fantasy'] },
  { label: 'Science Fiction', keys: ['science fiction', 'sci-fi', 'dystopia', 'space opera', 'time travel'] },
  { label: 'Mystery', keys: ['mystery', 'detective', 'crime', 'whodunit'] },
  { label: 'Thriller', keys: ['thriller', 'suspense', 'espionage', 'spy'] },
  { label: 'Horror', keys: ['horror', 'ghost stories', 'supernatural'] },
  { label: 'Romance', keys: ['romance', 'love stories'] },
  { label: 'Historical Fiction', keys: ['historical fiction'] },
  { label: 'Young Adult', keys: ['young adult', 'ya fiction', 'teen fiction'] },
  { label: 'Adventure', keys: ['adventure', 'survival', 'sea stories'] },
  { label: 'Biography', keys: ['biography', 'autobiography'] },
  { label: 'Memoir', keys: ['memoir'] },
  { label: 'Self-Help', keys: ['self-help', 'self help', 'personal development'] },
  { label: 'Business', keys: ['business', 'economics', 'finance', 'investing', 'entrepreneurship'] },
  { label: 'History', keys: ['history', 'world war'] },
  { label: 'Poetry', keys: ['poetry', 'poems'] },
  { label: 'Comics & Graphic Novels', keys: ['comics', 'graphic novel', 'manga'] },
  { label: 'Classics', keys: ['classic literature', 'classics'] },
  { label: 'Literary Fiction', keys: ['literary fiction', 'fiction, general'] },
  { label: 'Nonfiction', keys: ['nonfiction', 'non-fiction', 'science', 'psychology', 'philosophy'] },
  { label: 'Children', keys: ['juvenile fiction', 'juvenile literature', "children's"] }
];

// ==========================================
// 2. STATE & ELEMENT CACHING
// ==========================================
const state = {
  user: null,
  profiles: [],
  previewBook: null,
  scanMode: false,
  scanner: null,
  currentStatus: 'own',
  recommendations: [],
  recSpin: 0
};

const ids = {};

function initElements() {
  const elementIds = [
    'signin', 'app', 'signinStatus', 'profileList', 'themeEmblem', 'avatar', 'whoName',
    'searchInput', 'groupSelect', 'ownFilter', 'sortSelect', 'libraryGrid', 'libraryEmpty',
    'wishlistGrid', 'wishlistEmpty', 'scanBtn', 'reader', 'scanHint', 'isbnInput', 'lookupStatus',
    'previewPanel', 'previewDetail', 'statusChips', 'recStatus', 'recList', 'profileAvatar',
    'profileName', 'profileMail', 'avatarPicker', 'avatarHint', 'top5Row', 'friendLinkStatus',
    'friendsList', 'shareCard', 'shareText', 'copyStatus', 'darkToggle', 'themeGrid', 'toast',
    'modalBg', 'modalContent', 'nameInput', 'emailInput', 'shelfStats', 'recSummaryContent', 'recBtn'
  ];
  elementIds.forEach(id => { ids[id] = document.getElementById(id); });
}

function $(id) { return ids[id] || document.getElementById(id); }

// ==========================================
// 3. LOW-LEVEL SANITIZATION & ENGINE UTILITIES
// ==========================================
function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizeIsbn(input) {
  return String(input || '').replace(/[^0-9Xx]/g, '');
}

function normalizeIsbnKey(isbn) {
  return String(isbn || '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

function cleanSeriesName(raw) {
  if (!raw) return '';
  return String(raw)
    .split(';')[0]
    .replace(/[,#]?\s*(book|vol\.?|volume|no\.?)?\s*\d+([-–]\d+)?\s*$/i, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
}

function canonicalGenre(subjects) {
  const list = (Array.isArray(subjects) ? subjects : [subjects])
    .filter(Boolean)
    .map(subject => String(subject).toLowerCase());
  if (!list.length) return '';
  for (const rule of GENRE_RULES) {
    if (list.some(subject => rule.keys.some(key => subject.includes(key)))) return rule.label;
  }
  return '';
}

function extractSeries(raw) {
  if (Array.isArray(raw.series) && raw.series.length) return raw.series[0];
  if (typeof raw.series === 'string') return raw.series;
  return '';
}

function extractGenre(raw) {
  const items = [].concat(raw.subject, raw.subjects, raw.genre).filter(Boolean);
  const canonical = canonicalGenre(items);
  return canonical || (items[0] ? String(items[0]).slice(0, 24) : 'General');
}

function resolveThemeId(id) {
  if (THEMES.some(theme => theme.id === id)) return id;
  return LEGACY_THEME_MAP[id] || 'paper';
}

function getAvatarOption(name) {
  return AVATARS.find(option => option.name === name) || null;
}

function getAvatarInitials(name) {
  const parts = String(name || '').split(' ').filter(Boolean);
  if (!parts.length) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isSameBook(a, b) {
  const ia = normalizeIsbnKey(a.isbn);
  const ib = normalizeIsbnKey(b.isbn);
  if (ia && ib && ia === ib) return true;
  return String(a.title).toLowerCase() === String(b.title).toLowerCase();
}

function findExistingBook(book) {
  if (!state.user) return null;
  return state.user.books.find(existing => isSameBook(existing, book)) || null;
}

function buildAmazonUrl(book) {
  const query = book.isbn ? `${book.isbn} ${book.title} ${book.author}` : `${book.title} ${book.author}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

function setStatus(id, text, className) {
  const el = $(id);
  if (el) {
    el.textContent = text;
    el.className = `status ${className}`;
  }
}

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ==========================================
// 4. STORAGE ACCESS & ACCOUNT MANAGEMENT
// ==========================================
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
}

function saveUsers(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }

function getCurrentUser() {
  const email = localStorage.getItem(CURRENT_EMAIL_KEY);
  if (!email) return null;
  const users = loadUsers();
  return users[email] || null;
}

function saveCurrentUser() {
  if (!state.user) return;
  const users = loadUsers();
  users[state.user.email] = state.user;
  saveUsers(users);
  localStorage.setItem(CURRENT_EMAIL_KEY, state.user.email);
}

function getOrCreateUser(name, email) {
  const users = loadUsers();
  const trimmedEmail = email.trim().toLowerCase();
  if (users[trimmedEmail]) {
    const user = users[trimmedEmail];
    user.name = name || user.name;
    return user;
  }
  return {
    name: name.trim() || 'Reader',
    email: trimmedEmail,
    avatar: AVATARS[0].name,
    theme: 'paper',
    dark: false,
    top5: [null, null, null, null, null],
    books: [],
    friends: []
  };
}

// ==========================================
// 5. OPEN LIBRARY INTEGRATION ENGINE
// ==========================================
function mapOpenLibraryResult(raw) {
  const title = raw.title || 'Untitled';
  const author = Array.isArray(raw.author_name) ? raw.author_name[0] : (raw.author || 'Unknown Author');
  const isbnDigits = String(raw.isbn?.[0] || raw.isbn || '');
  const cover = raw.cover_i ? `https://covers.openlibrary.org/b/id/${raw.cover_i}-L.jpg` : (isbnDigits ? `https://covers.openlibrary.org/b/isbn/${isbnDigits}-L.jpg` : '');
  
  return {
    title,
    author,
    series: cleanSeriesName(extractSeries(raw)),
    genre: extractGenre(raw),
    isbn: isbnDigits,
    cover,
    blurb: raw.subtitle || 'Added to your shelf catalog collection.',
    status: 'own',
    rating: 0,
    addedAt: Date.now()
  };
}

async function fetchOpenLibraryBooks(query, limit = 8) {
  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await response.json();
    return (data.docs || []).map(mapOpenLibraryResult);
  } catch (err) {
    return [];
  }
}

// ==========================================
// 6. DYNAMIC UI RENDERING FUNCTIONS
// ==========================================
function renderRating(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  if (!value) return '<span class="unrated">Not rated</span>';
  const stars = Array.from({ length: 5 }, (_, index) => {
    const fill = Math.max(0, Math.min(1, value - index));
    return `<span class="star-icon" style="--fill:${fill.toFixed(2)};color:var(--accent)">★</span>`;
  }).join('');
  return `<span class="rating-stars">${stars}</span>`;
}

function renderShelfStats(books) {
  const total = books.length;
  const owned = books.filter(book => book.status === 'own').length;
  const borrowed = books.filter(book => book.status === 'borrow').length;
  const wishlist = books.filter(book => book.status === 'wishlist').length;
  const ratedBooks = books.filter(book => Number(book.rating) > 0);
  const averageRating = ratedBooks.length ? (ratedBooks.reduce((sum, book) => sum + Number(book.rating), 0) / ratedBooks.length).toFixed(1) : '—';
  
  const stats = $('shelfStats');
  if (!stats) return;
  stats.innerHTML = `
    <div class="stat"><div class="num">${total}</div><div class="lbl">Shelf total</div></div>
    <div class="stat"><div class="num">${owned}</div><div class="lbl">Owned</div></div>
    <div class="stat"><div class="num">${borrowed}</div><div class="lbl">Borrowed</div></div>
    <div class="stat"><div class="num">${wishlist}</div><div class="lbl">Wishlist</div></div>
    <div class="stat"><div class="num">${averageRating}</div><div class="lbl">Avg rating</div></div>
  `;
}

function createBookCard(book) {
  const button = document.createElement('button');
  button.className = 'book-card';
  button.onclick = () => openBookModal(book.id);

  const isTop5 = state.user?.top5.includes(book.id);
  const cover = book.cover ?
    `<img src="${book.cover}" alt="${escapeHtml(book.title)} cover">` :
    `<div class="cover-fallback"><div class="t">${escapeHtml(book.title)}</div><div class="a">${escapeHtml(book.author)}</div></div>`;

  button.innerHTML = `
    <div class="cover-wrap">${cover}
      <div class="status-badge">${book.status === 'own' ? 'Owned' : book.status === 'borrow' ? 'Borrowed' : 'Wishlist'}</div>
      ${isTop5 ? '<div class="top-badge" style="position:absolute;top:4px;right:4px;background:var(--accent);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px">★</div>' : ''}
    </div>
    <div class="card-meta">
      <span class="card-title">${escapeHtml(book.title)}</span>
      <span class="card-sub">${escapeHtml(book.series || book.genre || 'No Grouping')}</span>
      <div class="card-stars">${renderRating(book.rating)}</div>
    </div>
  `;
  return button;
}

function renderRatingEditor(book) {
  return `
    <div class="rating-editor" style="margin-top:8px">
      <div class="rating-row" style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div class="rating-stars">${renderRating(book.rating)}</div>
        <span class="rating-readout"><strong>${Number(book.rating) > 0 ? `${Number(book.rating).toFixed(1)} / 5` : 'Unrated'}</strong></span>
      </div>
      <input class="rating-range" type="range" min="0" max="5" step="0.5" value="${Number(book.rating) || 0}" style="width:100%" oninput="setBookRating('${book.id}', parseFloat(this.value))">
    </div>
  `;
}

function renderThemeGrid() {
  const grid = $('themeGrid');
  if (!grid || !state.user) return;
  grid.innerHTML = '';
  THEMES.forEach(theme => {
    const active = state.user.theme === theme.id ? 'active' : '';
    const btn = document.createElement('button');
    btn.className = `theme-option ${active}`;
    btn.style.borderColor = theme.colors.accent;
    btn.innerHTML = `
      <div class="theme-swatch" style="background:${theme.colors.accent}"></div>
      <div class="theme-name">${theme.name} ${theme.emblem || ''}</div>
    `;
    btn.onclick = () => {
      applyTheme(theme.id);
      renderThemeGrid();
    };
    grid.appendChild(btn);
  });
}

function renderWishlist() {
  if (!state.user) return;
  const wishlist = state.user.books.filter(book => book.status === 'wishlist');
  const grid = $('wishlistGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!wishlist.length) {
    if ($('wishlistEmpty')) $('wishlistEmpty').style.display = 'block';
    return;
  }
  if ($('wishlistEmpty')) $('wishlistEmpty').style.display = 'none';
  wishlist.forEach(book => grid.appendChild(createBookCard(book)));
}

function renderRecommendationsSummary() {
  const summary = $('recSummaryContent');
  if (!summary || !state.user) return;
  
  const highRated = state.user.books.filter(b => b.rating >= 4.5);
  const coreGenres = [...new Set(state.user.books.map(b => b.genre).filter(Boolean))];

  summary.innerHTML = `
    <p style="margin:0">⭐ <strong>Favorites count:</strong> ${highRated.length} books rated 4.5+ stars.</p>
    <p style="margin:4px 0 0">🗂️ <strong>Active categories discovered:</strong> ${coreGenres.join(', ') || 'None found yet'}</p>
  `;
}

function updateUserHeader() {
  if (!state.user) return;
  const option = getAvatarOption(state.user.avatar);
  if ($('whoName')) $('whoName').textContent = state.user.name;
  if ($('profileName')) $('profileName').textContent = state.user.name;
  if ($('profileMail')) $('profileMail').textContent = state.user.email;

  [$('avatar'), $('profileAvatar')].forEach(el => {
    if (!el) return;
    el.style.backgroundImage = '';
    if (option) {
      el.style.background = option.bg;
      el.textContent = option.emoji;
    } else {
      el.style.background = '';
      el.textContent = getAvatarInitials(state.user.name);
    }
  });

  const theme = THEMES.find(item => item.id === resolveThemeId(state.user.theme));
  if ($('themeEmblem')) $('themeEmblem').textContent = theme?.emblem || '';
}

function renderLibrary() {
  if (!state.user) return;
  const query = $('searchInput')?.value.trim().toLowerCase() || '';
  const groupBy = $('groupSelect')?.value || 'none';
  const filter = $('ownFilter')?.value || 'all';
  const sortBy = $('sortSelect')?.value || 'date';

  let books = state.user.books.filter(book => book.status !== 'wishlist');

  books = books.filter(book => {
    if (filter === 'own' && book.status !== 'own') return false;
    if (filter === 'borrow' && book.status !== 'borrow') return false;
    if (!query) return true;
    return [book.title, book.author, book.series, book.genre, book.isbn].some(value =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  if (sortBy === 'rating') {
    books.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'genre') {
    books.sort((a, b) => String(a.genre || '\uffff').localeCompare(String(b.genre || '\uffff')) || a.title.localeCompare(b.title));
  } else if (sortBy === 'title') {
    books.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'author') {
    books.sort((a, b) => a.author.localeCompare(b.author));
  } else {
    books.sort((a, b) => b.addedAt - a.addedAt);
  }

  renderShelfStats(state.user.books);

  const grid = $('libraryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!books.length) {
    if ($('libraryEmpty')) $('libraryEmpty').style.display = 'block';
    return;
  }
  if ($('libraryEmpty')) $('libraryEmpty').style.display = 'none';

  if (groupBy !== 'none') {
    const groups = books.reduce((acc, book) => {
      const key = (book[groupBy] || 'Unknown').trim() || 'Unknown';
      acc[key] = acc[key] || [];
      acc[key].push(book);
      return acc;
    }, {});

    Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    }).forEach((groupName) => {
      const groupSection = document.createElement('div');
      groupSection.className = 'group-block';
      groupSection.innerHTML = `
        <div class="group-head">
          <span class="group-title">${escapeHtml(groupName)}</span>
          <span class="group-count">${groups[groupName].length} book${groups[groupName].length === 1 ? '' : 's'}</span>
        </div>
      `;
      const groupGrid = document.createElement('div');
      groupGrid.className = 'grid';
      groups[groupName].forEach(book => groupGrid.appendChild(createBookCard(book)));
      groupSection.appendChild(groupGrid);
      grid.appendChild(groupSection);
    });
  } else {
    grid.className = 'grid';
    books.forEach(book => grid.appendChild(createBookCard(book)));
  }
}

function renderProfile() {
  if (!state.user) return;
  updateUserHeader();

  const picker = $('avatarPicker');
  if (picker) {
    picker.innerHTML = '';
    AVATARS.forEach(av => {
      const isSelected = state.user.avatar === av.name ? 'active' : '';
      const btn = document.createElement('button');
      btn.className = `avatar-btn ${isSelected}`;
      btn.style.background = av.bg;
      btn.textContent = av.emoji;
      btn.onclick = () => {
        state.user.avatar = av.name;
        saveCurrentUser();
        renderProfile();
        if ($('avatarHint')) $('avatarHint').textContent = av.name;
      };
      picker.appendChild(btn);
    });
  }

  const top5Row = $('top5Row');
  if (top5Row) {
    top5Row.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const bookId = state.user.top5[i];
      const book = state.user.books.find(b => b.id === bookId);
      const slot = document.createElement('div');
      slot.className = 'top5-slot';
      slot.style.border = '2px dashed var(--accent)';
      slot.style.minHeight = '100px';
      slot.style.display = 'inline-block';
      slot.style.width = '70px';
      slot.style.marginRight = '8px';
      slot.style.cursor = 'pointer';
      
      if (book) {
        slot.innerHTML = book.cover ? `<img src="${book.cover}" style="width:100%;height:100%;object-fit:cover">` : `<div style="font-size:10px;padding:4px">${escapeHtml(book.title)}</div>`;
      } else {
        slot.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent)">+</div>`;
      }
      slot.onclick = () => openTop5Picker(i);
      top5Row.appendChild(slot);
    }
  }

  if ($('shareText')) {
    const listText = state.user.books.map(b => `- ${b.title} by ${b.author} (${b.status.toUpperCase()}) [Rating: ${b.rating || 'Unrated'}]`).join('\n');
    $('shareText').textContent = listText || 'Your library is empty right now.';
  }
}

// ==========================================
// 7. INTERACTIVE ACTION DISPATCHERS
// ==========================================
function setDark(val) {
  if (state.user) {
    state.user.dark = !!val;
    saveCurrentUser();
  }
  document.body.classList.toggle('dark', !!val);
  if ($('darkToggle')) $('darkToggle').checked = !!val;
}

function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId);
  if (!theme) return;
  document.documentElement.style.setProperty('--accent', theme.colors.accent);
  document.documentElement.style.setProperty('--accent-deep', theme.colors.accentDeep);
  document.documentElement.style.setProperty('--accent-2', theme.colors.accent2);
  if (state.user) {
    state.user.theme = themeId;
    saveCurrentUser();
    updateUserHeader();
  }
}

function pickStatus(status) {
  state.currentStatus = status;
  const container = $('statusChips');
  if (!container) return;
  container.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('on', chip.getAttribute('data-s') === status);
  });
}

function clearPreview() {
  state.previewBook = null;
  if ($('previewPanel')) $('previewPanel').style.display = 'none';
  if ($('previewDetail')) $('previewDetail').innerHTML = '';
  if ($('isbnInput')) $('isbnInput').value = '';
  if ($('lookupStatus')) $('lookupStatus').textContent = '';
  pickStatus('own');
}

function showPreview(book) {
  state.previewBook = book;
  const panel = $('previewPanel');
  const detail = $('previewDetail');
  if (!panel || !detail) return;

  panel.style.display = 'block';
  const cover = book.cover ? `<img src="${book.cover}" alt="cover">` : `<div class="cover-fallback"><div class="t">${book.title}</div></div>`;
  detail.innerHTML = `
    <div class="cover-wrap">${cover}</div>
    <div style="flex:1">
      <h3>${escapeHtml(book.title)}</h3>
      <div class="author">By ${escapeHtml(book.author)}</div>
      ${book.series ? `<div class="sub">Series: ${escapeHtml(book.series)}</div>` : ''}
      ${book.genre ? `<div class="sub">Genre: ${escapeHtml(book.genre)}</div>` : ''}
    </div>
  `;
  panel.scrollIntoView({ behavior: 'smooth' });
}

function showSearchResults(books, query) {
  const detail = $('previewDetail');
  if (!detail) return;
  $('previewPanel').style.display = 'block';
  detail.innerHTML = `<div class="picker-list" style="width:100%"><h5>Multiple results found for "${escapeHtml(query)}":</h5></div>`;
  const container = detail.querySelector('.picker-list');

  books.forEach(book => {
    const item = document.createElement('button');
    item.className = 'picker-item';
    item.innerHTML = `<div><strong>${escapeHtml(book.title)}</strong> by ${escapeHtml(book.author)}</div>`;
    item.onclick = () => showPreview(book);
    container.appendChild(item);
  });
}

function showApp() {
  if ($('signin')) $('signin').style.display = 'none';
  if ($('app')) $('app').style.display = 'block';
  state.currentStatus = 'own';
  updateUserHeader();
  renderLibrary();
  renderWishlist();
  renderProfile();
  renderThemeGrid();
  renderRecommendationsSummary();
  if (state.user) {
    setDark(state.user.dark);
    applyTheme(resolveThemeId(state.user.theme));
  }
}

function loadProfiles() {
  const users = Object.values(loadUsers());
  const list = $('profileList');
  if (!list) return;
  list.innerHTML = '';
  if (!users.length) return;

  const heading = document.createElement('div');
  heading.className = 'pl';
  heading.textContent = 'Saved accounts';
  list.appendChild(heading);

  users.forEach(user => {
    const row = document.createElement('div');
    row.className = 'profile-row';
    row.addEventListener('click', () => {
      if ($('nameInput')) $('nameInput').value = user.name;
      if ($('emailInput')) $('emailInput').value = user.email;
      signIn();
    });
    row.innerHTML = `<strong>${user.name}</strong><span class="pe">${user.email}</span>`;
    list.appendChild(row);
  });
}

function signIn() {
  const name = $('nameInput')?.value.trim();
  const email = $('emailInput')?.value.trim().toLowerCase();
  const status = $('signinStatus');
  if (!status) return;

  if (!name || !email) {
    status.className = 'status err';
    status.textContent = 'Please enter both name and email.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.className = 'status err';
    status.textContent = 'Please enter a valid email address.';
    return;
  }

  state.user = getOrCreateUser(name, email);
  saveCurrentUser();
  state.user = getCurrentUser();
  loadProfiles();
  showApp();
}

function signOut() {
  localStorage.removeItem(CURRENT_EMAIL_KEY);
  stopScanner();
  window.location.reload();
}

function stopScanner() {
  state.scanMode = false;
  if ($('scanBtn')) $('scanBtn').textContent = '📷 Start scanning';
  if ($('scanHint')) $('scanHint').textContent = '';
  if (state.scanner) {
    state.scanner.stop().then(() => {
      state.scanner = null;
    }).catch(() => {});
  }
}

function startScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    setStatus('scanHint', 'Scanner engine failed to load. Check internet connection.', 'err');
    return;
  }
  state.scanMode = true;
  if ($('scanBtn')) $('scanBtn').textContent = '🛑 Stop scanning';
  if ($('scanHint')) $('scanHint').textContent = 'Looking for a barcode...';

  state.scanner = new Html5Qrcode("reader");
  state.scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 280, height: 160 } },
    (decodedText) => {
      stopScanner();
      const normalized = normalizeIsbn(decodedText);
      if ($('isbnInput')) $('isbnInput').value = normalized;
      lookupISBN(normalized);
    },
    () => {}
  ).catch(() => {
    setStatus('scanHint', 'Could not open camera. Ensure permissions are allowed.', 'err');
    stopScanner();
  });
}

function toggleScanner() {
  if (state.scanMode) {
    stopScanner();
  } else {
    startScanner();
  }
}

async function enrichBookOnline(bookId) {
  const book = state.user?.books.find(item => item.id === bookId);
  if (!book) return;
  try {
    const isbn = normalizeIsbnKey(book.isbn);
    const q = isbn ? `isbn:${isbn}` : book.title;
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1`);
    if (!response.ok) return;
    const data = await response.json();
    const doc = data?.docs?.[0];
    if (!doc) return;

    let altered = false;
    if (!book.genre) { book.genre = extractGenre(doc); altered = true; }
    if (!book.series) { book.series = cleanSeriesName(extractSeries(doc)); altered = true; }
    if (altered) {
      saveCurrentUser();
      renderLibrary();
    }
  } catch (e) {}
}

function addBookToLibrary(book) {
  if (!book || !state.user) return null;
  const existing = findExistingBook(book);
  if (existing) {
    showToast(`"${existing.title}" is already on your shelf.`);
    return existing;
  }

  const normalized = {
    ...book,
    id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: book.status || state.currentStatus,
    rating: Number(book.rating) || 0,
    addedAt: Date.now()
  };

  state.user.books.unshift(normalized);
  saveCurrentUser();
  renderLibrary();
  renderWishlist();
  showToast(`Added "${normalized.title}".`);
  enrichBookOnline(normalized.id);
  return normalized;
}

function addPreviewToLibrary() {
  if (!state.previewBook) return;
  state.previewBook.status = state.currentStatus;
  addBookToLibrary(state.previewBook);
  clearPreview();
}

async function searchOpenLibrary(query) {
  try {
    const books = await fetchOpenLibraryBooks(query, 8);
    if (!books.length) {
      setStatus('lookupStatus', 'No matching book was found.', 'err');
      return [];
    }
    if (books.length > 1) {
      showSearchResults(books, query);
    } else {
      showPreview(books[0]);
    }
    setStatus('lookupStatus', '', '');
    return books;
  } catch (error) {
    setStatus('lookupStatus', 'Unable to execute service request.', 'err');
    return [];
  }
}

async function lookupISBN(isbn) {
  try {
    const [edition, doc] = await Promise.all([
      fetch(`https://openlibrary.org/isbn/${isbn}.json`).then(res => res.ok ? res.json() : {}).catch(() => ({})),
      fetch(`https://openlibrary.org/search.json?q=isbn:${isbn}&limit=1`)
        .then(res => res.ok ? res.json() : null)
        .then(data => data?.docs?.[0])
        .catch(() => null)
    ]);
    if (!edition.title && !doc) {
      await searchOpenLibrary(isbn);
      return;
    }
    const book = mapOpenLibraryResult({ ...(doc || {}), ...edition, isbn });
    showPreview(book);
    setStatus('lookupStatus', '', '');
  } catch (error) {
    await searchOpenLibrary(isbn);
  }
}

async function lookupManual() {
  const query = $('isbnInput')?.value.trim();
  if (!query) {
    setStatus('lookupStatus', 'Enter an ISBN or title to search.', 'err');
    return;
  }
  clearPreview();
  setStatus('lookupStatus', 'Searching database records...', '');

  if (/^\d{9}[\dXx]$|^\d{13}$/.test(query.replace(/[^0-9Xx]/g, ''))) {
    const normalized = normalizeIsbn(query);
    await lookupISBN(normalized);
  } else {
    await searchOpenLibrary(query);
  }
}

function setBookRating(bookId, rating) {
  const book = state.user?.books.find(item => item.id === bookId);
  if (!book) return;
  book.rating = Math.round(Math.max(0, Math.min(5, rating)) * 10) / 10;
  saveCurrentUser();
  renderLibrary();
  renderWishlist();
  
  const readout = document.querySelector('.rating-readout');
  const stars = document.querySelector('.rating-editor .rating-stars');
  if (readout) readout.innerHTML = `<strong>${book.rating > 0 ? book.rating.toFixed(1) : 'Unrated'} / 5</strong>`;
  if (stars) stars.innerHTML = renderRating(book.rating);
}

function closeModal() {
  if ($('modalBg')) $('modalBg').classList.remove('open');
}

function updateBookStatus(bookId, status) {
  const book = state.user.books.find(item => item.id === bookId);
  if (!book) return;
  book.status = status;
  saveCurrentUser();
  renderLibrary();
  renderWishlist();
  openBookModal(bookId);
}

function removeBook(bookId) {
  const index = state.user.books.findIndex(item => item.id === bookId);
  if (index === -1) return;
  const [removed] = state.user.books.splice(index, 1);
  state.user.top5 = state.user.top5.map(id => id === bookId ? null : id);
  saveCurrentUser();
  renderLibrary();
  renderWishlist();
  renderProfile();
  renderRecommendationsSummary();
  closeModal();
  showToast(`Removed "${removed.title}" from shelf.`);
}

function openBookModal(bookId) {
  const book = state.user.books.find(item => item.id === bookId);
  if (!book) return;

  if ($('modalContent')) {
    $('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">×</button>
      <div class="detail" style="display:flex;gap:16px">
        <div class="cover-wrap" style="width:120px">${book.cover ? `<img src="${book.cover}" style="width:100%">` : `<div class="cover-fallback">No Cover</div>`}</div>
        <div class="detail-info" style="flex:1">
          <h3>${escapeHtml(book.title)}</h3>
          <div class="author" style="margin:4px 0">By <strong>${escapeHtml(book.author)}</strong></div>
          ${book.series ? `<div>Series: <em>${escapeHtml(book.series)}</em></div>` : ''}
          ${book.genre ? `<div>Genre: <em>${escapeHtml(book.genre)}</em></div>` : ''}
          <div class="blurb" style="margin-top:10px;font-size:13px;color:var(--ink-sub)">${escapeHtml(book.blurb || 'No description summary details loaded.')}</div>
          <div class="field-label" style="margin-top:14px">Your valuation rating</div>
          ${renderRatingEditor(book)}
          <div class="chips" style="margin-top:14px">
            <button class="chip ${book.status === 'own' ? 'on' : ''}" onclick="updateBookStatus('${book.id}','own')">✓ Own</button>
            <button class="chip ${book.status === 'borrow' ? 'on' : ''}" onclick="updateBookStatus('${book.id}','borrow')">↩ Borrowed</button>
            <button class="chip ${book.status === 'wishlist' ? 'on' : ''}" onclick="updateBookStatus('${book.id}','wishlist')">🔐 Wishlist</button>
          </div>
          <div class="row" style="margin-top:16px;display:flex;gap:8px">
            <button class="btn danger small" onclick="removeBook('${book.id}')">Delete</button>
            <a class="btn ghost small" href="${buildAmazonUrl(book)}" target="_blank" rel="noreferrer">Shop</a>
          </div>
        </div>
      </div>
    `;
  }
  if ($('modalBg')) $('modalBg').classList.add('open');
}

function openTop5Picker(slotIndex) {
  if ($('modalContent')) {
    $('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">×</button>
      <h3>Select a book for Slot #${slotIndex + 1}</h3>
      <div class="picker-list" style="max-height:300px;overflow-y:auto;margin-top:12px"></div>
    `;
    const container = $('modalContent').querySelector('.picker-list');
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'picker-item';
    clearBtn.innerHTML = '<em>Empty this slot</em>';
    clearBtn.onclick = () => {
      state.user.top5[slotIndex] = null;
      saveCurrentUser();
      renderProfile();
      closeModal();
    };
    container.appendChild(clearBtn);

    state.user.books.forEach(book => {
      const item = document.createElement('button');
      item.className = 'picker-item';
      item.innerHTML = `<strong>${escapeHtml(book.title)}</strong> by ${escapeHtml(book.author)}`;
      item.onclick = () => {
        state.user.top5[slotIndex] = book.id;
        saveCurrentUser();
        renderProfile();
        closeModal();
      };
      container.appendChild(item);
    });
  }
  if ($('modalBg')) $('modalBg').classList.add('open');
}

function copyFriendLink() {
  const rawPayload = JSON.stringify({ name: state.user.name, top5: state.user.top5, books: state.user.books });
  // Safe base64 handling for Unicode characters & emojis
  const utf8Bytes = new TextEncoder().encode(rawPayload);
  const binString = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join("");
  const safeBase64 = btoa(binString);

  const dynamicUrl = `${window.location.origin}${window.location.pathname}?viewSnapshot=${encodeURIComponent(state.user.email)}&data=${safeBase64}`;
  navigator.clipboard.writeText(dynamicUrl).then(() => {
    setStatus('friendLinkStatus', 'Link copied to clipboard!', '');
  }).catch(() => {
    setStatus('friendLinkStatus', 'Failed to auto-copy.', 'err');
  });
}

function copyShare() {
  const shareArea = $('shareText');
  if (!shareArea) return;
  navigator.clipboard.writeText(shareArea.textContent).then(() => {
    setStatus('copyStatus', 'Copied text snapshot!', '');
  });
}

async function getRecommendations() {
  const list = $('recList');
  const status = $('recStatus');
  if (!list || !status || !state.user) return;

  list.innerHTML = '';
  setStatus('recStatus', 'Scanning shelf profiles for inspiration...', '');

  const targets = state.user.books.filter(b => b.rating >= 4.0 || state.user.top5.includes(b.id));
  if (!targets.length) {
    setStatus('recStatus', 'Rate books 4+ stars or add books to your Top 5 to seed recommendations.', 'err');
    return;
  }

  const genres = [...new Set(targets.map(b => b.genre).filter(Boolean))];
  const selectedGenre = genres.length ? genres[state.recSpin % genres.length] : 'Fiction';
  state.recSpin++;

  setStatus('recStatus', `Pulling curated options matching "${selectedGenre}"...`, '');

  try {
    const books = await fetchOpenLibraryBooks(selectedGenre, 6);
    setStatus('recStatus', '', '');
    
    if (!books.length) {
      list.innerHTML = '<div class="empty">No suggestions found. Try adding more profile data.</div>';
      return;
    }

    books.forEach(book => {
      const card = document.createElement('div');
      card.className = 'panel';
      card.style.display = 'flex';
      card.style.gap = '12px';
      card.style.marginBottom = '12px';
      
      const cover = book.cover ? `<img src="${book.cover}" style="width:60px;height:90px;object-fit:cover">` : `<div class="cover-fallback" style="width:60px;height:90px;font-size:9px">No Cover</div>`;
      
      card.innerHTML = `
        ${cover}
        <div style="flex:1">
          <h4 style="margin:0">${escapeHtml(book.title)}</h4>
          <p class="sub" style="margin:2px 0 6px">By ${escapeHtml(book.author)}</p>
          <button class="btn small ghost">Add to wishlist</button>
        </div>
      `;
      card.querySelector('button').onclick = () => {
        book.status = 'wishlist';
        addBookToLibrary(book);
        card.querySelector('button').textContent = 'Added! ✓';
        card.querySelector('button').disabled = true;
      };
      list.appendChild(card);
    });
  } catch (e) {
    setStatus('recStatus', 'Unable to retrieve recommendation options at this time.', 'err');
  }
}

function showView(view) {
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-view') === view);
  });

  if (view !== 'add') stopScanner();
  if (view === 'library') renderLibrary();
  if (view === 'wishlist') renderWishlist();
  if (view === 'profile') renderProfile();
  if (view === 'recs') renderRecommendationsSummary();
}

// ==========================================
// 8. LIFECYCLE EVENT INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initElements();
  state.user = getCurrentUser();
  if (state.user) {
    showApp();
  } else {
    loadProfiles();
  }
});
