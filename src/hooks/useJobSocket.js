import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { AnsiUp } from 'ansi_up';

// Simple escape code handling for line length calculations
function stripAnsiCodes(text) {
  return text.replace(/\u001b\[\d+(?:;\d+)*m/g, '');
}

export function useJobSocket() {
  const [outputBuffer, setOutputBuffer] = useState('Starting job submission...\n');
  const [processedLines, setProcessedLines] = useState(['Starting job submission...\n']);
  const [htmlOutput, setHtmlOutput] = useState('');
  
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const socketRef = useRef(null);
  
  const ansiUp = useRef(new AnsiUp());
  
  const accumulatedData = useRef('');
  
  const processBuffer = () => {
    const rawText = accumulatedData.current;
    
    const physicalLines = rawText.split('\n');
    
    const processedOutput = [];
    
    physicalLines.forEach((line, index) => {
      if (line.includes('\r')) {
        // Carriage returns  need special handling
        let finalLine = '';
        const segments = line.split('\r');
        
        segments.forEach(segment => {
          if (!finalLine) {
            finalLine = segment;
          } else {
            const strippedSegment = stripAnsiCodes(segment);
            const strippedFinalLine = stripAnsiCodes(finalLine);
            
            if (strippedSegment.length <= strippedFinalLine.length) {
              finalLine = segment + finalLine.substring(strippedSegment.length);
            } else {
              finalLine = segment;
            }
          }
        });
        
        processedOutput.push(finalLine);
      } else {
        processedOutput.push(line);
      }
      
    });
    
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
    
    socketRef.current.emit('job_input', { input: inputText });
    
    appendOutput(`$ ${inputText}\n`);
    
    return true;
  };
  
  const submitJob = (action, formData) => {
    accumulatedData.current = 'Starting job submission...\n';
    setOutputBuffer('Starting job submission...\n');
    setProcessedLines(['Starting job submission...\n']);
    setHtmlOutput(ansiUp.current.ansi_to_html('Starting job submission...\n'));
    setStatus('submitting');
    
    
    // Upload files via HTTP first
    appendOutput('Setting up the environment...\n');
      
    const initialRequest = new XMLHttpRequest();
    initialRequest.open("POST", action, true);
    initialRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    initialRequest.responseType = "json";
      
    initialRequest.onreadystatechange = function() {
      if (initialRequest.readyState === 4) {
        if (initialRequest.status === 200) {
	  //Run the scripts and stream output using sockets
          connectSocket(initialRequest.response.bash_cmd);
        } else {
          appendOutput(`\nError Setting up the environment: ${initialRequest.status}\n`);
          setStatus('error');
        }
      }
    };
      
    initialRequest.send(formData);
  } 
  const connectSocket = (bash_cmd) => {
    
    const debug = false;
    const interactive = true;
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if(debug) console.log('Connecting socket...');
    const socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      if(debug) console.log('Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('run_job', { "bash_cmd": bash_cmd, "interactive": interactive });
    });
    
    socket.on('job_started', (data) => {
      if(debug) console.log('Job started:', data);
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
      if(debug) console.log('Job completed:', data);
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
      if(debug) console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        appendOutput(`\nDisconnected: ${reason}\n`);
      }
    });
  };

  return {
    rawOutput: outputBuffer,
    lines: processedLines,
    htmlOutput,
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
