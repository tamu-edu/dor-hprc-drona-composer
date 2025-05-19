import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useJobSocket() {
  const [lines, setLines] = useState(['Starting job submission...\n']);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const socketRef = useRef(null);
  
  // Cleanup function for the socket
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Process a chunk of text with proper CR/LF handling
  const processOutput = (text) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\r') {
          // Carriage return - clear current line
          let currentLine = newLines[newLines.length - 1];
          let endsWithNewline = currentLine.endsWith('\n');
          newLines[newLines.length - 1] = endsWithNewline ? '\n' : '';
        }
        else if (char === '\n') {
          // Newline - start a new line
          if (!newLines[newLines.length - 1].endsWith('\n')) {
            newLines[newLines.length - 1] += '\n';
          }
          newLines.push('');
        }
        else {
          // Regular character - append to current line
          newLines[newLines.length - 1] += char;
        }
      }
      
      return newLines;
    });
  };

  const submitJob = (action, formData) => {
    setLines(['Starting job submission...\n']);
    setStatus('submitting');
    
    // Check if there are files to upload
    let hasFiles = false;
    for (const value of formData.values()) {
      if (value instanceof File && value.size > 0) {
        hasFiles = true;
        break;
      }
    }

    if (hasFiles) {
      // Step 1: Upload files via HTTP
      setLines(prev => [...prev, 'Uploading files...\n']);
      
      const initialRequest = new XMLHttpRequest();
      initialRequest.open("POST", action, true);
      initialRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      initialRequest.responseType = "json";
      
      initialRequest.onreadystatechange = function() {
        if (initialRequest.readyState === 4) {
          if (initialRequest.status === 200) {
            setLines(prev => [...prev, 'Files uploaded successfully. Starting job via socket...\n']);
            connectSocket(formData);
          } else {
            setLines(prev => [...prev, `\nError submitting files: ${initialRequest.status}\n`]);
            setStatus('error');
          }
        }
      };
      
      initialRequest.send(formData);
    } else {
      // No files, connect directly
      connectSocket(formData);
    }
  };

  const connectSocket = (formData) => {
    // Convert FormData to plain object
    const params = {};
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        params[key] = value;
      }
    }
    
    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Connect to WebSocket
    const socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    // Set up event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('run_job', { params });
    });
    
    socket.on('job_started', (data) => {
      setLines(prev => [...prev, 'Job process started.\n']);
      setStatus('running');
    });
    
    socket.on('output', (data) => {
      try {
        const bytes = new Uint8Array(data.data);
        const text = new TextDecoder('utf-8').decode(bytes);
        processOutput(text);
      } catch (e) {
        console.error("Error processing output:", e);
        setLines(prev => [...prev, `\nError processing output: ${e.message}\n`]);
      }
    });
    
    socket.on('complete', (data) => {
      const exitCode = data.exit_code;
      
      if (exitCode === 0) {
        setLines(prev => [...prev, '\nJob completed successfully.']);
        setStatus('completed');
      } else {
        setLines(prev => [...prev, `\nJob failed with exit code ${exitCode}`]);
        setStatus('failed');
      }
      
      socket.disconnect();
      setIsConnected(false);
    });
    
    socket.on('error', (data) => {
      setLines(prev => [...prev, `\nError: ${data.message || 'Unknown error'}\n`]);
      setStatus('error');
    });
    
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setLines(prev => [...prev, `\nDisconnected: ${reason}\n`]);
      }
    });
  };

  return {
    lines,
    isConnected,
    status,
    submitJob,
    reset: () => {
      setLines(['Starting job submission...\n']);
      setStatus(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    }
  };
}
