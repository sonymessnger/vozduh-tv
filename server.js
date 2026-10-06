const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== МОДЕРАЦИЯ =====
// Список матерных слов (можно расширять)
const BAD_WORDS = [
  'хуй', 'хуя', 'хую', 'хуе', 'пизд', 'ебал', 'ебан', 'ебат', 'ебуч',
  'блят', 'бляд', 'бля', 'мраз', 'гандон', 'гондон', 'долбоеб', 'долбоёб',
  'залуп', 'манда', 'мудак', 'мудил', 'нах', 'нахуй', 'нигер', 'ниггер',
  'пидор', 'пидар', 'пидр', 'срак', 'срать', 'сука', 'сучк', 'уебан',
  'уебок', 'уёбок', 'хер', 'херн', 'шлюх', 'шлюш', 'fuck', 'shit', 'bitch',
  'asshole', 'dick', 'cunt', 'whore'
];

function cleanText(text) {
  let cleaned = text;
  BAD_WORDS.forEach(function(word) {
    const regex = new RegExp(word, 'gi');
    cleaned = cleaned.replace(regex, '***');
  });
  return cleaned;
}

// Хранилище активности: { socketId: { lastTime, count, windowStart, messages: [] } }
const userActivity = {};

function checkSpam(socketId, text) {
  const now = Date.now();
  if (!userActivity[socketId]) {
    userActivity[socketId] = { messages: [] };
  }
  const activity = userActivity[socketId];

  // Антифлуд: не больше 5 сообщений за 10 секунд
  activity.messages = activity.messages.filter(function(t) { return now - t < 10000; });
  if (activity.messages.length >= 5) {
    return { ok: false, reason: 'Слишком много сообщений. Подожди немного.' };
  }

  // Антиспам: нельзя повторить то же сообщение
  if (activity.lastText === text.toLowerCase() && now - activity.lastTime < 3000) {
    return { ok: false, reason: 'Не повторяй одно и то же.' };
  }

  activity.messages.push(now);
  activity.lastText = text.toLowerCase();
  activity.lastTime = now;
  return { ok: true };
}

// Проверка ссылок
function checkLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const links = text.match(urlRegex);
  if (!links) return { ok: true };

  const allowed = ['youtube.com', 'youtu.be', 'twitch.tv', 'clips.twitch.tv'];
  for (let i = 0; i < links.length; i++) {
    const link = links[i].toLowerCase();
    const isAllowed = allowed.some(function(domain) { return link.includes(domain); });
    if (!isAllowed) {
      return { ok: false, reason: 'Ссылки запрещены (кроме YouTube и Twitch).' };
    }
  }
  return { ok: true };
}

// ===== СООБЩЕНИЯ =====
const messages = [];
const MAX_MESSAGES = 100;

io.on('connection', function(socket) {
  console.log('Зритель подключился:', socket.id);

  // Отправляем историю
  socket.emit('chat_history', messages);

  // Модерация: удаление сообщения (только админ)
  socket.on('delete_message', function(msgId) {
    // Простая проверка — только если это "admin"
    // Можно расширить через пароль
    const idx = messages.findIndex(function(m) { return m.id === msgId; });
    if (idx !== -1) {
      messages.splice(idx, 1);
      io.emit('message_deleted', { id: msgId });
    }
  });

  // Новое сообщение
  socket.on('chat_message', function(data) {
    if (!data.user || !data.text) return;
    if (data.text.length > 500) return;

    // Проверка на спам
    const spamCheck = checkSpam(socket.id, data.text);
    if (!spamCheck.ok) {
      socket.emit('moderation_warning', { message: spamCheck.reason });
      return;
    }

    // Проверка ссылок
    const linkCheck = checkLinks(data.text);
    if (!linkCheck.ok) {
      socket.emit('moderation_warning', { message: linkCheck.reason });
      return;
    }

    // Фильтр мата
    const cleanMessage = cleanText(data.text);

    const msg = {
      id: Date.now() + Math.random(),
      user: cleanText(data.user),
      text: cleanMessage,
      time: Date.now(),
      color: data.color || '#9147ff'
    };

    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();

    io.emit('new_chat_message', msg);
  });

  socket.on('disconnect', function() {
    delete userActivity[socket.id];
    console.log('Зритель вышел:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', function() {
  console.log('Сервер запущен на порту ' + PORT);
});