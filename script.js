// =====================
// ХРАНИЛИЩЕ
// =====================
function getUsers() {
  return JSON.parse(localStorage.getItem('waifuUsers')) || [];
}
function saveUsers(users) {
  localStorage.setItem('waifuUsers', JSON.stringify(users));
}
function setCurrentUser(user) {
  localStorage.setItem('currentWaifuUser', JSON.stringify(user));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentWaifuUser'));
}
function clearCurrentUser() {
  localStorage.removeItem('currentWaifuUser');
}

// =====================
// ОНЛАЙН
// =====================
function updateOnline() {
  const user = getCurrentUser();
  if (!user) return;
  let users = getUsers();
  const idx = users.findIndex(u => u.email === user.email);
  if (idx !== -1) {
    users[idx].lastActive = Date.now();
    saveUsers(users);
  }
}
function getOnlineCount() {
  const now = Date.now();
  return getUsers().filter(u => u.lastActive && (now - u.lastActive < 5 * 60 * 1000)).length;
}

// =====================
// ЗАЩИТА СТРАНИЦ
// Страницы без защиты: login.html, index.html (они содержат registerForm)
// =====================
const onAuthPage = !!document.getElementById('registerForm');

if (!onAuthPage && !getCurrentUser()) {
  window.location.replace('login.html');
}

// =====================
// ВЫХОД — вешаем на #logout и #logoutBtn
// =====================
document.querySelectorAll('#logout, #logoutBtn').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    clearCurrentUser();
    window.location.replace('login.html');
  });
});

// =====================
// СТРАНИЦА ВХОДА / РЕГИСТРАЦИИ
// =====================
if (onAuthPage) {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const regError = document.getElementById('regError');
  const loginError = document.getElementById('loginError');

  document.getElementById('showLogin')?.addEventListener('click', e => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  document.getElementById('showRegister')?.addEventListener('click', e => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });

  registerForm?.addEventListener('submit', e => {
    e.preventDefault();
    const nick = document.getElementById('regNick').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('regRole').value;

    if (!nick || !email || !pass || !role) { regError.textContent = 'Заполни все поля!'; return; }
    if (pass.length < 6) { regError.textContent = 'Пароль минимум 6 символов'; return; }

    let users = getUsers();
    if (users.some(u => u.email === email)) { regError.textContent = 'Email занят!'; return; }
    if (users.some(u => u.nick.toLowerCase() === nick.toLowerCase())) { regError.textContent = 'Ник занят!'; return; }

    const newUser = { nick, email, pass, role, created: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    window.location.replace('home.html');
  });

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const user = getUsers().find(u => u.email === email && u.pass === pass);
    if (!user) { loginError.textContent = 'Неверный email или пароль!'; return; }
    setCurrentUser(user);
    window.location.replace('home.html');
  });
}

// =====================
// ГЛАВНАЯ (home.html) — лента
// =====================
if (document.getElementById('welcomeUser')) {
  const user = getCurrentUser();
  if (user) {
    const roleText = user.role === 'kun' ? 'кун ♂' : user.role === 'tyan' ? 'тян ♀' : 'отаку ❓';
    document.getElementById('welcomeUser').innerHTML = `Привет, ${user.nick}! 💜<br><small>Ты ${roleText}</small>`;
  }
}

function createPost() {
  const text = document.getElementById('postText')?.value.trim();
  if (!text) return alert('Напиши хоть что-то!');
  const current = getCurrentUser();
  if (!current) return;

  const post = {
    id: Date.now(),
    author: current.nick,
    avatar: current.avatar || 'https://via.placeholder.com/48',
    text,
    time: Date.now(),
    likes: [],
    comments: []
  };

  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  posts.unshift(post);
  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  document.getElementById('postText').value = '';
  renderFeed();
}

function renderFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;
  const posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const current = getCurrentUser();
  feed.innerHTML = '';

  posts.forEach(post => {
    const isLiked = current && post.likes.includes(current.nick || current.email);
    const postEl = document.createElement('div');
    postEl.className = 'post';
    const isOwner = current && current.nick === post.author;
    postEl.innerHTML = `
      <div class="post-header">
        <img src="${post.avatar}" alt="" class="post-avatar">
        <div style="flex:1">
          <span class="post-author">${post.author}</span>
          <div class="post-time">${new Date(post.time).toLocaleString('ru', {hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div>
        </div>
        ${isOwner ? `<button class="delete-btn" onclick="deletePost(${post.id})" title="Удалить пост">🗑</button>` : ''}
      </div>
      <div class="post-content">${post.text.replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
        <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">❤️ ${post.likes.length}</button>
        <span class="comment-count">💬 ${post.comments.length}</span>
      </div>
      <div class="comments" id="comments-${post.id}">
        ${post.comments.map((c, i) => `
          <div class="comment">
            <div class="comment-header">
              <span class="comment-author">${c.author}:</span>
              <small class="comment-time">${new Date(c.time).toLocaleTimeString('ru')}</small>
              ${current && current.nick === c.author ? `<button class="delete-comment-btn" onclick="deleteComment(${post.id}, ${i})">🗑</button>` : ''}
            </div>
            <p>${c.text || ''}</p>
            ${c.voice ? `<audio controls src="${c.voice}"></audio>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="comment-form">
        <input type="text" class="comment-input" id="commentInput-${post.id}" placeholder="Напиши комментарий...">
        <button class="voice-btn" id="voiceBtn-${post.id}" onclick="toggleVoice(${post.id})">🎤</button>
        <button class="send-comment-btn" onclick="addComment(${post.id})">Отправить</button>
      </div>
    `;
    feed.appendChild(postEl);
  });
}

function deletePost(postId) {
  if (!confirm('Удалить пост?')) return;
  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  posts = posts.filter(p => p.id !== postId);
  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  renderFeed();
}

function deleteComment(postId, commentIndex) {
  if (!confirm('Удалить комментарий?')) return;
  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.comments.splice(commentIndex, 1);
  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  renderFeed();
}

function toggleLike(postId) {
  const current = getCurrentUser();
  if (!current) return;
  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  const userId = current.nick || current.email;
  if (post.likes.includes(userId)) {
    post.likes = post.likes.filter(id => id !== userId);
  } else {
    post.likes.push(userId);
  }
  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  renderFeed();
}

function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input?.value.trim();
  if (!text) return;
  const current = getCurrentUser();
  if (!current) return;
  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.comments.push({ author: current.nick, text, time: Date.now() });
  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  input.value = '';
  renderFeed();
}

// Голосовые
let recorder = null;
let chunks = [];

function toggleVoice(postId) {
  const btn = document.getElementById(`voiceBtn-${postId}`);
  if (!btn) return;
  if (!recorder || recorder.state === 'inactive') {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      recorder = new MediaRecorder(stream);
      chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => addVoiceComment(postId, reader.result);
        btn.classList.remove('recording');
        btn.textContent = '🎤';
      };
      recorder.start();
      btn.classList.add('recording');
      btn.textContent = '■';
    }).catch(err => alert('Микрофон недоступен: ' + err.message));
  } else {
    recorder.stop();
  }
}

function addVoiceComment(postId, base64) {
  const current = getCurrentUser();
  if (!current) return;
  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.comments.push({ author: current.nick, voice: base64, time: Date.now() });
  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  renderFeed();
}

if (document.getElementById('feed')) {
  renderFeed();
  setInterval(updateOnline, 30000);
}

// =====================
// ПРОФИЛЬ
// =====================
if (document.getElementById('editProfileForm')) {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('editNick').value = user.nick || '';
    document.getElementById('editRole').value = user.role || 'other';
    document.getElementById('editAvatar').value = user.avatar || '';
    document.getElementById('editFavAnime').value = user.favAnime || '';
    document.getElementById('editWaifu').value = user.waifu || '';
    document.getElementById('profileAvatar').src = user.avatar || 'https://via.placeholder.com/140';
    document.getElementById('profileDisplay').innerHTML = `
      <div class="info-item"><div class="info-label">Никнейм</div>${user.nick}</div>
      <div class="info-item"><div class="info-label">Email</div>${user.email}</div>
      <div class="info-item"><div class="info-label">Роль</div>${user.role === 'kun' ? 'Кун ♂' : user.role === 'tyan' ? 'Тян ♀' : 'Другое'}</div>
      ${user.favAnime ? `<div class="info-item"><div class="info-label">Любимые аниме</div>${user.favAnime}</div>` : ''}
      ${user.waifu ? `<div class="info-item"><div class="info-label">Waifu/Husbando</div>${user.waifu}</div>` : ''}
    `;
  }

  document.getElementById('editProfileForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    let users = getUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      users[idx].nick = document.getElementById('editNick').value.trim();
      users[idx].role = document.getElementById('editRole').value;
      users[idx].avatar = document.getElementById('editAvatar').value.trim();
      users[idx].favAnime = document.getElementById('editFavAnime').value.trim();
      users[idx].waifu = document.getElementById('editWaifu').value.trim();
      saveUsers(users);
      setCurrentUser(users[idx]);
    }
    const msg = document.getElementById('profileMessage');
    msg.textContent = 'Сохранено! ✅';
    setTimeout(() => msg.textContent = '', 3000);
  });
}

