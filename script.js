[14.06.2026 15:56] Леонид: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script>
// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://pokxselyifwsabjztsap.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IhnwSLLXhpDyA7Mz3awNBQ_Oz4BtFAW';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Загрузка текущего пользователя
async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();
    currentUser = profile || session.user;
  }
  return currentUser;
}

// Регистрация
async function registerUser(nick, email, pass, role) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ nick, email: email.toLowerCase(), pass, role }])
    .select()
    .single();

  if (error) throw error;
  currentUser = data;
  return data;
}

// Логин
async function loginUser(email, pass) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('pass', pass)
    .single();

  if (error || !data) throw new Error('Неверный email или пароль');
  currentUser = data;
  return data;
}

// Создание поста
async function createPost() {
  const text = document.getElementById('postText')?.value.trim();
  if (!text) return alert('Напиши хоть что-то!');

  if (!currentUser) return alert('Залогинься!');

  const { error } = await supabase
    .from('posts')
    .insert([{
      author_nick: currentUser.nick,
      avatar: currentUser.avatar || 'https://via.placeholder.com/48',
      text: text
    }]);

  if (error) {
    alert('Ошибка: ' + error.message);
    return;
  }

  document.getElementById('postText').value = '';
  renderFeed();
}

// Загрузка ленты
async function renderFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;

  feed.innerHTML = '<p>Загрузка постов...</p>';

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('time', { ascending: false });

  if (error) {
    feed.innerHTML = '<p>Ошибка загрузки</p>';
    return;
  }

  feed.innerHTML = '';

  posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.innerHTML = 
      <div class="post-header">
        <img src="${post.avatar}" alt="" class="post-avatar">
        <div>
          <span class="post-author">${post.author_nick}</span>
          <div class="post-time">${new Date(post.time).toLocaleString('ru')}</div>
        </div>
      </div>
      <div class="post-content">${post.text.replace(/\n/g, '<br>')}</div>
      <div class="post-actions">
        <button class="like-btn" onclick="toggleLike(${post.id})">❤️ 0</button>
      </div>
    ;
    feed.appendChild(postEl);
  });
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await getCurrentUser();

  // Логика регистрации / логина
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const nick = document.getElementById('regNick').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pass = document.getElementById('regPass').value;
      const role = document.getElementById('regRole').value;

      try {
        await registerUser(nick, email, pass, role);
        window.location.href = 'index.html';
      } catch (err) {
        document.getElementById('regError').textContent = err.message;
      }
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPass').value;
[14.06.2026 15:56] Леонид: try {
        await loginUser(email, pass);
        window.location.href = 'index.html';
      } catch (err) {
        document.getElementById('loginError').textContent = err.message;
      }
    });
  }

  // Лента на главной
  if (document.getElementById('feed')) {
    renderFeed();
  }

  // Приветствие
  const welcome = document.getElementById('welcomeUser');
  if (welcome && currentUser) {
    welcome.innerHTML = Привет, ${currentUser.nick}! 💜;
  }
});
</script>
