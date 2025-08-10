const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, '../client/build')));

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  let currentRoom = 'general';
  let username = `User-${Math.floor(Math.random() * 1000)}`;
  
  socket.on('join-room', (room) => {
    currentRoom = room;
    socket.join(room);
    
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(socket.id);
    
    const users = Array.from(rooms.get(room)).map(id => ({
      id,
      name: id === socket.id ? 'You' : `User-${id.slice(0, 4)}`
    }));
    
    io.to(room).emit('room-users', users);
    socket.emit('message', {
      text: `You joined #${room}`,
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    });
    
    socket.broadcast.to(room).emit('message', {
      text: `${username} joined the room`,
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    });
  });
  
  socket.on('leave-room', (room) => {
    socket.leave(room);
    if (rooms.has(room)) {
      rooms.get(room).delete(socket.id);
      
      const users = Array.from(rooms.get(room)).map(id => ({
        id,
        name: `User-${id.slice(0, 4)}`
      }));
      
      io.to(room).emit('room-users', users);
      socket.broadcast.to(room).emit('message', {
        text: `${username} left the room`,
        sender: 'System',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });
  
  socket.on('message', (message) => {
    io.to(message.room).emit('message', {
      ...message,
      timestamp: new Date().toLocaleTimeString()
    });
  });
  
  socket.on('share-file', (fileData) => {
    io.to(fileData.room).emit('file-shared', {
      ...fileData,
      sender: username
    });
  });
  
  socket.on('start-screen-share', ({ room }) => {
    socket.broadcast.to(room).emit('message', {
      text: `${username} started screen sharing`,
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    });
  });
  
  socket.on('stop-screen-share', ({ room }) => {
    socket.broadcast.to(room).emit('message', {
      text: `${username} stopped screen sharing`,
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    });
  });
  
  socket.on('new-recording', (data) => {
    socket.broadcast.to(currentRoom).emit('notification', {
      text: `${username} created a new ${data.type} recording (${data.duration}s)`,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('file-converted', (data) => {
    socket.broadcast.to(currentRoom).emit('notification', {
      text: `${username} converted a file from ${data.from} to ${data.to}`,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(socket.id);
      
      const users = Array.from(rooms.get(currentRoom)).map(id => ({
        id,
        name: `User-${id.slice(0, 4)}`
      }));
      
      io.to(currentRoom).emit('room-users', users);
      socket.broadcast.to(currentRoom).emit('message', {
        text: `${username} disconnected`,
        sender: 'System',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});