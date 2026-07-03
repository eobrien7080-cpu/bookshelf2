const STORAGE_KEY = 'shelfed_users_v1';
const CURRENT_EMAIL_KEY = 'shelfed_current_email';

// ---------- Themes: simple color options + one special library theme ----------
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

// Old story-theme ids saved by earlier versions map onto the new set.
const LEGACY_THEME_MAP = { hogwarts: 'magic', middleearth: 'paper', gatsby: 'paper', sherlock: 'slate' };

function resolveThemeId(id) {
  if (THEMES.some(theme => theme.id === id)) return id;
  return LEGACY_THEME_MAP[id] || 'paper';
}

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

function getAvatarOption(name) {
  return AVATARS.find(option => option.name === name) || null;
}

// ---------- Genre canonicalization (subjects from Open Library → one clean label) ----------
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

function cleanSeriesName(raw) {
  if (!raw) return '';
  return String(raw)
    .split(';')[0]
    .replace(/[,#]?\s*(book|vol\.?|volume|no\.?)?\s*\d+([-–]\d+)?\s*$/i, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
}

const state = {
  user: null,
  profiles: [],
  previewBook: null,
  scanMode: false,
  scanner: null,
  currentStatus: 'own',
  recommendations: []
};

const ids = [
  'signin', 'app', 'signinStatus', 'profileList', 'themeEmblem', 'avatar', 'whoName',
  'searchInput', 'groupSelect', 'ownFilter', 'sortSelect', 'libraryGrid', 'libraryEmpty',
  'wishlistGrid', 'wishlistEmpty', 'scanBtn', 'reader', 'scanHint', 'isbnInput', 'lookupStatus',
  'previewPanel', 'previewDetail', 'statusChips', 'recStatus', 'recList', 'profileAvatar',
  'profileName', 'profileMail', 'avatarPicker', 'avatarHint', 'top5Row', 'friendLinkStatus',
  'friendsList', 'shareCard', 'shareText', 'copyStatus', 'darkToggle', 'themeGrid', 'toast',
  'modalBg', 'modalContent'
].reduce((map, id) => { map[id] = document.getElementById(id); return map; }, {});

function $(id) { return document.getElementById(id); }

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const email = localStorage.getItem(CURRENT_EMAIL_KEY);
  if (!email) return null;
  const users = loadUsers();
  return users[email] || null;
}

function getOrCreateUser(name, email) {
  const users = loadUsers();
  const trimmedEmail = email.trim().toLowerCase();
  if (users[trimmedEmail]) {
    const user = users[trimmedEmail];
    user.name = name || user.name;
    return user;
  }

  const avatar = AVATARS[0].name;
  return {
    name: name.trim() || 'Reader',
    email: trimmedEmail,
    avatar,
    theme: 'paper',
    dark: false,
    top5: [null, null, null, null, null],
    books: [],
    friends: []
  };
}

function saveCurrentUser() {
  if (!state.user) return;
  const users = loadUsers();
  users[state.user.email] = state.user;
  saveUsers(users);
  localStorage.setItem(CURRENT_EMAIL_KEY, state.user.email);
}

function loadProfiles() {
  const users = Object.values(loadUsers());
  const list = $('profileList');
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
      $('nameInput').value = user.name;
      $('emailInput').value = user.email;
      signIn();
    });
    row.innerHTML = `<strong>${user.name}</strong><span class="pe">${user.email}</span>`;
    list.appendChild(row);
  });
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

function signIn() {
  const name = $('nameInput').value.trim();
  const email = $('emailInput').value.trim().toLowerCase();
  const status = $('signinStatus');

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
  state.scanMode = false;
  stopScanner();
  window.location.reload();
}

function showApp() {
  $('signin').style.display = 'none';
  $('app').style.display = 'block';
  state.currentStatus = 'own';
  updateUserHeader();
  renderLibrary();
  renderWishlist();
  renderProfile();
  renderThemeGrid();
  renderRecommendationsSummary();
  setDark(state.user.dark);
  applyTheme(state.user.theme);
}

