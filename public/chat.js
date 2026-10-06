const socket = io();

const chatMessages = document.getElementById('chatMessages');
const chatName = document.getElementById('chatName');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

// Цвета для ников (как в Twitch)
const NICK_COLORS = [
  '#ff5252', '#ff4081', '#e040fb', '#7c4dff',
  '#536dfe', '#448aff', '#40c4ff', '#18ffff',
  '#64ffda', '#69f0ae', '#b2ff59', '#eeff41',
  '#ffff00', '#ffd740', '#ffab40', '#ff6e40'
];

function randomColor() {
  return NICK_COLORS[Math.floor(Math.random() * NICK_COLORS.length)];
}

// Запомнить ник
const savedName = localStorage.getItem('chat_name');
if (savedName) chatName.value = savedName;

function formatTime(ms) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Добавить сообщение
function addMessage(msg) {
  const sys = chatMessages.querySelector('.chat-system');
  if (sys) sys.remove();

  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.dataset.id = msg.id;
  div.innerHTML =
    '<span class="chat-author" style="color: ' + (msg.color || '#9147ff') + '">' +
      escapeHtml(msg.user) +
    '</span>' +
    '<span class="chat-text">' + escapeHtml(msg.text) + '</span>' +
    '<span class="chat-time">' + formatTime(msg.time) + '</span>';

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Показать предупреждение модерации
function showWarning(text) {
  const warn = document.createElement('div');
  warn.className = 'moderation-warning';
  warn.textContent = '⚠️ ' + text;
  chatMessages.appendChild(warn);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  setTimeout(function() { warn.remove(); }, 5000);
}

// Отправить
function sendChat() {
  const user = chatName.value.trim();
  const text = chatInput.value.trim();

  if (!user) {
    alert('Введите ваш ник');
    chatName.focus();
    return;
  }
  if (!text) return;

  localStorage.setItem('chat_name', user);

  let myColor = localStorage.getItem('chat_color');
  if (!myColor) {
    myColor = randomColor();
    localStorage.setItem('chat_color', myColor);
  }

  socket.emit('chat_message', {
    user: user,
    text: text,
    color: myColor
  });

  chatInput.value = '';
  chatInput.focus();
}

chatSend.onclick = sendChat;
chatInput.onkeypress = function(e) {
  if (e.key === 'Enter') sendChat();
};

// Приём сообщений
socket.on('new_chat_message', function(msg) {
  addMessage(msg);
});

socket.on('chat_history', function(history) {
  if (history.length === 0) {
    const div = document.createElement('div');
    div.className = 'chat-system';
    div.textContent = '💬 Добро пожаловать в чат Воздух ТВ!';
    chatMessages.appendChild(div);
  } else {
    history.forEach(function(msg) { addMessage(msg); });
  }
});

// Предупреждение от модерации
socket.on('moderation_warning', function(data) {
  showWarning(data.message);
});

// Удаление сообщения (от админа)
socket.on('message_deleted', function(data) {
  const el = chatMessages.querySelector('.chat-msg[data-id="' + data.id + '"]');
  if (el) el.remove();
});