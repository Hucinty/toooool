import React, { useState, useRef, useEffect } from 'react';

const AudioRecorder = ({ socket }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('default');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Get available audio devices
  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
    };
    getDevices();
  }, []);

  const startRecording = async () => {
    try {
      const constraints = {
        audio: selectedDevice !== 'default' ? { deviceId: selectedDevice } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        audioChunksRef.current = [];
        clearInterval(timerRef.current);
        setRecordingTime(0);
        
        // Notify others via socket
        if (socket) {
          socket.emit('new-recording', { type: 'audio', duration: recordingTime });
        }
      };
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const downloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString().slice(0, 19)}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="recorder-container">
      <h2>Audio Recorder</h2>
      
      <div className="device-selector">
        <label htmlFor="audio-device">Microphone:</label>
        <select
          id="audio-device"
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={isRecording}
        >
          <option value="default">Default</option>
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>
      
      <div className="recorder-controls">
        {!isRecording ? (
          <button className="record-btn start" onClick={startRecording}>
            Start Recording
          </button>
        ) : (
          <button className="record-btn stop" onClick={stopRecording}>
            Stop Recording ({formatTime(recordingTime)})
          </button>
        )}
      </div>
      
      {audioURL && (
        <div className="recorder-preview">
          <audio src={audioURL} controls className="audio-preview" />
          <button className="download-btn" onClick={downloadAudio}>
            Download Recording
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;