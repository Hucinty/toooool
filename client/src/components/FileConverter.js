import React, { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const FileConverter = ({ socket }) => {
  const [inputFile, setInputFile] = useState(null);
  const [outputFile, setOutputFile] = useState(null);
  const [outputURL, setOutputURL] = useState('');
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('mp3');
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef(null);

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on('log', ({ message }) => console.log(message));
      ffmpeg.on('progress', ({ progress }) => {
        setConversionProgress(Math.round(progress * 100));
      });
      
      await ffmpeg.load();
      setFfmpegLoaded(true);
    };
    
    loadFFmpeg();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInputFile(file);
      setOutputFile(null);
      setOutputURL('');
    }
  };

  const convertFile = async () => {
    if (!inputFile || !ffmpegLoaded) return;
    
    setIsConverting(true);
    setConversionProgress(0);
    
    try {
      const ffmpeg = ffmpegRef.current;
      const inputName = 'input.' + inputFile.name.split('.').pop();
      const outputName = 'output.' + selectedFormat;
      
      // Write the file to FFmpeg's file system
      await ffmpeg.writeFile(inputName, await fetchFile(inputFile));
      
      // Run the FFmpeg command
      let command = [];
      
      if (inputName.endsWith('.mp4') && selectedFormat === 'mp3') {
        command = ['-i', inputName, '-q:a', '0', '-map', 'a', outputName];
      } else if (inputName.endsWith('.wav') && selectedFormat === 'mp3') {
        command = ['-i', inputName, '-codec:a', 'libmp3lame', '-qscale:a', '2', outputName];
      } else if (selectedFormat === 'gif') {
        command = ['-i', inputName, '-vf', 'fps=10,scale=640:-1', '-f', 'gif', outputName];
      } else {
        command = ['-i', inputName, outputName];
      }
      
      await ffmpeg.exec(command);
      
      // Read the result
      const data = await ffmpeg.readFile(outputName);
      
      // Create URL
      const blob = new Blob([data], { type: `application/${selectedFormat}` });
      const url = URL.createObjectURL(blob);
      
      setOutputFile(blob);
      setOutputURL(url);
      
      // Notify via socket
      if (socket) {
        socket.emit('file-converted', {
          from: inputName.split('.').pop(),
          to: selectedFormat,
          size: blob.size
        });
      }
    } catch (err) {
      console.error('Conversion error:', err);
      alert('Conversion failed. Please try another file or format.');
    } finally {
      setIsConverting(false);
    }
  };

  const downloadConvertedFile = () => {
    if (outputFile) {
      const url = URL.createObjectURL(outputFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const supportedFormats = {
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
    video: ['mp4', 'webm', 'mov', 'avi', 'gif'],
    image: ['jpg', 'png', 'webp', 'gif']
  };

  const getFormatType = (format) => {
    if (supportedFormats.audio.includes(format)) return 'audio';
    if (supportedFormats.video.includes(format)) return 'video';
    if (supportedFormats.image.includes(format)) return 'image';
    return 'other';
  };

  return (
    <div className="converter-container">
      <h2>File Converter</h2>
      
      <div className="converter-controls">
        <div className="file-input">
          <button 
            className="file-btn"
            onClick={() => fileInputRef.current.click()}
          >
            {inputFile ? inputFile.name : 'Select File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        
        {inputFile && (
          <div className="format-selection">
            <label>Convert to:</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              disabled={isConverting}
            >
              {supportedFormats[getFormatType(inputFile.name.split('.').pop())]?.map(format => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {inputFile && !isConverting && (
          <button className="convert-btn" onClick={convertFile}>
            Convert File
          </button>
        )}
        
        {isConverting && (
          <div className="progress-container">
            <progress value={conversionProgress} max="100" />
            <span>{conversionProgress}%</span>
          </div>
        )}
      </div>
      
      {outputURL && (
        <div className="converter-output">
          {getFormatType(selectedFormat) === 'audio' && (
            <audio src={outputURL} controls className="preview-audio" />
          )}
          {getFormatType(selectedFormat) === 'video' && (
            <video src={outputURL} controls className="preview-video" />
          )}
          {getFormatType(selectedFormat) === 'image' && (
            <img src={outputURL} alt="Converted" className="preview-image" />
          )}
          
          <button className="download-btn" onClick={downloadConvertedFile}>
            Download Converted File
          </button>
        </div>
      )}
    </div>
  );
};

export default FileConverter;