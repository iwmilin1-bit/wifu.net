// ============================================================
//  КОНФИГ — замени на свои данные из Supabase
// ============================================================
const SUPABASE_URL = 'https://pokxselyifwsabjztsap.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IhnwSLLXhpDyA7Mz3awNBQ_Oz4BtFAW';

// ============================================================
//  Базовый клиент Supabase (без npm, чистый fetch)
// ============================================================
const db = {
  async query(table, method = 'GET', body = null, filters = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filters}`;
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : ''
      }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return method === 'DELETE' ? null : res.json();
  },

  async select(table, filters = '') {
    return this.query(table, 'GET', null, filters);
  },

  async insert(table, data) {
    return this.query(table, 'POST', data);
  },

  async update(table, data, filters) {
    return this.query(table, 'PATCH', data, filters);
  },

  async delete(table, filters) {
    return this.query(table, 'DELETE', null, filters);
  }
};

// ============================================================
//  Сессия пользователя (остаётся в localStorage — это ок)
// ============================================================
function setCurrentUser(user) {
  localStorage.setItem('currentWaifuUser', JSON.stringify(user));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentWaifuUser'));
}
function clearCurrentUser() {
  localStorage.removeItem('currentWaifuUser');
}

// ============================================================
//  Онлайн-статус
// ============================================================
async function updateOnline() {
  const user = getCurrentUser();
  if (!user) return;
  try {
    await db.update('users', { last_active: new Date().toISOString() }, `?email=eq.${encodeURIComponent(user.email)}`);
  } catch (e) { /* тихо игнорируем */ }
}

async function getOnlineCount() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const users = await db.select('users', `?last_active=gte.${fiveMinAgo}&select=id`);
  return users.length;
}

// ============================================================
//  ЛОГИН / РЕГИСТРАЦИЯ (login.html и index.html)
// ============================================================
const registerForm = document.getElementById('registerForm');
const loginForm    = document.getElementById('loginForm');

if (registerForm && loginForm) {
  const regError   = document.getElementById('regError');
  const loginError = document.getElementById('loginError');

  // Переключение форм
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

  // ── Регистрация ──
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    regError.textContent = '';

    const nick  = document.getElementById('regNick')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const pass  = document.getElementById('regPass')?.value;
    const role  = document.getElementById('regRole')?.value;

    if (!nick || !email || !pass || !role) {
      regError.textContent = 'Заполни все поля!';
      return;
    }
    if (pass.length < 6) {
      regError.textContent = 'Пароль минимум 6 символов';
      return;
    }

    try {
      // Проверяем, занят ли email / ник
      const existing = await db.select('users', `?or=(email.eq.${encodeURIComponent(email)},nick.ilike.${encodeURIComponent(nick)})`);
      if (existing.length > 0) {
        const taken = existing[0].email === email ? 'Email занят!' : 'Ник занят!';
        regError.textContent = taken;
        return;
      }

      const [newUser] = await db.insert('users', {
        nick,
        email,
        pass,   // ⚠️ В продакшне используй Supabase Auth + bcrypt!
        role,
        avatar: '',
        fav_anime: '',
        waifu: '',
        created_at: new Date().toISOString()
      });

      setCurrentUser(newUser);
      window.location.href = 'index.html';

    } catch (err) {
      regError.textContent = 'Ошибка: ' + err.message;
    }
  });

  // ── Вход ──
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
    const pass  = document.getElementById('loginPass')?.value;

    try {
      const users = await db.select('users', `?email=eq.${encodeURIComponent(email)}&pass=eq.${encodeURIComponent(pass)}`);

      if (!users || users.length === 0) {
        loginError.textContent = 'Неверный email или пароль!';
        return;
      }

      setCurrentUser(users[0]);
      window.location.href = 'index.html';

    } catch (err) {
      loginError.textContent = 'Ошибка подключения: ' + err.message;
    }
  });
}

// ============================================================
//  Защита страниц (кроме login.html / index.html с формами)
// ============================================================
const hasAuthForms = !!document.getElementById('registerForm');
if (!hasAuthForms && !getCurrentUser()) {
  window.location.href = 'login.html';
}

// ============================================================
//  Выход
// ============================================================
document.querySelectorAll('#logout').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = 'login.html';
  });
});

// ============================================================
//  Приветствие на главной
// ============================================================
const welcomeEl = document.getElementById('welcomeUser');
if (welcomeEl) {
  const user = getCurrentUser();
  if (user) {
    const roleText = user.role === 'kun' ? 'кун ♂' : user.role === 'tyan' ? 'тян ♀' : 'отаку ❓';
    welcomeEl.innerHTML = `Привет, ${user.nick}! 💜<br><small>Ты ${roleText}</small>`;
  }
}

// ============================================================
//  ПОСТЫ
// ============================================================
async function createPost() {
  const text    = document.getElementById('postText')?.value.trim();
  const current = getCurrentUser();
  if (!text)    return alert('Напиши хоть что-то!');
  if (!current) return alert('Залогинься сначала!');

  try {
    await db.insert('posts', {
      author_nick: current.nick,
      avatar: current.avatar || 'https://via.placeholder.com/48',
      text,
      created_at: new Date().toISOString()
    });
    document.getElementById('postText').value = '';
    renderFeed();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

async function renderFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;

  feed.innerHTML = '<p style="text-align:center;color:#aaa">Загрузка...</p>';

  try {
    const posts    = await db.select('posts', '?order=created_at.desc&limit=50');
    const likes    = await db.select('likes', '');
    const comments = await db.select('comments', '?order=created_at.asc');
    const current  = getCurrentUser();

    feed.innerHTML = '';

    if (!posts.length) {
      feed.innerHTML = '<p style="text-align:center;color:#888">Постов пока нет. Будь первым!</p>';
      return;
    }

    posts.forEach(post => {
      const postLikes    = likes.filter(l => l.post_id === post.id);
      const postComments = comments.filter(c => c.post_id === post.id);
      const isLiked      = current && postLikes.some(l => l.user_nick === current.nick);

      const postEl = document.createElement('div');
      postEl.className = 'post';
      postEl.innerHTML = `
        <div class="post-header">
          <img src="${post.avatar || 'https://via.placeholder.com/48'}" alt="" class="post-avatar">
          <div>
            <span class="post-author">${post.author_nick}</span>
            <div class="post-time">${new Date(post.created_at).toLocaleString('ru', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</div>
          </div>
        </div>
        <div class="post-content">${post.text.replace(/\n/g, '<br>')}</div>
        <div class="post-actions">
          <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
            ❤️ ${postLikes.length}
          </button>
          <span class="comment-count">💬 ${postComments.length}</span>
        </div>
        <div class="comments" id="comments-${post.id}">
          ${postComments.map(c => `
            <div class="comment">
              <div class="comment-header">
                <span class="comment-author">${c.author_nick}:</span>
                <small class="comment-time">${new Date(c.created_at).toLocaleTimeString('ru')}</small>
              </div>
              <p>${c.text || ''}</p>
              ${c.voice_url ? `<audio controls src="${c.voice_url}" style="width:100%;margin-top:4px"></audio>` : ''}
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

  } catch (err) {
    feed.innerHTML = `<p style="color:#ff5555;text-align:center">Ошибка загрузки: ${err.message}</p>`;
  }
}

async function toggleLike(postId) {
  const current = getCurrentUser();
  if (!current) return alert('Залогинься!');

  try {
    const existing = await db.select('likes', `?post_id=eq.${postId}&user_nick=eq.${encodeURIComponent(current.nick)}`);
    if (existing.length > 0) {
      await db.delete('likes', `?post_id=eq.${postId}&user_nick=eq.${encodeURIComponent(current.nick)}`);
    } else {
      await db.insert('likes', { post_id: postId, user_nick: current.nick });
    }
    renderFeed();
  } catch (err) {
    console.error(err);
  }
}

async function addComment(postId) {
  const input   = document.getElementById(`commentInput-${postId}`);
  const text    = input?.value.trim();
  const current = getCurrentUser();
  if (!text)    return;
  if (!current) return alert('Залогинься!');

  try {
    await db.insert('comments', {
      post_id: postId,
      author_nick: current.nick,
      text,
      created_at: new Date().toISOString()
    });
    input.value = '';
    renderFeed();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

// ── Голосовые комментарии ──
let recorder = null;
let chunks   = [];

function toggleVoice(postId) {
  const btn = document.getElementById(`voiceBtn-${postId}`);
  if (!btn) return;

  if (!recorder || recorder.state === 'inactive') {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        recorder = new MediaRecorder(stream);
        chunks   = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob   = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => addVoiceComment(postId, reader.result);
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

async function addVoiceComment(postId, base64) {
  const current = getCurrentUser();
  if (!current) return alert('Залогинься!');
  try {
    await db.insert('comments', {
      post_id: postId,
      author_nick: current.nick,
      voice_url: base64,
      created_at: new Date().toISOString()
    });
    renderFeed();
  } catch (err) {
    console.error(err);
  }
}

// ── Инициализация ленты ──
if (document.getElementById('feed')) {
  renderFeed();
  setInterval(updateOnline, 30000);
  updateOnline();
}

// ============================================================
//  ПРОФИЛЬ (profile.html)
// ============================================================
const editForm = document.getElementById('editProfileForm');
if (editForm) {
  const current = getCurrentUser();

  // Заполняем форму
  if (current) {
    document.getElementById('editNick').value       = current.nick       || '';
    document.getElementById('editRole').value       = current.role       || 'other';
    document.getElementById('editAvatar').value     = current.avatar     || '';
    document.getElementById('editFavAnime').value   = current.fav_anime  || '';
    document.getElementById('editWaifu').value      = current.waifu      || '';

    const avatar = document.getElementById('profileAvatar');
    if (avatar) avatar.src = current.avatar || 'https://via.placeholder.com/140';

    const display = document.getElementById('profileDisplay');
    if (display) {
      display.innerHTML = `
        <div class="info-item"><div class="info-label">Никнейм</div>${current.nick}</div>
        <div class="info-item"><div class="info-label">Email</div>${current.email}</div>
        <div class="info-item"><div class="info-label">Роль</div>${current.role}</div>
        ${current.fav_anime ? `<div class="info-item"><div class="info-label">Любимые аниме</div>${current.fav_anime}</div>` : ''}
        ${current.waifu    ? `<div class="info-item"><div class="info-label">Waifu</div>${current.waifu}</div>` : ''}
      `;
    }
  }

  editForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('profileMessage');

    const updated = {
      nick:       document.getElementById('editNick').value.trim(),
      role:       document.getElementById('editRole').value,
      avatar:     document.getElementById('editAvatar').value.trim(),
      fav_anime:  document.getElementById('editFavAnime').value.trim(),
      waifu:      document.getElementById('editWaifu').value.trim()
    };

    try {
      const current = getCurrentUser();
      await db.update('users', updated, `?email=eq.${encodeURIComponent(current.email)}`);
      const newUser = { ...current, ...updated };
      setCurrentUser(newUser);
      msg.textContent = '✅ Сохранено!';
      setTimeout(() => msg.textContent = '', 3000);

      const avatar = document.getElementById('profileAvatar');
      if (avatar && updated.avatar) avatar.src = updated.avatar;

    } catch (err) {
      msg.style.color = '#ff5555';
      msg.textContent = 'Ошибка: ' + err.message;
    }
  });
}

// ============================================================
//  ПОИСК (search.html)
// ============================================================
const searchForm = document.getElementById('searchForm');
if (searchForm) {
  searchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const query   = document.getElementById('searchQuery').value.trim();
    const results = document.getElementById('searchResults');
    if (!query) return;

    results.innerHTML = '<p style="text-align:center;color:#aaa">Ищем...</p>';

    try {
      const users = await db.select('users', `?nick=ilike.*${encodeURIComponent(query)}*&select=nick,role,avatar,fav_anime,waifu,last_active`);

      if (!users.length) {
        results.innerHTML = '<p style="text-align:center;color:#888">Никого не нашли 😢</p>';
        return;
      }

      const now = Date.now();
      results.innerHTML = users.map(u => {
        const lastActive = u.last_active ? new Date(u.last_active).getTime() : 0;
        const diff = now - lastActive;
        let status, statusClass;
        if (diff < 2 * 60 * 1000) {
          status = '● Онлайн'; statusClass = 'status-online';
        } else if (diff < 10 * 60 * 1000) {
          status = '● Недавно'; statusClass = 'status-recent';
        } else if (diff < 60 * 60 * 1000) {
          status = '◉ Отошёл'; statusClass = 'status-away';
        } else {
          status = '○ Офлайн'; statusClass = 'status-off';
        }
        const roleIcon = u.role === 'kun' ? '♂' : u.role === 'tyan' ? '♀' : '❓';
        return `
          <div>
            <div class="user-header">
              <img class="user-avatar" src="${u.avatar || 'https://via.placeholder.com/64'}" alt="">
              <div>
                <strong>${u.nick}</strong> ${roleIcon}
                <div class="${statusClass}">${status}</div>
              </div>
            </div>
            ${u.fav_anime ? `<p>🎌 <em>${u.fav_anime}</em></p>` : ''}
            ${u.waifu     ? `<p>💘 ${u.waifu}</p>` : ''}
            <button class="start-chat-btn" onclick="startChatWith('${u.nick}')">💬 Написать</button>
          </div>
        `;
      }).join('');

    } catch (err) {
      results.innerHTML = `<p style="color:#ff5555">Ошибка: ${err.message}</p>`;
    }
  });
}

function startChatWith(nick) {
  localStorage.setItem('chatTarget', nick);
  window.location.href = 'chat.html';
}

// ============================================================
//  ЧАТ (chat.html)
// ============================================================
const userListEl = document.getElementById('userList');
const chatArea   = document.getElementById('chatArea');

if (userListEl) {
  (async () => {
    try {
      const users   = await db.select('users', `?select=nick,avatar,last_active`);
      const current = getCurrentUser();

      userListEl.innerHTML = users
        .filter(u => u.nick !== current?.nick)
        .map(u => `
          <div style="display:flex;align-items:center;gap:12px;padding:0.8rem;background:#1e1e38;border-radius:12px;margin:0.5rem 0;cursor:pointer"
               onclick="openChat('${u.nick}')">
            <img src="${u.avatar || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">
            <span>${u.nick}</span>
          </div>
        `).join('');

      // Если пришли из поиска — сразу открываем нужный чат
      const chatTarget = localStorage.getItem('chatTarget');
      if (chatTarget) {
        localStorage.removeItem('chatTarget');
        openChat(chatTarget);
      }
    } catch (err) {
      userListEl.innerHTML = `<p style="color:#ff5555">Ошибка: ${err.message}</p>`;
    }
  })();
}

let chatPollInterval = null;

async function openChat(withNick) {
  const current = getCurrentUser();
  if (!current) return;

  document.getElementById('chatWith').textContent = withNick;
  chatArea?.classList.remove('hidden');

  if (chatPollInterval) clearInterval(chatPollInterval);

  const loadMessages = async () => {
    const window_el = document.getElementById('chatWindow');
    if (!window_el) return;

    try {
      const msgs = await db.select('messages',
        `?or=(and(from_nick.eq.${encodeURIComponent(current.nick)},to_nick.eq.${encodeURIComponent(withNick)}),and(from_nick.eq.${encodeURIComponent(withNick)},to_nick.eq.${encodeURIComponent(current.nick)}))&order=created_at.asc`
      );

      window_el.innerHTML = msgs.map(m => `
        <div class="message ${m.from_nick === current.nick ? 'my-msg' : 'other-msg'}">
          <strong>${m.from_nick}:</strong> ${m.text || ''}
          ${m.voice_url ? `<audio controls src="${m.voice_url}" style="display:block;width:100%;margin-top:4px"></audio>` : ''}
        </div>
      `).join('');
      window_el.scrollTop = window_el.scrollHeight;
    } catch (err) {
      console.error(err);
    }
  };

  await loadMessages();
  chatPollInterval = setInterval(loadMessages, 3000);

  const sendBtn = document.getElementById('sendBtn');
  const msgInput = document.getElementById('messageInput');

  // Удаляем старые обработчики (клонированием)
  const newSendBtn = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);

  newSendBtn.addEventListener('click', async () => {
    const text = msgInput.value.trim();
    if (!text) return;
    try {
      await db.insert('messages', {
        from_nick: current.nick,
        to_nick: withNick,
        text,
        created_at: new Date().toISOString()
      });
      msgInput.value = '';
      await loadMessages();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  });

  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') newSendBtn.click();
  });
}

// ============================================================
//  АДМИНКА (admin.html)
// ============================================================
if (window.location.pathname.includes('admin.html')) {
  const countEl = document.getElementById('onlineCount');
  if (countEl) {
    const refresh = async () => {
      try {
        countEl.textContent = await getOnlineCount();
      } catch (e) {
        countEl.textContent = '—';
      }
    };
    refresh();
    setInterval(refresh, 5000);
  }
}
