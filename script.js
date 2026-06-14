// Хранилище пользователей
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

// Онлайн
function updateOnline() {
  const user = getCurrentUser();
  if (user) {
    let users = getUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      users[idx].lastActive = Date.now();
      saveUsers(users);
    }
  }
}
function getOnlineCount() {
  const users = getUsers();
  const now = Date.now();
  return users.filter(u => u.lastActive && (now - u.lastActive < 5 * 60 * 1000)).length;
}

// Логика login.html
if (document.getElementById('registerForm') && document.getElementById('loginForm')) {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const regError = document.getElementById('regError');
  const loginError = document.getElementById('loginError');

  // Переключение
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

  // Регистрация
  registerForm.addEventListener('submit', e => {
    e.preventDefault();

    const nick = document.getElementById('regNick')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const pass = document.getElementById('regPass')?.value;
    const role = document.getElementById('regRole')?.value;

    if (!nick || !email || !pass || !role) {
      regError.textContent = 'Заполни все поля!';
      return;
    }

    if (pass.length < 6) {
      regError.textContent = 'Пароль минимум 6 символов';
      return;
    }

    let users = getUsers();

    if (users.some(u => u.email === email)) {
      regError.textContent = 'Email занят!';
      return;
    }

    if (users.some(u => u.nick.toLowerCase() === nick.toLowerCase())) {
      regError.textContent = 'Ник занят!';
      return;
    }

    const newUser = {
      nick,
      email,
      pass,
      role,
      created: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    window.location.href = 'index.html';
  });

  // ВХОД — перекидывает на index.html
  loginForm.addEventListener('submit', e => {
    e.preventDefault(); // ← это ключевое, без него форма перезагружает страницу

    const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
    const pass = document.getElementById('loginPass')?.value;

    const users = getUsers();
    const user = users.find(u => u.email === email && u.pass === pass);

    if (!user) {
      loginError.textContent = 'Неверный email или пароль!';
      return;
    }

    setCurrentUser(user);
    window.location.href = 'index.html'; // ← перекидывает сюда
  });
}

// Защита всех страниц кроме login
if (!document.getElementById('registerForm') && !getCurrentUser()) {
  window.location.href = 'login.html';
}

// Выход
document.querySelectorAll('#logout').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = 'login.html';
  });
});

// Приветствие на главной
if (document.getElementById('welcomeUser')) {
  const user = getCurrentUser();
  if (user) {
    let roleText = user.role === 'kun' ? 'кун ♂' : user.role === 'tyan' ? 'тян ♀' : 'отаку ❓';
    document.getElementById('welcomeUser').innerHTML = `Привет, ${user.nick}! 💜<br><small>Ты ${roleText}</small>`;
  } else {
    document.getElementById('welcomeUser').innerHTML = `Привет, странник! <a href="login.html">Войти</a>`;
  }
}

// Посты
function createPost() {
  const text = document.getElementById('postText')?.value.trim();
  if (!text) return alert('Напиши хоть что-то!');

  const current = getCurrentUser();
  if (!current) return alert('Залогинься сначала!');

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

  feed.innerHTML = '';

  const posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const current = getCurrentUser();

  posts.forEach(post => {
    const isLiked = current && post.likes.includes(current.nick || current.email);

    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.innerHTML = `
      <div class="post-header">
        <img src="${post.avatar}" alt="" class="post-avatar">
        <div>
          <span class="post-author">${post.author}</span>
          <div class="post-time">${new Date(post.time).toLocaleString('ru', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</div>
        </div>
      </div>
      <div class="post-content">${post.text.replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
        <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
          ❤️ ${post.likes.length}
        </button>
        <span class="comment-count">💬 ${post.comments.length}</span>
      </div>

      <div class="comments" id="comments-${post.id}">
        ${post.comments.map(c => `
          <div class="comment">
            <div class="comment-header">
              <span class="comment-author">${c.author}:</span>
              <small class="comment-time">${new Date(c.time).toLocaleTimeString('ru')}</small>
            </div>
            <p>${c.text}</p>
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

function toggleLike(postId) {
  const current = getCurrentUser();
  if (!current) return alert('Залогинься!');

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
  const text = input.value.trim();
  if (!text) return;

  const current = getCurrentUser();
  if (!current) return alert('Залогинься!');

  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  post.comments.push({
    author: current.nick,
    text,
    time: Date.now()
  });

  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  input.value = '';
  renderFeed();
}

// Голосовые комментарии
let recorder = null;
let chunks = [];

function toggleVoice(postId) {
  const btn = document.getElementById(`voiceBtn-${postId}`);
  if (!btn) return;

  if (!recorder || recorder.state === 'inactive') {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        recorder = new MediaRecorder(stream);
        chunks = [];

        recorder.ondataavailable = e => chunks.push(e.data);

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            addVoiceComment(postId, reader.result);
          };
          btn.classList.remove('recording');
          btn.textContent = '🎤';
        };

        recorder.start();
        btn.classList.add('recording');
        btn.textContent = '■';
      })
      .catch(err => alert('Микрофон недоступен: ' + err.message));
  } else {
    recorder.stop();
  }
}

function addVoiceComment(postId, base64) {
  const current = getCurrentUser();
  if (!current) return alert('Залогинься!');

  let posts = JSON.parse(localStorage.getItem('waifuPosts')) || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  post.comments.push({
    author: current.nick,
    voice: base64,
    time: Date.now()
  });

  localStorage.setItem('waifuPosts', JSON.stringify(posts));
  renderFeed();
}

// Инициализация ленты
if (document.getElementById('feed')) {
  renderFeed();
  setInterval(updateOnline, 30000);
}

// Админка (admin.html)
if (window.location.pathname.includes('admin.html')) {
  const countEl = document.getElementById('onlineCount');
  if (countEl) {
    countEl.textContent = getOnlineCount();
    setInterval(() => {
      countEl.textContent = getOnlineCount();
    }, 5000);
  }
}