import React, { useState, useRef, useEffect } from 'react';

const VideoRecorder = ({ socket }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const [videoBlob, setVideoBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  // Get available video devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices:', err);
      }
    };
    getDevices();
  }, []);

  const startRecording = async () => {
    try {
      const constraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Show camera preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        bitsPerSecond: 2500000 // 2.5Mbps
      });
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        videoChunksRef.current = [];
        clearInterval(timerRef.current);
        setRecordingTime(0);
        
        // Stop all tracks
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        // Notify via socket
        if (socket) {
          socket.emit('new-recording', { 
            type: 'video', 
            duration: recordingTime 
          });
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
      alert('Could not start recording. Please check camera permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadVideo = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-recording-${new Date().toISOString().slice(0, 19)}.webm`;
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
      <h2>Video Recorder</h2>
      
      <div className="device-selector">
        <label htmlFor="video-device">Camera:</label>
        <select
          id="video-device"
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={isRecording}
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${devices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>
      
      <div className="video-preview-container">
        <video 
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: isRecording ? 'block' : 'none' }}
          className="video-preview"
        />
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
      
      {videoURL && (
        <div className="recorder-preview">
          <video src={videoURL} controls className="video-preview" />
          <button className="download-btn" onClick={downloadVideo}>
            Download Recording
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;