function getAvatarInitials(name) {
  const parts = String(name || '').split(' ').filter(Boolean);
  if (!parts.length) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function updateUserHeader() {
  const option = getAvatarOption(state.user.avatar);
  $('whoName').textContent = state.user.name;
  $('profileName').textContent = state.user.name;
  $('profileMail').textContent = state.user.email;

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
  $('themeEmblem').textContent = theme?.emblem || '';
}

function showView(view) {
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  if (view !== 'add') {
    stopScanner();
  }
  if (view === 'library') {
    renderLibrary();
  }
  if (view === 'wishlist') {
    renderWishlist();
  }
  if (view === 'profile') {
    renderProfile();
  }
  if (view === 'recs') {
    renderRecommendationsSummary();
  }
}

function renderLibrary() {
  if (!state.user) return;
  const query = $('searchInput').value.trim().toLowerCase();
  const groupBy = $('groupSelect').value;
  const filter = $('ownFilter').value;
  const sortBy = $('sortSelect').value;

  let books = state.user.books.filter(book => book.status !== 'wishlist');

  books = books.filter(book => {
    if (filter === 'own' && book.status !== 'own') return false;
    if (filter === 'borrow' && book.status !== 'borrow') return false;
    if (!query) return true;
    return [book.title, book.author, book.series, book.genre, book.isbn, book.status].some(value =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  if (sortBy === 'rating') {
    books.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'genre') {
    books.sort((a, b) =>
      String(a.genre || '\uffff').localeCompare(String(b.genre || '\uffff')) ||
      a.title.localeCompare(b.title)
    );
  } else if (sortBy === 'title') {
    books.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'author') {
    books.sort((a, b) => a.author.localeCompare(b.author));
  } else {
    books.sort((a, b) => b.addedAt - a.addedAt);
  }

  renderShelfStats(state.user.books);

  const grid = $('libraryGrid');
  grid.innerHTML = '';

  if (!books.length) {
    $('libraryEmpty').style.display = 'block';
    return;
  }
  $('libraryEmpty').style.display = 'none';

  // Sorting by genre lays the shelf out as horizontal genre rows.
  const effectiveGroup = groupBy !== 'none' ? groupBy : (sortBy === 'genre' ? 'genre' : 'none');

  if (effectiveGroup !== 'none') {
    const groups = books.reduce((acc, book) => {
      const key = (book[effectiveGroup] || 'Unknown').trim() || 'Unknown';
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
          <button class="group-title plain">${groupName}</button>
          <span class="group-count">${groups[groupName].length} book${groups[groupName].length === 1 ? '' : 's'}</span>
        </div>
      `;
      const groupGrid = document.createElement('div');
      groupGrid.className = 'group-row';
      groups[groupName].forEach(book => groupGrid.appendChild(createBookCard(book)));
      groupSection.appendChild(groupGrid);
      grid.appendChild(groupSection);
    });
    grid.className = '';
  } else {
    grid.className = 'grid';
    books.forEach(book => grid.appendChild(createBookCard(book)));
  }
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
  button.addEventListener('click', () => openBookModal(book.id));

  const cover = book.cover ?
    `<img src="${book.cover}" alt="${book.title} cover">` :
    `<div class="cover-fallback"><div class="t">${book.title}</div><div class="a">${book.author}</div></div>`;

  button.innerHTML = `
    <div class="cover-wrap">${cover}
      <div class="status-badge">${book.status === 'own' ? 'Owned' : book.status === 'borrow' ? 'Borrowed' : 'Wishlist'}</div>
      ${book.top5 ? '<div class="top-badge">★</div>' : ''}
    </div>
    <div class="card-meta">
      <span class="card-title">${book.title}</span>
      <span class="card-sub">${escapeHtml(book.series || book.genre || '')}</span>
      <div class="card-stars">${renderRating(book.rating)}</div>
    </div>
  `;
  return button;
}

function renderRating(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  if (!value) return '<span class="unrated">Not rated</span>';
  const stars = Array.from({ length: 5 }, (_, index) => {
    const fill = Math.max(0, Math.min(1, value - index));
    return `<span class="star-icon" style="--fill:${fill.toFixed(2)}"><span class="star-bg">☆</span><span class="star-fg">★</span></span>`;
  }).join('');
  return `<span class="rating-stars" aria-label="${value.toFixed(1)} out of 5 stars">${stars}</span>`;
}

function buildAmazonUrl(book) {
  const query = book.isbn ? `${book.isbn} ${book.title} ${book.author}` : `${book.title} ${book.author}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

function renderRatingEditor(book) {
  return `
    <div class="rating-editor">
      <div class="rating-row">
        <div class="rating-stars">${renderRating(book.rating)}</div>
        <span class="rating-readout">${Number(book.rating) > 0 ? `${Number(book.rating).toFixed(1)} / 5` : 'Not rated yet'}</span>
      </div>
      <input class="rating-range" type="range" min="0" max="5" step="0.5" value="${Number(book.rating) || 0}" onchange="setBookRating('${book.id}', parseFloat(this.value))">
      <div class="rating-scale"><span>0</span><span>2.5</span><span>5</span></div>
    </div>
  `;
}

function setBookRating(bookId, rating) {
  const book = state.user?.books.find(item => item.id === bookId);
  if (!book) return;
  const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
  book.rating = Math.round(normalized * 10) / 10;
  saveCurrentUser();
  renderLibrary();
  renderWishlist();
  openBookModal(bookId);
}

function renderWishlist() {
  if (!state.user) return;
  const wishlist = state.user.books.filter(book => book.status === 'wishlist');
  const grid = $('wishlistGrid');
  grid.innerHTML = '';
  if (!wishlist.length) {
    $('wishlistEmpty').style.display = 'block';
    return;
  }
  $('wishlistEmpty').style.display = 'none';
  wishlist.forEach(book => grid.appendChild(createBookCard(book)));
}

function renderRelatedResults(bookId, relationType) {
  const book = state.user.books.find(item => item.id === bookId);
  if (!book) return;

  const query = relationType === 'author' ? book.author : (book.series || book.title);
  const heading = relationType === 'author' ? `More by ${book.author}` : `More in ${book.series || book.title}`;
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <h3 class="mh">${escapeHtml(heading)}</h3>
    <div class="sub" style="margin-top:-6px">Searching for “${escapeHtml(query)}”.</div>
    <div class="status">Loading related books…</div>
  `;
  $('modalBg').classList.add('open');

  fetchOpenLibraryBooks(query, 8).then(books => {
    const filtered = books.filter(item => !(item.title === book.title && item.author === book.author));
    const content = document.createElement('div');
    content.className = 'picker-list';

    if (!filtered.length) {
      content.innerHTML = '<div class="empty">No related books were found.</div>';
    } else {
      filtered.forEach(result => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'picker-item';
        item.innerHTML = `
          <div class="cover-wrap">${result.cover ? `<img src="${result.cover}" alt="${escapeHtml(result.title)} cover">` : `<div class="cover-fallback"><div class="t">${escapeHtml(result.title)}</div></div>`}</div>
          <div>
            <div class="pt">${escapeHtml(result.title)}</div>
            <div class="pa">${escapeHtml(result.author)}</div>
          </div>
        `;
        item.addEventListener('click', () => addBookToLibrary(result));
        content.appendChild(item);
      });
    }

    $('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">×</button>
      <h3 class="mh">${escapeHtml(heading)}</h3>
      <div class="sub" style="margin-top:-6px">Tap a result to add it to your shelf.</div>
      <div class="row" style="margin-bottom:12px">
        <button class="btn ghost small" onclick="openBookModal('${book.id}')">Back to book</button>
      </div>
    `;
    $('modalContent').appendChild(content);
  }).catch(() => {
    $('modalContent').innerHTML = `
      <button class="modal-close" onclick="closeModal()">×</button>
      <h3 class="mh">${escapeHtml(heading)}</h3>
      <div class="status err">Unable to load related books right now.</div>
    `;
  });
}

function openBookModal(bookId) {
  const book = state.user.books.find(item => item.id === bookId);
  if (!book) return;

  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <div class="detail">
      <div class="cover-wrap">${book.cover ? `<img src="${book.cover}" alt="${book.title} cover">` : `<div class="cover-fallback"><div class="t">${book.title}</div><div class="a">${book.author}</div></div>`}</div>
      <div class="detail-info">
        <h3>${book.title}</h3>
        <div class="author"><button class="author-link" onclick="renderRelatedResults('${book.id}','author')">${book.author}</button></div>
        ${book.series ? `<div class="series-line">Series: <button class="author-link" onclick="renderRelatedResults('${book.id}','series')">${escapeHtml(book.series)}</button></div>` : ''}
        ${book.genre ? `<div class="series-line">Genre: ${escapeHtml(book.genre)}</div>` : ''}
        <div class="blurb">${book.blurb || 'No description available.'}</div>
        <div class="field-label">Your rating</div>
        ${renderRatingEditor(book)}
        <div class="row" style="margin-top:16px">
          <button class="btn danger" onclick="removeBook('${book.id}')">Remove book</button>
          <a class="btn ghost" href="${buildAmazonUrl(book)}" target="_blank" rel="noreferrer">View on Amazon</a>
        </div>
        <div class="field-label">Status</div>
        <div class="chips">
          <button class="chip ${book.status === 'own' ? 'on' : ''}" onclick="updateBookStatus('${book.id}','own')">✓ Own</button>
          <button class="chip ${book.status === 'borrow' ? 'on' : ''}" onclick="updateBookStatus('${book.id}','borrow')">↩ Borrowed</button>
          <button class="chip ${book.status === 'wishlist' ? 'on' : ''}" onclick="updateBookStatus('${book.id}','wishlist')">🔐 Wishlist</button>
        </div>
      </div>
    </div>
  `;
  $('modalBg').classList.add('open');
}

function closeModal() {
  $('modalBg').classList.remove('open');
  $('modalContent').innerHTML = '';
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
  showToast(`Removed “${removed.title}” from your shelf.`);
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

async function lookupManual() {
  const query = $('isbnInput').value.trim();
  if (!query) {
    setStatus('lookupStatus', 'Enter an ISBN or title to search.', 'err');
    return;
  }
  clearPreview();
  setStatus('lookupStatus', 'Looking up your book…', '');

  if (/^\d{9}[\dXx]$|^\d{13}$/.test(query.replace(/[^0-9Xx]/g, ''))) {
    const normalized = normalizeIsbn(query);
    await lookupISBN(normalized);
    return;
  }

  await searchOpenLibrary(query);
}

function normalizeIsbn(input) {
  return input.replace(/[^0-9Xx]/g, '');
}

async function lookupISBN(isbn) {
  setStatus('scanHint', `Found barcode ${isbn}. Looking it up...`, '');
  try {
    const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!response.ok) {
      return searchOpenLibrary(isbn);
    }
    const raw = await response.json();
    const edition = await fetch(`https://openlibrary.org${raw.key}.json`).then(res => res.json()).catch(() => raw);
    const book = mapOpenLibraryResult({ ...raw, ...edition, isbn });
    showPreview(book);
    setStatus('lookupStatus', '', '');
  } catch (error) {
    await searchOpenLibrary(isbn);
  }
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
    setStatus('lookupStatus', 'Unable to look up the book right now.', 'err');
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeIsbnKey(isbn) {
  return String(isbn || '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

function isSameBook(a, b) {
  const ia = normalizeIsbnKey(a.isbn);
  const ib = normalizeIsbnKey(b.isbn);
  if (ia && ib && (ia.length === 10 || ia.length === 13) && ia === ib) return true;
  return String(a.title || '').trim().toLowerCase() === String(b.title || '').trim().toLowerCase()
    && String(a.author || '').trim().toLowerCase() === String(b.author || '').trim().toLowerCase();
}

function findExistingBook(book) {
  if (!state.user) return null;
  return state.user.books.find(existing => isSameBook(existing, book)) || null;
}

function addBookToLibrary(book, options = {}) {
  if (!book || !state.user) {
    if (options.showToast !== false) showToast('No book is ready to add.');
    return null;
  }

  // Don't add the same book twice.
  const existing = findExistingBook(book);
  if (existing) {
    if (options.showToast !== false) showToast(`“${existing.title}” is already on your shelf.`);
    clearPreview();
    return existing;
  }

  const normalized = {
    ...book,
    id: book.id || `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: book.status || state.currentStatus,
    rating: Number(book.rating) || 0,
    genre: book.genre || '',
    series: book.series || '',
    addedAt: Date.now()
  };

  state.user.books.unshift(normalized);
  saveCurrentUser();
  renderLibrary();
  renderWishlist();
  if (options.showToast !== false) showToast(`Added “${normalized.title}” to your shelf.`);
  clearPreview();

  // Fill in genre + series from Open Library in the background.
  enrichBookOnline(normalized.id);

  // Adding a book re-anchors recommendations, so genre rotation starts over.
  state.recSpin = 0;

  return normalized;
}

function extractSeries(raw) {
  if (Array.isArray(raw.series) && raw.series.length) return raw.series[0];
  if (typeof raw.series === 'string' && raw.series.trim()) return raw.series;
  if (Array.isArray(raw.series_title) && raw.series_title.length) return raw.series_title[0];
  if (typeof raw.series_title === 'string' && raw.series_title.trim()) return raw.series_title;
  if (typeof raw.work_title === 'string' && raw.work_title.trim()) return raw.work_title;
  return '';
}

function extractGenre(raw) {
  const candidates = [];
  const addSubjects = value => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(item => { if (item) candidates.push(String(item).trim()); });
    } else if (typeof value === 'string') {
      candidates.push(value.trim());
    }
  };

  addSubjects(raw.subject);
  addSubjects(raw.subjects);
  addSubjects(raw.subject_facet);
  addSubjects(raw.subject_people);
  addSubjects(raw.subject_places);
  addSubjects(raw.subject_times);
  addSubjects(raw.genre);
  addSubjects(raw.genre_facet);

  const canonical = canonicalGenre(candidates);
  if (canonical) return canonical;
  const first = candidates.find(Boolean) || '';
  return first.length <= 26 ? first : '';
}

// After a book is added, look up its genre and series online (Open Library)
// so grouping and sorting have real data to work with.
async function enrichBookOnline(bookId) {
  const book = state.user?.books.find(item => item.id === bookId);
  if (!book) return;
  try {
    const params = new URLSearchParams({
      title: book.title,
      author: book.author && book.author !== 'Unknown author' ? book.author : '',
      fields: 'title,author_name,series,subject,first_publish_year,cover_i',
      limit: '5'
    });
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (!response.ok) return;
    const data = await response.json();
    const docs = Array.isArray(data.docs) ? data.docs : [];

    const subjects = [];
    const seriesNames = [];
    docs.forEach(doc => {
      (doc.subject || []).forEach(subject => subjects.push(subject));
      (doc.series || []).forEach(name => seriesNames.push(name));
    });

    const live = state.user?.books.find(item => item.id === bookId);
    if (!live) return;

    let changed = false;
    const genre = canonicalGenre(subjects);
    if (genre && live.genre !== genre) { live.genre = genre; changed = true; }
    const series = cleanSeriesName(seriesNames[0]);
    if (series && !live.series) { live.series = series; changed = true; }

    // Backfill a missing cover from the best search match.
    if (!live.cover) {
      const coverDoc = docs.find(doc => doc.cover_i);
      if (coverDoc) {
        live.cover = `https://covers.openlibrary.org/b/id/${coverDoc.cover_i}-L.jpg`;
        changed = true;
      }
    }

    if (changed) {
      saveCurrentUser();
      renderLibrary();
      renderWishlist();
    }
  } catch (error) {
    // Enrichment is best-effort; the book stays usable without it.
  }
}

function mapOpenLibraryResult(raw) {
  const title = raw.title || 'Untitled';
  const author = Array.isArray(raw.author_name) ? raw.author_name[0] : raw.author || 'Unknown author';
  const series = cleanSeriesName(extractSeries(raw));
  const genre = extractGenre(raw);
  const isbn = raw.isbn || raw.key || '';
  // Covers come back in different shapes depending on the endpoint:
  // search results use cover_i, edition records (barcode scans) use a covers array.
  const coverId = raw.cover_i || (Array.isArray(raw.covers) ? raw.covers.find(id => id > 0) : null);
  const isbnDigits = String(raw.isbn || '').replace(/[^0-9Xx]/g, '');
  const cover = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : raw.cover ? `https://covers.openlibrary.org/b/isbn/${raw.cover}-L.jpg`
    : (isbnDigits.length === 10 || isbnDigits.length === 13) ? `https://covers.openlibrary.org/b/isbn/${isbnDigits}-L.jpg` : '';
  const description = raw.subtitle || raw.description || raw.first_sentence || '';
  const blurbText = typeof description === 'object' ? (description.value || '') : description;
  const subjects = Array.isArray(raw.subject) ? raw.subject : Array.isArray(raw.subjects) ? raw.subjects : [];
  return {
    id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    author,
    series,
    genre,
    isbn: String(isbn),
    cover,
    blurb: blurbText || subjects.slice(0, 4).join(', ') || 'A fresh addition to your shelf.',
    status: state.currentStatus,
    rating: 0,
    addedAt: Date.now()
  };
}

async function fetchOpenLibraryBooks(query, limit = 8) {
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`);
  const result = await response.json();
  if (!result.docs || !result.docs.length) return [];

  return result.docs
    .map(raw => mapOpenLibraryResult({
      title: raw.title,
      author_name: raw.author_name,
      isbn: raw.isbn && raw.isbn[0],
      first_publish_year: raw.first_publish_year,
      subject: raw.subject,
      subjects: raw.subjects,
      subject_facet: raw.subject_facet,
      subject_people: raw.subject_people,
      subject_places: raw.subject_places,
      subject_times: raw.subject_times,
      genre: raw.genre,
      genre_facet: raw.genre_facet,
      cover_i: raw.cover_i,
      subtitle: raw.subtitle,
      series: raw.series,
      series_title: raw.series_title,
      work_title: raw.work_title,
      description: raw.description,
      first_sentence: raw.first_sentence
    }))
    .filter(book => book.title !== 'Untitled' || book.author !== 'Unknown author');
}

function showPreview(book) {
  state.previewBook = book;
  state.currentStatus = book.status || 'own';
  $('previewPanel').style.display = 'block';
  $('previewDetail').innerHTML = `
    <div class="cover-wrap">${book.cover ? `<img src="${book.cover}" alt="${book.title} cover">` : `<div class="cover-fallback"><div class="t">${book.title}</div><div class="a">${book.author}</div></div>`}</div>
    <div class="detail-info">
      <h3>${book.title}</h3>
      <div class="author">${book.author}</div>
      ${book.series ? `<div class="series-line">Series: ${escapeHtml(book.series)}</div>` : ''}
      ${book.genre ? `<div class="series-line">Genre: ${escapeHtml(book.genre)}</div>` : ''}
      <div class="blurb">${book.blurb}</div>
    </div>
  `;
  updateStatusChips();
}

function updateStatusChips() {
  document.querySelectorAll('#statusChips .chip').forEach(button => {
    const status = button.dataset.s;
    button.classList.toggle('on', status === state.currentStatus);
  });
}

function pickStatus(status) {
  state.currentStatus = status;
  if (state.previewBook) {
    state.previewBook.status = status;
  }
  updateStatusChips();
}

function showSearchResults(books, query) {
  state.searchResults = books;
  state.previewBook = null;
  $('previewPanel').style.display = 'block';
  $('previewDetail').innerHTML = '';

  const heading = document.createElement('div');
  heading.innerHTML = `
    <h3>Choose a match</h3>
    <div class="sub" style="margin: 4px 0 12px;">Showing ${books.length} result${books.length === 1 ? '' : 's'} for “${escapeHtml(query)}”.</div>
  `;
  $('previewDetail').appendChild(heading);

  const list = document.createElement('div');
  list.className = 'picker-list';
  books.forEach(book => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'picker-item';
    item.innerHTML = `
      <div class="cover-wrap">${book.cover ? `<img src="${book.cover}" alt="${escapeHtml(book.title)} cover">` : `<div class="cover-fallback"><div class="t">${escapeHtml(book.title)}</div></div>`}</div>
      <div>
        <div class="pt">${escapeHtml(book.title)}</div>
        <div class="pa">${escapeHtml(book.author)}</div>
      </div>
    `;
    item.addEventListener('click', () => showPreview(book));
    list.appendChild(item);
  });
  $('previewDetail').appendChild(list);
}

function addPreviewToLibrary() {
  if (!state.previewBook || !state.user) {
    showToast('No book is ready to add.');
    return;
  }

  state.previewBook.status = state.currentStatus;
  addBookToLibrary(state.previewBook, { showToast: true });
}

function clearPreview() {
  state.previewBook = null;
  state.searchResults = [];
  $('previewPanel').style.display = 'none';
  $('previewDetail').innerHTML = '';
  setStatus('lookupStatus', '', '');
}

function setStatus(id, text, stateClass = '') {
  const status = $(id);
  if (!status) return;
  status.className = `status ${stateClass}`.trim();
  status.textContent = text;
}

async function toggleScanner() {
  if (state.scanMode) {
    stopScanner();
    return;
  }
  startScanner();
}

function stopScanner() {
  if (!state.scanMode) return;
  state.scanMode = false;
  $('scanBtn').textContent = '📷 Start scanning';
  $('scanHint').textContent = '';
  if (!state.scanner) return;
  state.scanner.stop().then(() => state.scanner.clear()).catch(() => {}).finally(() => {
    state.scanner = null;
  });
}

function startScanner() {
  const reader = $('reader');
  reader.innerHTML = '';
  const html5QrCode = new Html5Qrcode('reader');

  const config = { fps: 10, qrbox: 250 };
  state.scanMode = true;
  state.scanner = html5QrCode;
  $('scanBtn').textContent = '⏹ Stop scanning';
  $('scanHint').textContent = 'Point your camera at a book barcode.';
  setStatus('lookupStatus', '', '');

  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || !cameras.length) {
      setStatus('lookupStatus', 'No camera found.', 'err');
      stopScanner();
      return;
    }
    const rearCamera = cameras.find(cam => /back|rear|environment/i.test(cam.label || '')) || cameras[0];
    const cameraId = rearCamera.id;
    html5QrCode.start(
      { deviceId: { exact: cameraId } },
      config,
      decodedText => {
        stopScanner();
        lookupISBN(decodedText);
      },
      () => {}
    ).catch(() => {
      setStatus('lookupStatus', 'Camera access blocked or unavailable.', 'err');
      stopScanner();
    });
  }).catch(() => {
    setStatus('lookupStatus', 'Unable to access camera.', 'err');
    stopScanner();
  });
}

function buildRecommendationBook(rec) {
  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: rec.title,
    author: rec.author,
    series: rec.series || '',
    isbn: rec.isbn || '',
    cover: rec.cover || '',
    blurb: rec.blurb || rec.why || 'A thoughtful pick for your shelf.',
    status: 'wishlist',
    rating: 0,
    addedAt: Date.now()
  };
}

function addRecommendationToWishlist(rec) {
  const book = buildRecommendationBook(rec);
  addBookToLibrary(book, { showToast: true });
  closeModal();
}

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function recKey(book) {
  const isbn = normalizeIsbnKey(book.isbn);
  if (isbn && (isbn.length === 10 || isbn.length === 13)) return `isbn:${isbn}`;
  return `${String(book.title || '').trim().toLowerCase()}|${String(book.author || '').trim().toLowerCase()}`;
}

function dismissRecommendation(rec, recList) {
  const key = recKey(rec);
  if (!state.shownRecKeys) state.shownRecKeys = new Set();
  state.shownRecKeys.add(key); // remember it so refresh brings something new
  const card = Array.from(recList.children).find(child => child.dataset.recKey === key);
  if (card) card.remove();
  const remaining = Array.from(recList.children).filter(child => child.dataset.recKey);
  if (!remaining.length) {
    getRecommendations();
  }
}

function getFallbackRecommendations(sourceBooks) {
  const fallbackMap = [
    {
      matches: ['rowling', 'potter', 'harry', 'wizard'],
      recs: [
        { title: 'The Hobbit', author: 'J.R.R. Tolkien', why: 'A classic fantasy adventure with a warm, mythic feel.', blurb: 'A timeless fantasy adventure about courage, friendship, and a treasure-filled quest.' },
        { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', why: 'A thoughtful fantasy with deep world-building and personal growth.', blurb: 'A beautifully written fantasy about power, identity, and the cost of magic.' }
      ]
    },
    {
      matches: ['tolkien', 'hobbit', 'lotr', 'middle-earth'],
      recs: [
        { title: 'The Name of the Wind', author: 'Patrick Rothfuss', why: 'A lyrical fantasy with memorable characters and rich atmosphere.', blurb: 'An immersive fantasy tale about music, legend, and the hidden life of a gifted young man.' },
        { title: 'Mistborn', author: 'Brandon Sanderson', why: 'A gripping fantasy with inventive magic and quick momentum.', blurb: 'A fast-paced fantasy epic built around a unique magic system and rebellion.' }
      ]
    },
    {
      matches: ['herbert', 'dune', 'science', 'sci-fi', 'future'],
      recs: [
        { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', why: 'A thoughtful science-fiction classic with emotional depth.', blurb: 'A landmark sci-fi novel about politics, identity, and the search for understanding.' },
        { title: 'The Expanse: Leviathan Wakes', author: 'James S. A. Corey', why: 'A modern space-opera adventure with strong character drama.', blurb: 'An exciting space opera that blends mystery, politics, and survival.' }
      ]
    },
    {
      matches: ['morgenstern', 'fantasy', 'magic', 'circus'],
      recs: [
        { title: 'The Bear and the Nightingale', author: 'Katherine Arden', why: 'A lush fantasy with folklore, atmosphere, and wonder.', blurb: 'A spellbinding historical fantasy rooted in Russian folklore and winter magic.' },
        { title: 'Circe', author: 'Madeline Miller', why: 'A lyrical reimagining full of myth, power, and transformation.', blurb: 'A rich mythic novel about a woman who becomes more than the stories told about her.' }
      ]
    },
    {
      matches: ['mccarthy', 'classic', 'literary'],
      recs: [
        { title: 'The Road', author: 'Cormac McCarthy', why: 'A spare, powerful novel with emotional weight and clarity.', blurb: 'A haunting literary novel about survival, tenderness, and the human spirit.' },
        { title: 'Never Let Me Go', author: 'Kazuo Ishiguro', why: 'A quietly devastating literary novel with a strong emotional core.', blurb: 'A beautiful, unsettling story about memory, love, and what it means to be human.' }
      ]
    }
  ];

  const recs = [];
  const seen = new Set();
  sourceBooks.forEach(book => {
    const haystack = `${book.title} ${book.author}`.toLowerCase();
    const match = fallbackMap.find(entry => entry.matches.some(token => haystack.includes(token)));
    if (!match) return;

    match.recs.forEach(rec => {
      const key = `${rec.title}|${rec.author}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      recs.push({ ...rec, cover: '', isbn: '', series: '' });
    });
  });

  return recs.slice(0, 6);
}

function openRecommendationModal(rec) {
  const book = buildRecommendationBook(rec);
  const modal = $('modalContent');
  modal.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <div class="detail">
      <div class="cover-wrap">${book.cover ? `<img src="${book.cover}" alt="${escapeHtml(book.title)} cover">` : `<div class="cover-fallback"><div class="t">${escapeHtml(book.title)}</div><div class="a">${escapeHtml(book.author)}</div></div>`}</div>
      <div class="detail-info">
        <h3>${escapeHtml(book.title)}</h3>
        <div class="author">${escapeHtml(book.author)}</div>
        <div class="blurb">${escapeHtml(book.blurb || 'No description available.')}</div>
        <div class="row" style="margin-top:16px">
          <button class="btn js-add-wishlist">Add to wishlist</button>
          <a class="btn ghost" href="${buildAmazonUrl(book)}" target="_blank" rel="noreferrer">View on Amazon</a>
        </div>
      </div>
    </div>
  `;
  modal.querySelector('.js-add-wishlist').addEventListener('click', () => addRecommendationToWishlist(rec));
  $('modalBg').classList.add('open');
}

function renderRecommendationsSummary(recommendations = state.recommendations) {
  const container = $('recSummaryContent');
  if (!container || !state.user) {
    if (container) container.innerHTML = '';
    return;
  }

  const books = state.user.books || [];
  const total = books.length;
  const owned = books.filter(book => book.status === 'own').length;
  const borrowed = books.filter(book => book.status === 'borrow').length;
  const wishlist = books.filter(book => book.status === 'wishlist').length;
  const favorites = getFavoriteBooks();
  const rated = favorites.length;
  const topRated = favorites.slice(0, 4);

  const recMarkup = recommendations.length
    ? recommendations.map(rec => `<div class="summary-pill">${escapeHtml(rec.title)} — ${escapeHtml(rec.author)}</div>`).join('')
    : '<div class="summary-sub">Tap “Get recommendations” to fill this section.</div>';

  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Books in your library</div>
        <div class="summary-value">${total}</div>
        <div class="summary-sub">${owned} owned • ${borrowed} borrowed • ${wishlist} wishlist</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Your favorites</div>
        <div class="summary-value">${rated}</div>
        <div class="summary-sub">${topRated.length ? topRated.map(book => escapeHtml(book.title)).join(', ') : 'Add books to your Top 5 or rate them 4.5+ to power recommendations.'}</div>
      </div>
      <div class="summary-card wide">
        <div class="summary-label">Currently recommended</div>
        <div class="summary-sub">${recMarkup}</div>
      </div>
    </div>
  `;
}

function renderRecControls() {
  const recList = $('recList');
  const bar = document.createElement('div');
  bar.className = 'row';
  bar.style.margin = '0 0 16px';
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'btn';
  refresh.innerHTML = '↻ New recommendations';
  refresh.addEventListener('click', () => getRecommendations());
  bar.appendChild(refresh);
  recList.appendChild(bar);
}

function getFavoriteBooks() {
  if (!state.user) return [];
  const favIds = new Set((state.user.top5 || []).filter(Boolean));
  return state.user.books.filter(book =>
    favIds.has(book.id) || (Number(book.rating) >= 4.5 && book.status !== 'wishlist')
  );
}

// Fetch a page of books for a genre from Open Library's subject API.
// A random offset each call keeps results fresh between refreshes.
async function fetchSubjectBooks(genre, limit = 20) {
  const slug = String(genre).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const offset = Math.floor(Math.random() * 80);
  const response = await fetch(`https://openlibrary.org/subjects/${slug}.json?limit=${limit}&offset=${offset}`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.works || []).map(work => ({
    title: work.title || 'Untitled',
    author: (work.authors && work.authors[0] && work.authors[0].name) || 'Unknown author',
    cover: work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg` : '',
    isbn: '',
    series: '',
    blurb: (work.subject || []).slice(0, 4).join(', ') || '',
    genre
  })).filter(book => book.title !== 'Untitled');
}

async function getRecommendations() {
  if (!state.user) return;
  const recList = $('recList');
  recList.innerHTML = '';
  state.recommendations = [];
  if (!state.shownRecKeys) state.shownRecKeys = new Set();
  if (typeof state.recSpin !== 'number') state.recSpin = 0;

  // Recommendations come only from your favorites: Top 5 picks + books rated 4.5–5.
  const favorites = getFavoriteBooks();

  if (!favorites.length) {
    $('recStatus').textContent = 'Pick a Top 5 on your profile, or rate a book 4.5 stars or higher, and I\u2019ll build recommendations from those favorites.';
    return;
  }

  // Rotate through your favorite genres: each refresh without adding a book
  // moves to the next genre so repeat refreshes explore something different.
  let genres = [...new Set(favorites.map(book => book.genre).filter(Boolean))];
  if (!genres.length) genres = ['Fiction'];
  const focusGenre = genres[state.recSpin % genres.length];
  state.recSpin += 1;

  $('recStatus').innerHTML = `<span class="spinner"></span>Finding fresh ${escapeHtml(focusGenre)} picks from your favorites…`;

  // Anchor books for this genre (fall back to all favorites if genres are sparse).
  const anchors = favorites.filter(book => book.genre === focusGenre);
  const sourceBooks = anchors.length ? anchors : favorites;

  const recommendations = [];
  const seen = new Set();

  const pushRec = (match, why) => {
    const key = recKey(match);
    if (seen.has(key)) return false;
    if (state.shownRecKeys.has(key)) return false; // already shown on a previous refresh
    if (state.user.books.some(book => isSameBook(book, match))) return false; // already on your shelf
    seen.add(key);
    recommendations.push({
      title: match.title,
      author: match.author,
      why,
      blurb: match.blurb || 'A strong match for your taste.',
      cover: match.cover || '',
      isbn: match.isbn || '',
      series: match.series || ''
    });
    return true;
  };

  try {
    // 1) Dynamic genre picks (random page of the subject each time).
    const subjectBooks = await fetchSubjectBooks(focusGenre, 24).catch(() => []);
    for (const match of shuffle(subjectBooks)) {
      if (recommendations.length >= 4) break;
      pushRec(match, `Because your favorites lean ${focusGenre}.`);
    }

    // 2) Author and series picks anchored to the favorites in this genre.
    const queries = [];
    sourceBooks.forEach(book => {
      if (book.author && book.author !== 'Unknown author') {
        queries.push({ q: `author:"${book.author}"`, why: `Because “${book.title}” by ${book.author} is one of your favorites.` });
      }
      if (book.series) {
        queries.push({ q: book.series, why: `Because it\u2019s close to the ${book.series} series you love.` });
      }
    });

    for (const query of shuffle(queries)) {
      if (recommendations.length >= 6) break;
      const matches = await fetchOpenLibraryBooks(query.q, 12);
      for (const match of shuffle(matches)) {
        if (recommendations.length >= 6) break;
        pushRec(match, query.why);
      }
    }

    // If refreshing exhausted everything, reset memory and try once more for a fresh batch.
    if (!recommendations.length && state.shownRecKeys.size) {
      state.shownRecKeys.clear();
      return getRecommendations();
    }

    if (!recommendations.length) {
      const fallback = getFallbackRecommendations(sourceBooks)
        .filter(rec => !state.shownRecKeys.has(recKey(rec)) && !state.user.books.some(book => isSameBook(book, rec)));
      if (!fallback.length) {
        $('recStatus').textContent = 'No new suggestions right now — try rating a few more books.';
        renderRecControls();
        return;
      }
      recommendations.push(...fallback);
    }

    recommendations.forEach(rec => state.shownRecKeys.add(recKey(rec)));
    state.recommendations = recommendations;
    renderRecommendationsSummary(recommendations);
    $('recStatus').textContent = `This batch leans ${focusGenre}. Refresh again to explore another of your favorite genres.`;
    renderRecControls();
    recommendations.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'rec-card';
      card.dataset.recKey = recKey(rec);
      card.innerHTML = `
        <button class="rec-dismiss" type="button" aria-label="Dismiss recommendation">×</button>
        <div class="cover-wrap">${rec.cover ? `<img src="${rec.cover}" alt="${escapeHtml(rec.title)} cover">` : `<div class="cover-fallback"><div class="t">${escapeHtml(rec.title)}</div><div class="a">${escapeHtml(rec.author)}</div></div>`}</div>
        <div class="rec-body">
          <h4>${escapeHtml(rec.title)}</h4>
          <div class="rec-author">${escapeHtml(rec.author)}</div>
          <div class="rec-why">${escapeHtml(rec.why)}</div>
          <div class="rec-add">
            <button class="btn ghost small js-view">View</button>
            <button class="btn small js-wishlist">Add to wishlist</button>
          </div>
        </div>
      `;
      card.querySelector('.rec-dismiss').addEventListener('click', () => dismissRecommendation(rec, recList));
      card.querySelector('.js-view').addEventListener('click', () => openRecommendationModal(rec));
      card.querySelector('.js-wishlist').addEventListener('click', () => addRecommendationToWishlist(rec));
      recList.appendChild(card);
    });
  } catch (error) {
    state.recommendations = [];
    renderRecommendationsSummary([]);
    $('recStatus').textContent = 'Unable to load recommendations right now.';
  }
}

function copyFriendLink() {
  if (!state.user) return;
  const base = window.location.href.split('?')[0];
  const url = `${base}?friend=${encodeURIComponent(state.user.email)}`;
  navigator.clipboard.writeText(url).then(() => {
    setStatus('friendLinkStatus', 'Friend link copied.', 'ok');
  }).catch(() => {
    setStatus('friendLinkStatus', 'Unable to copy link.', 'err');
  });
}

function renderShareText() {
  if (!state.user) return '';
  const lines = [`${state.user.name}'s shelf:`];
  state.user.books.slice(0, 10).forEach((book, index) => {
    lines.push(`${index + 1}. ${book.title} by ${book.author} (${book.status})`);
  });
  const text = lines.join('\n');
  const card = $('shareCard');
  const textEl = $('shareText');
  if (card) card.innerHTML = `<h3>Share text</h3><div class="sc-sub">A quick snapshot of your shelf.</div>`;
  if (textEl) textEl.textContent = text;
  return text;
}

function copyShare() {
  if (!state.user) return;
  const text = renderShareText();
  navigator.clipboard.writeText(text).then(() => {
    setStatus('copyStatus', 'Copied to clipboard.', 'ok');
  }).catch(() => {
    setStatus('copyStatus', 'Unable to copy.', 'err');
  });
}

function setDark(isDark) {
  if (!state.user) return;
  state.user.dark = !!isDark;
  saveCurrentUser();
  if (state.user.dark) {
    document.documentElement.dataset.theme = 'dark';
    document.body.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
    delete document.body.dataset.theme;
  }
  $('darkToggle').checked = state.user.dark;
}

function renderThemeGrid() {
  const grid = $('themeGrid');
  grid.innerHTML = '';
  const currentId = resolveThemeId(state.user.theme);

  THEMES.forEach(theme => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = theme.magic ? 'theme-card magic' : 'theme-card';
    if (currentId === theme.id) card.classList.add('on');

    if (theme.magic) {
      card.innerHTML = `
        <div class="magic-preview"></div>
        <div class="tinfo">
          <span class="tname">${theme.name} ${theme.emblem}</span>
          <div class="tdesc">${theme.desc}</div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <span class="dots">
          <span class="dot" style="background:${theme.colors.accent}"></span>
          <span class="dot" style="background:${theme.colors.accentDeep}"></span>
          <span class="dot" style="background:${theme.colors.accent2}"></span>
        </span>
        <span class="tname">${theme.name}</span>
      `;
    }

    card.addEventListener('click', () => {
      state.user.theme = theme.id;
      saveCurrentUser();
      applyTheme(theme.id);
      renderThemeGrid();
    });
    grid.appendChild(card);
  });
}

function applyTheme(themeId) {
  const resolved = resolveThemeId(themeId);
  const theme = THEMES.find(item => item.id === resolved) || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--accent-deep', theme.colors.accentDeep);
  root.style.setProperty('--accent-2', theme.colors.accent2);

  if (theme.magic) {
    root.dataset.magic = 'on';
    document.body.dataset.magic = 'on';
  } else {
    delete root.dataset.magic;
    delete document.body.dataset.magic;
  }
  $('themeEmblem').textContent = theme.emblem || '';
}

function renderProfile() {
  if (!state.user) return;
  const picker = $('avatarPicker');
  picker.innerHTML = '';

  AVATARS.forEach(option => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'avatar-opt';
    if (state.user.avatar === option.name) item.classList.add('on');
    item.innerHTML = `
      <div class="avatar-face" style="background:${option.bg}">${option.emoji}</div>
      <div class="character-name">${option.name}</div>
    `;
    item.addEventListener('click', () => {
      state.user.avatar = option.name;
      saveCurrentUser();
      updateUserHeader();
      renderProfile();
    });
    picker.appendChild(item);
  });

  const selected = getAvatarOption(state.user.avatar);
  $('avatarHint').textContent = selected ? `Avatar: ${selected.name}` : 'Pick an avatar above.';
  renderTopFive();
  renderFriendSummary();
  renderShareText();
}

function renderTopFive() {
  const row = $('top5Row');
  row.innerHTML = '';
  state.user.top5.forEach((bookId, index) => {
    const slot = document.createElement('div');
    slot.className = 'top5-slot';
    const book = state.user.books.find(b => b.id === bookId);
    slot.innerHTML = `
      <div class="slot-num">#${index + 1}</div>
      <button class="book-card" type="button" onclick="chooseTopFive(${index})">
        <div class="cover-wrap ${book ? '' : 'empty-slot'}">
          ${book ? (book.cover ? `<img src="${book.cover}" alt="${book.title} cover">` : `<div class="cover-fallback"><div class="t">${book.title}</div><div class="a">${book.author}</div></div>`) : '＋'}
        </div>
      </button>
      <span class="slot-title">${book ? book.title : 'Empty slot'}</span>
    `;
    row.appendChild(slot);
  });
}

function chooseTopFive(index) {
  const picker = document.createElement('div');
  picker.className = 'picker-list';
  state.user.books.forEach(book => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'picker-item';
    item.innerHTML = `
      <div class="cover-wrap">${book.cover ? `<img src="${book.cover}" alt="${book.title} cover">` : `<div class="cover-fallback"><div class="t">${book.title}</div></div>`}</div>
      <div>
        <div class="pt">${book.title}</div>
        <div class="pa">${book.author}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      state.user.top5[index] = book.id;
      saveCurrentUser();
      renderTopFive();
      closeModal();
    });
    picker.appendChild(item);
  });

  if (!state.user.books.length) {
    picker.textContent = 'Add books to your shelf to fill your top 5.';
  }

  $('modalContent').innerHTML = `<button class="modal-close" onclick="closeModal()">×</button><h3 class="mh">Choose top ${index + 1}</h3>`;
  $('modalContent').appendChild(picker);
  $('modalBg').classList.add('open');
}

function renderFriendSummary() {
  const list = $('friendsList');
  list.innerHTML = '';
  if (!state.user.friends.length) {
    list.innerHTML = '<div class="empty">No shared friends yet.</div>';
    return;
  }
  state.user.friends.forEach(email => {
    const friend = loadUsers()[email];
    if (!friend) return;
    const row = document.createElement('div');
    row.className = 'friend-row';
    row.innerHTML = `<div><div class="fname">${friend.name}</div><div class="fmeta">${friend.email}</div></div><div class="fx">View</div>`;
    list.appendChild(row);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadProfiles();
  const current = getCurrentUser();
  if (current) {
    state.user = current;
    showApp();
    backfillMissingCovers();
  }
});

// Books saved before covers were fixed (mostly barcode scans) have no cover URL.
// Quietly look them up one at a time so the shelf fills in on its own.
function backfillMissingCovers() {
  if (!state.user) return;
  const missing = state.user.books.filter(book => !book.cover);
  missing.forEach((book, index) => {
    setTimeout(() => enrichBookOnline(book.id), index * 800);
  });
}

window.updateBookStatus = updateBookStatus;
window.setBookRating = setBookRating;
window.renderRelatedResults = renderRelatedResults;
window.chooseTopFive = chooseTopFive;
window.closeModal = closeModal;
window.signIn = signIn;
window.signOut = signOut;
window.showView = showView;
window.lookupManual = lookupManual;
window.pickStatus = pickStatus;
window.addPreviewToLibrary = addPreviewToLibrary;
window.clearPreview = clearPreview;
window.toggleScanner = toggleScanner;
window.getRecommendations = getRecommendations;
window.copyFriendLink = copyFriendLink;
window.copyShare = copyShare;
window.setDark = setDark;
// Also referenced by inline onclick handlers — these were missing, which broke
// opening a book, removing a book, and dismissing recommendations.
window.openBookModal = openBookModal;
window.removeBook = removeBook;
window.dismissRecommendation = dismissRecommendation;
window.openRecommendationModal = openRecommendationModal;
window.addRecommendationToWishlist = addRecommendationToWishlist;
