// hooks/useJobSocket.js - with both ANSI colors and progress bar handling
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Import ansi_up properly
import { AnsiUp } from 'ansi_up';

// Simple escape code handling for line length calculations
function stripAnsiCodes(text) {
  return text.replace(/\u001b\[\d+(?:;\d+)*m/g, '');
}

export function useJobSocket() {
  // Raw accumulating buffer
  const [outputBuffer, setOutputBuffer] = useState('Starting job submission...\n');
  // Processed lines with proper CR handling
  const [processedLines, setProcessedLines] = useState(['Starting job submission...\n']);
  // HTML output with colors
  const [htmlOutput, setHtmlOutput] = useState('');
  
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const socketRef = useRef(null);
  
  // Create ansi_up instance
  const ansiUp = useRef(new AnsiUp());
  
  // Track accumulated data for proper CR handling
  const accumulatedData = useRef('');
  
  // Process the current accumulated data with proper CR handling
  const processBuffer = () => {
    const rawText = accumulatedData.current;
    
    // Split into physical lines (by \n)
    const physicalLines = rawText.split('\n');
    
    // Process each physical line to handle CRs properly
    const processedOutput = [];
    
    physicalLines.forEach((line, index) => {
      // For each physical line, process CRs to get the final state
      if (line.includes('\r')) {
        // Line has carriage returns - need special handling
        let finalLine = '';
        const segments = line.split('\r');
        
        // Process each segment (after a CR)
        segments.forEach(segment => {
          if (!finalLine) {
            // First segment
            finalLine = segment;
          } else {
            // Replace characters from the start of the line
            const strippedSegment = stripAnsiCodes(segment);
            const strippedFinalLine = stripAnsiCodes(finalLine);
            
            if (strippedSegment.length <= strippedFinalLine.length) {
              // Replace only part of the line
              finalLine = segment + finalLine.substring(strippedSegment.length);
            } else {
              // New segment is longer, replace the entire line
              finalLine = segment;
            }
          }
        });
        
        processedOutput.push(finalLine);
      } else {
        // No CRs in this line, just add it
        processedOutput.push(line);
      }
      
      // Add a newline for all but the last line
    });
    
    // Set the processed lines
    setProcessedLines(processedOutput);
    
    // Generate HTML with ANSI colors
    const processedText = processedOutput.join('\n');
    const html = ansiUp.current.ansi_to_html(processedText);
    setHtmlOutput(html);
  };
  
  // Cleanup function for the socket
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // Append text to the accumulated buffer
  const appendOutput = (text) => {
    accumulatedData.current += text;
    setOutputBuffer(prev => prev + text);
    processBuffer();
  };
  
  // Send input to the server
  const sendInput = (inputText) => {
    if (!socketRef.current || !isConnected || status !== 'running') {
      console.error('Cannot send input: socket not connected or job not running');
      return false;
    }
    
    console.log('Sending input:', inputText);
    socketRef.current.emit('job_input', { input: inputText });
    
    // Add input to output
    appendOutput(`$ ${inputText}\n`);
    
    return true;
  };
  
  const submitJob = (action, formData) => {
    // Reset state
    accumulatedData.current = 'Starting job submission...\n';
    setOutputBuffer('Starting job submission...\n');
    setProcessedLines(['Starting job submission...\n']);
    setHtmlOutput(ansiUp.current.ansi_to_html('Starting job submission...\n'));
    setStatus('submitting');
    
    // Check if we have files to upload
    let hasFiles = false;
    for (const value of formData.values()) {
      if (value instanceof File && value.size > 0) {
        hasFiles = true;
        break;
      }
    }
    
    if (hasFiles) {
      // Upload files via HTTP first
      appendOutput('Uploading files...\n');
      
      const initialRequest = new XMLHttpRequest();
      initialRequest.open("POST", action, true);
      initialRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      initialRequest.responseType = "json";
      
      initialRequest.onreadystatechange = function() {
        if (initialRequest.readyState === 4) {
          if (initialRequest.status === 200) {
            appendOutput('Files uploaded successfully. Connecting to socket...\n');
            connectSocket(formData);
          } else {
            appendOutput(`\nError submitting files: ${initialRequest.status}\n`);
            setStatus('error');
          }
        }
      };
      
      initialRequest.send(formData);
    } else {
      // No files, connect to socket directly
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
    
    // Enable interactive mode
    params.interactive = true;
    
    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Connect to WebSocket
    console.log('Connecting socket...');
    const socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    // Set up event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('run_job', { params });
    });
    
    socket.on('job_started', (data) => {
      console.log('Job started:', data);
      appendOutput('Job process started. Ready for input.\n');
      setStatus('running');
    });
    
    socket.on('output', (data) => {
      try {
        // Handle ArrayBuffer format
        if (data && data.data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(data.data);
          const text = new TextDecoder('utf-8').decode(bytes);
          appendOutput(text);
        }
        // Other formats (fallback)
        else if (data && typeof data.data === 'string') {
          appendOutput(data.data);
        }
        else if (typeof data === 'string') {
          appendOutput(data);
        }
        else {
          console.warn('Unexpected output format:', data);
        }
      } catch (e) {
        console.error('Error processing output:', e);
        appendOutput(`\nError processing output: ${e.message}\n`);
      }
    });
    
    socket.on('complete', (data) => {
      console.log('Job completed:', data);
      const exitCode = data && data.exit_code !== undefined ? data.exit_code : 1;
      
      if (exitCode === 0) {
        appendOutput('\nJob completed successfully.\n');
      } else {
        appendOutput(`\nJob failed with exit code ${exitCode}\n`);
      }
      
      setStatus(exitCode === 0 ? 'completed' : 'failed');
      socket.disconnect();
    });
    
    socket.on('error', (data) => {
      console.error('Socket error:', data);
      appendOutput(`\nError: ${data && data.message ? data.message : 'Unknown error'}\n`);
      setStatus('error');
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        appendOutput(`\nDisconnected: ${reason}\n`);
      }
    });
  };

  return {
    rawOutput: outputBuffer,
    lines: processedLines,
    htmlOutput,  // Return the HTML-formatted output with colors
    isConnected,
    status,
    submitJob,
    sendInput,
    reset: () => {
      accumulatedData.current = 'Starting job submission...\n';
      setOutputBuffer('Starting job submission...\n');
      setProcessedLines(['Starting job submission...\n']);
      setHtmlOutput(ansiUp.current.ansi_to_html('Starting job submission...\n'));
      setStatus(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    }
  };
}
