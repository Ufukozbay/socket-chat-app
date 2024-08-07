const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3005;

// Statik dosyaları servis et
app.use(express.static(path.join(__dirname, "public")));

// Ana sayfayı yönlendir
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Kullanıcıları ve odaları saklamak için
const users = new Map();
const rooms = new Set(["Grup1", "Grup2"]);

io.on("connection", (socket) => {
  console.log("Yeni kullanıcı bağlandı:", socket.id);

  // Kullanıcı kaydı
  socket.on("register", (username) => {
    users.set(socket.id, username);
    socket.emit("registered", { id: socket.id, username });
    io.emit("userList", Array.from(users.values()));
  });

  // Özel mesaj
  socket.on("privateMessage", ({ to, message }) => {
    const sender = users.get(socket.id);
    io.to(to).emit("privateMessage", { from: sender, message });
  });

  // Grup mesajı
  socket.on("groupMessage", ({ room, message }) => {
    if (rooms.has(room)) {
      const sender = users.get(socket.id);
      io.to(room).emit("groupMessage", { room, from: sender, message });
    }
  });

  // Odaya katılma
  socket.on("joinRoom", (room) => {
    if (rooms.has(room)) {
      socket.join(room);
      socket.emit("joinedRoom", room);
    }
  });

  // Odadan ayrılma
  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    socket.emit("leftRoom", room);
  });

  // Bağlantı kesildiğinde
  socket.on("disconnect", () => {
    console.log("Kullanıcı ayrıldı:", socket.id);
    users.delete(socket.id);
    io.emit("userList", Array.from(users.values()));
  });
});

server.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
