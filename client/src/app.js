import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AudioRecorder from './components/AudioRecorder';
import ScreenRecorder from './components/ScreenRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileConverter from './components/FileConverter';
import RealTimeCollaboration from './components/RealTimeCollaboration';
import './styles/main.css';

const App = () => {
  const [activeTool, setActiveTool] = useState('audio');
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);

    newSocket.on('users-updated', (count) => {
      setOnlineUsers(count);
    });

    newSocket.on('notification', (msg) => {
      setNotifications(prev => [...prev, msg]);
    });

    return () => newSocket.disconnect();
  }, []);

  const tools = [
    { id: 'audio', name: 'Audio Recorder', icon: '🎤' },
    { id: 'screen', name: 'Screen Recorder', icon: '🖥️' },
    { id: 'video', name: 'Video Recorder', icon: '🎥' },
    { id: 'convert', name: 'File Converter', icon: '🔄' },
    { id: 'collab', name: 'Real-Time Collab', icon: '👥' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛠️ Tooooools Clone</h1>
        <div className="status">
          <span>Online: {onlineUsers}</span>
          {notifications.length > 0 && (
            <div className="notification-badge">{notifications.length}</div>
          )}
        </div>
      </header>

      <nav className="tool-nav">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
          >
            <span className="tool-icon">{tool.icon}</span>
            {tool.name}
          </button>
        ))}
      </nav>

      <main className="tool-container">
        {activeTool === 'audio' && <AudioRecorder socket={socket} />}
        {activeTool === 'screen' && <ScreenRecorder socket={socket} />}
        {activeTool === 'video' && <VideoRecorder socket={socket} />}
        {activeTool === 'convert' && <FileConverter socket={socket} />}
        {activeTool === 'collab' && <RealTimeCollaboration socket={socket} />}
      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Tooooools Clone | Realtime Recording & Conversion</p>
      </footer>
    </div>
  );
};

export default App;