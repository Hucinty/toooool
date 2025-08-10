import React, { useState, useRef, useEffect } from 'react';

const ScreenRecorder = ({ socket }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const [videoBlob, setVideoBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [withAudio, setWithAudio] = useState(true);
  const [recordingState, setRecordingState] = useState('ready'); // ready, requesting, recording
  
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewVideoRef = useRef(null);

  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: withAudio
      });
      
      // Handle when user clicks "Stop sharing" in browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
      
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
        if (previewVideoRef.current) {
          previewVideoRef.current.src = url;
        }
        videoChunksRef.current = [];
        clearInterval(timerRef.current);
        setRecordingTime(0);
        setRecordingState('ready');
        
        // Notify via socket
        if (socket) {
          socket.emit('new-recording', { 
            type: 'screen', 
            duration: recordingTime,
            withAudio
          });
        }
      };
      
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingState('recording');
    } catch (err) {
      console.error('Screen recording error:', err);
      setRecordingState('ready');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const downloadVideo = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screen-recording-${new Date().toISOString().slice(0, 19)}.webm`;
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
      <h2>Screen Recorder</h2>
      
      <div className="recorder-options">
        <label>
          <input
            type="checkbox"
            checked={withAudio}
            onChange={(e) => setWithAudio(e.target.checked)}
            disabled={isRecording}
          />
          Include Audio
        </label>
      </div>
      
      <div className="recorder-controls">
        {recordingState === 'ready' && (
          <button className="record-btn start" onClick={startRecording}>
            Start Screen Recording
          </button>
        )}
        
        {recordingState === 'requesting' && (
          <button className="record-btn requesting" disabled>
            Waiting for Screen Selection...
          </button>
        )}
        
        {recordingState === 'recording' && (
          <button className="record-btn stop" onClick={stopRecording}>
            Stop Recording ({formatTime(recordingTime)})
          </button>
        )}
      </div>
      
      {videoURL && (
        <div className="recorder-preview">
          <video 
            ref={previewVideoRef}
            src={videoURL} 
            controls 
            className="video-preview"
          />
          <button className="download-btn" onClick={downloadVideo}>
            Download Recording
          </button>
        </div>
      )}
    </div>
  );
};

export default ScreenRecorder;