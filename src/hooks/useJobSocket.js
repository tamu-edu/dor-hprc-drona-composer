import { useState, useEffect, useRef } from 'react';
import { AnsiUp } from 'ansi_up';

function stripAnsiCodes(text) {
  return text.replace(/\u001b\[\d+(?:;\d+)*m/g, '');
}

export function useJobSocket() {
  const [outputBuffer, setOutputBuffer] = useState('');
  const [processedLines, setProcessedLines] = useState([]);
  const [htmlOutput, setHtmlOutput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(null);

  const ansiUp = useRef(new AnsiUp());
  const accumulatedData = useRef('');
  const currentJobId = useRef(null);
  const pollInterval = useRef(null);
  const streamInterval = useRef(null);
  const outputPosition = useRef(0);
  const baseUrl = useRef('');
  

  const DEBUG = true;
  // Streaming parameters
  const POLL_INTERVAL = 1000; // Poll server every 1000ms
  const STREAM_CHUNKS = 10;   // Split each response into 10 chunks
  const MIN_CHUNK_SIZE = 400;  // If text is smaller than this, output directly
  const CHUNK_DELAY = POLL_INTERVAL / STREAM_CHUNKS; // 100ms between chunks
  
  // Streaming state
  const chunkQueue = useRef([]); // Array of chunks to display
  const isStreaming = useRef(false);

  const processBuffer = (text) => {
    const physicalLines = text.split('\n');
    const processedOutput = [];

    physicalLines.forEach((line) => {
      if (line.includes('\r')) {
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
    const processedText = processedOutput.join('\n');
    const html = ansiUp.current.ansi_to_html(processedText);
    setHtmlOutput(html);
  };

  const splitIntoChunks = (text, numChunks) => {
    if (!text || text.length === 0) return [];
    
    const chunkSize = Math.ceil(text.length / numChunks);
    const chunks = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    
    return chunks;
  };

  const startStreaming = () => {
    if (isStreaming.current || chunkQueue.current.length === 0) return;
    
    isStreaming.current = true;
    
    const displayNextChunk = () => {
      if (chunkQueue.current.length === 0) {
        isStreaming.current = false;
        return;
      }
      
      let chunksToTake = 1;
      const queueLength = chunkQueue.current.length;
      
      chunksToTake = Math.floor(queueLength / STREAM_CHUNKS) + 1;
      
      let combinedChunk = '';
      for (let i = 0; i < chunksToTake && chunkQueue.current.length > 0; i++) {
        combinedChunk += chunkQueue.current.shift();
      }
      
      accumulatedData.current += combinedChunk;
      setOutputBuffer(accumulatedData.current);
      processBuffer(accumulatedData.current);
      
      // Continue with next chunk if queue not empty
      if (chunkQueue.current.length > 0) {
        streamInterval.current = setTimeout(displayNextChunk, CHUNK_DELAY);
      } else {
        isStreaming.current = false;
      }
    };
    
    displayNextChunk();
  };

  const stopStreaming = () => {
    if (streamInterval.current) {
      clearTimeout(streamInterval.current);
      streamInterval.current = null;
    }
    
    // Flush remaining chunks immediately
    while (chunkQueue.current.length > 0) {
      const chunk = chunkQueue.current.shift();
      accumulatedData.current += chunk;
    }
    
    setOutputBuffer(accumulatedData.current);
    processBuffer(accumulatedData.current);
    isStreaming.current = false;
  };

  const finishJob = (finalMessage, finalStatus) => {
    // Add final message to queue to ensure proper order
    appendOutput(finalMessage, true); // immediate = true for completion messages
    setStatus(finalStatus);
    stopPolling();
    setIsConnected(false);
    
    // Let streaming finish naturally - don't force stop
    // The queue will empty and streaming will stop automatically
  };

  const appendOutput = (text, immediate = false) => {
    // If text is small or immediate flag is set, output directly without chunking
    if (immediate || text.length < MIN_CHUNK_SIZE) {
      chunkQueue.current.push(text);
    } else {
      // Split new text into equal chunks
      const chunks = splitIntoChunks(text, STREAM_CHUNKS);
      chunkQueue.current.push(...chunks);
    }
    
    // Start streaming if not already active
    if (!isStreaming.current) {
      startStreaming();
    }
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const extractBaseUrl = (action) => {
    const match = action.match(/^(.+\/jobs\/composer)\//);
    if (match) {
      return match[1];
    }
    const path = window.location.pathname;
    const composerMatch = path.match(/^(.+\/jobs\/composer)/);
    if (composerMatch) {
      return composerMatch[1];
    }
    return '/jobs/composer';
  };

  const startPolling = (jobId) => {
    stopPolling();

    const poll = async () => {
      try {
        const url = `${baseUrl.current}/ws-job-output/${jobId}/${outputPosition.current}`;
        if (DEBUG) console.log('[DEBUG] Polling URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
          if (DEBUG) console.error('[DEBUG] Poll response not ok:', response.status);
          return;
        }

        const data = await response.json();
        if (DEBUG) console.log('[DEBUG] Poll data:', data);

        if (data.new_output) {
          appendOutput(data.new_output);
          outputPosition.current = data.total_length;
        }

        // Check if job is complete - ensure all output is processed first
        if (data.status === 'completed') {
          finishJob('', 'completed');
        } else if (data.status === 'failed') {
          finishJob(`\nJob failed with exit code ${data.exit_code || 1}\n`, 'failed');
        } else if (data.status === 'error') {
          finishJob('\nJob encountered an error.\n', 'error');
        }

      } catch (error) {
        if (DEBUG) console.error('[DEBUG] Polling error:', error);
      }
    };

    // Poll every POLL_INTERVAL (1000ms)
    pollInterval.current = setInterval(poll, POLL_INTERVAL);
  };

  useEffect(() => {
    return () => {
      stopPolling();
      stopStreaming();
    };
  }, []);

  const sendInput = (inputText) => {
    console.warn('Input not supported in HTTP polling mode');
    return false;
  };

  const startHttpJob = async (bashCmd, drona_job_id = null) => {
    try {
      const url = `${baseUrl.current}/ws-start-job`;
      if (DEBUG) console.log('[DEBUG] Starting job URL:', url);
      if (DEBUG) console.log('[DEBUG] Bash command:', bashCmd);
      if (DEBUG) console.log('[DEBUG] Drona job ID:', drona_job_id);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ 
          bash_cmd: bashCmd,
          ...(drona_job_id && { drona_job_id: drona_job_id })
        })
      });

      if (DEBUG) console.log('[DEBUG] Start job response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG) console.error('[DEBUG] Start job error response:', errorText);
        appendOutput(`\nError starting job: ${response.status}\n`);
        setStatus('error');
        return;
      }

      const data = await response.json();
      if (DEBUG) console.log('[DEBUG] Start job response data:', data);

      if (data.job_id) {
        currentJobId.current = data.job_id;
        appendOutput('');
        setStatus('running');
        setIsConnected(true);

        startPolling(data.job_id);
      } else {
        appendOutput(`\nError: No job ID returned\n`);
        setStatus('error');
      }

    } catch (error) {
      if (DEBUG) console.error('[DEBUG] Start job error:', error);
      appendOutput(`\nConnection error: ${error.message}\n`);
      setStatus('error');
    }
  };

  const submitJob = (action, formData) => {
    if (DEBUG) console.log('[DEBUG] Submit job called with action:', action);

    baseUrl.current = extractBaseUrl(action);
    if (DEBUG) console.log('[DEBUG] Extracted base URL:', baseUrl.current);

    // Reset all state
    stopStreaming();
    chunkQueue.current = [];
    accumulatedData.current = '';
    setOutputBuffer('');
    setProcessedLines(['']);
    setHtmlOutput(ansiUp.current.ansi_to_html(''));
    setStatus('submitting');
    outputPosition.current = 0;

    try {
      const initialRequest = new XMLHttpRequest();
      initialRequest.open("POST", action, true);
      initialRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      initialRequest.responseType = "json";

      initialRequest.onreadystatechange = function() {
        if (initialRequest.readyState === 4) {
          if (DEBUG) console.log('[DEBUG] Initial request status:', initialRequest.status);
          if (DEBUG) console.log('[DEBUG] Initial request response:', initialRequest.response);

          if (initialRequest.status === 200 && initialRequest.response && initialRequest.response.bash_cmd) {
            startHttpJob(initialRequest.response.bash_cmd, initialRequest.response.drona_job_id);
          } else {
            appendOutput(`\nError starting the job: ${initialRequest.status}\n`);
            setStatus('error');
          }
        }
      };

      initialRequest.onerror = function() {
        if (DEBUG) console.error('[DEBUG] Initial request error');
        appendOutput('\nConnection error during job submission.\n');
        setStatus('error');
      };

      initialRequest.send(formData);

    } catch (error) {
      if (DEBUG) console.error('[DEBUG] Submit job error:', error);
      appendOutput(`\nError: ${error.message}\n`);
      setStatus('error');
    }
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
      if (DEBUG) console.log('[DEBUG] Reset called');
      stopPolling();
      stopStreaming();
      chunkQueue.current = [];
      accumulatedData.current = '';
      setOutputBuffer('');
      setProcessedLines(['']);
      setHtmlOutput(ansiUp.current.ansi_to_html(''));
      setStatus(null);
      currentJobId.current = null;
      outputPosition.current = 0;
      setIsConnected(false);
      baseUrl.current = '';
    }
  };
}