// =====================
// ПОИСК
// =====================
if (document.getElementById('searchForm')) {
  document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value.trim().toLowerCase();
    const results = getUsers().filter(u => u.nick.toLowerCase().includes(query));
    const container = document.getElementById('searchResults');
    const now = Date.now();

    if (!results.length) {
      container.innerHTML = '<p style="text-align:center;color:#aaa;">Никого не найдено 😢</p>';
      return;
    }

    container.innerHTML = results.map(u => {
      const diff = now - (u.lastActive || 0);
      let status, cls;
      if (diff < 2*60*1000)        { status = '🟢 Онлайн';        cls = 'status-online'; }
      else if (diff < 10*60*1000)  { status = '🟡 Недавно был';   cls = 'status-recent'; }
      else if (diff < 60*60*1000)  { status = '🔵 Отошёл';        cls = 'status-away';   }
      else                          { status = '⚫ Офлайн';        cls = 'status-off';    }

      return `
        <div>
          <div class="user-header">
            <img class="user-avatar" src="${u.avatar || 'https://via.placeholder.com/64'}">
            <div>
              <strong>${u.nick}</strong> — ${u.role === 'kun' ? 'Кун ♂' : u.role === 'tyan' ? 'Тян ♀' : 'Другое'}
              <div class="${cls}">${status}</div>
            </div>
          </div>
          ${u.favAnime ? `<div>🎌 <em>${u.favAnime}</em></div>` : ''}
          ${u.waifu ? `<div>💜 Waifu: <em>${u.waifu}</em></div>` : ''}
          <button class="start-chat-btn" style="margin-top:10px" onclick="location.href='chat.html?with=${encodeURIComponent(u.nick)}'">💬 Написать</button>
        </div>
      `;
    }).join('');
  });
}

// =====================
// ЧАТ
// =====================
if (document.getElementById('userList') !== null) {
  const current = getCurrentUser();
  const chatWithNick = new URLSearchParams(window.location.search).get('with');

  if (chatWithNick) {
    document.getElementById('chatArea').classList.remove('hidden');
    document.getElementById('chatWith').textContent = chatWithNick;
    loadMessages(chatWithNick);

    document.getElementById('sendBtn').addEventListener('click', () => {
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text) return;
      const key = getChatKey(current.nick, chatWithNick);
      let msgs = JSON.parse(localStorage.getItem(key)) || [];
      msgs.push({ from: current.nick, text, time: Date.now() });
      localStorage.setItem(key, JSON.stringify(msgs));
      input.value = '';
      loadMessages(chatWithNick);
    });
  } else {
    const others = getUsers().filter(u => u.email !== current?.email);
    document.getElementById('userList').innerHTML = others.length
      ? others.map(u => `<div style="padding:1rem;background:#1e1e38;margin:0.5rem 0;border-radius:12px;cursor:pointer" onclick="location.href='chat.html?with=${encodeURIComponent(u.nick)}'">${u.nick}</div>`).join('')
      : '<p style="text-align:center;color:#aaa">Пока никого нет 😢</p>';
  }
}

function getChatKey(a, b) {
  return 'chat_' + [a, b].sort().join('_');
}
function loadMessages(withNick) {
  const current = getCurrentUser();
  const msgs = JSON.parse(localStorage.getItem(getChatKey(current.nick, withNick))) || [];
  const win = document.getElementById('chatWindow');
  win.innerHTML = msgs.map(m => `
    <div class="message ${m.from === current.nick ? 'my-msg' : 'other-msg'}">
      <strong>${m.from}:</strong> ${m.text}
    </div>
  `).join('');
  win.scrollTop = win.scrollHeight;
}

// =====================
// АДМИНКА
// =====================
if (window.location.pathname.includes('admin.html')) {
  const countEl = document.getElementById('onlineCount');
  if (countEl) {
    countEl.textContent = getOnlineCount();
    setInterval(() => { countEl.textContent = getOnlineCount(); }, 5000);
  }
}
