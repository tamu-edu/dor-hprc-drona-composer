import { useState, useEffect, useRef } from 'react';
import { AnsiUp } from 'ansi_up';

function stripAnsiCodes(text) {
  return text.replace(/\u001b\[\d+(?:;\d+)*m/g, '');
}

export function useJobSocket() {
  const [outputBuffer, setOutputBuffer] = useState('Starting job submission...\n');
  const [processedLines, setProcessedLines] = useState(['Starting job submission...\n']);
  const [htmlOutput, setHtmlOutput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(null);

  const ansiUp = useRef(new AnsiUp());
  const accumulatedData = useRef('');
  const currentJobId = useRef(null);
  const pollInterval = useRef(null);
  const outputPosition = useRef(0);
  const baseUrl = useRef(''); // Store the base URL

  const processBuffer = () => {
    const rawText = accumulatedData.current;
    const physicalLines = rawText.split('\n');
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

  const appendOutput = (text) => {
    accumulatedData.current += text;
    setOutputBuffer(prev => prev + text);
    processBuffer();
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const extractBaseUrl = (action) => {
    // Extract base URL from the action
    // action is like: /pun/dev/dor-hprc-drona-composer/jobs/composer/submit
    // we want: /pun/dev/dor-hprc-drona-composer/jobs/composer
    const match = action.match(/^(.+\/jobs\/composer)\//);
    if (match) {
      return match[1];
    }
    // Fallback - try to get from current URL
    const path = window.location.pathname;
    const composerMatch = path.match(/^(.+\/jobs\/composer)/);
    if (composerMatch) {
      return composerMatch[1];
    }
    // Last resort fallback
    return '/jobs/composer';
  };

  const startPolling = (jobId) => {
    stopPolling();
    
    const poll = async () => {
      try {
        const url = `${baseUrl.current}/ws-job-output/${jobId}/${outputPosition.current}`;
        console.log('[DEBUG] Polling URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('[DEBUG] Poll response not ok:', response.status);
          return;
        }
        
        const data = await response.json();
        console.log('[DEBUG] Poll data:', data);
        
        if (data.new_output) {
          appendOutput(data.new_output);
          outputPosition.current = data.total_length;
        }
        
        // Check if job is complete
        if (data.status === 'completed') {
          appendOutput('\nJob completed successfully.\n');
          setStatus('completed');
          stopPolling();
          setIsConnected(false);
        } else if (data.status === 'failed') {
          appendOutput(`\nJob failed with exit code ${data.exit_code || 1}\n`);
          setStatus('failed');
          stopPolling();
          setIsConnected(false);
        } else if (data.status === 'error') {
          appendOutput('\nJob encountered an error.\n');
          setStatus('error');
          stopPolling();
          setIsConnected(false);
        }
        
      } catch (error) {
        console.error('[DEBUG] Polling error:', error);
        // Continue polling on errors, don't stop
      }
    };
    
    // Start polling every 300ms
    pollInterval.current = setInterval(poll, 300);
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const sendInput = (inputText) => {
    console.warn('Input not supported in HTTP polling mode');
    return false;
  };

  const startHttpJob = async (bashCmd) => {
    try {
      const url = `${baseUrl.current}/ws-start-job`;
      console.log('[DEBUG] Starting job URL:', url);
      console.log('[DEBUG] Bash command:', bashCmd);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ bash_cmd: bashCmd })
      });

      console.log('[DEBUG] Start job response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Start job error response:', errorText);
        appendOutput(`\nError starting job: ${response.status}\n`);
        setStatus('error');
        return;
      }

      const data = await response.json();
      console.log('[DEBUG] Start job response data:', data);
      
      if (data.job_id) {
        currentJobId.current = data.job_id;
        appendOutput('Job process started.\n');
        setStatus('running');
        setIsConnected(true);
        
        // Start polling for output
        startPolling(data.job_id);
      } else {
        appendOutput(`\nError: No job ID returned\n`);
        setStatus('error');
      }
      
    } catch (error) {
      console.error('[DEBUG] Start job error:', error);
      appendOutput(`\nConnection error: ${error.message}\n`);
      setStatus('error');
    }
  };

  const submitJob = (action, formData) => {
    console.log('[DEBUG] Submit job called with action:', action);
    
    // Extract and store the base URL from the action
    baseUrl.current = extractBaseUrl(action);
    console.log('[DEBUG] Extracted base URL:', baseUrl.current);
    
    // Reset state
    accumulatedData.current = 'Starting job submission...\n';
    setOutputBuffer('Starting job submission...\n');
    setProcessedLines(['Starting job submission...\n']);
    setHtmlOutput(ansiUp.current.ansi_to_html('Starting job submission...\n'));
    setStatus('submitting');
    outputPosition.current = 0;
    
    try {
      // First, submit the job via your existing form endpoint
      const initialRequest = new XMLHttpRequest();
      initialRequest.open("POST", action, true);
      initialRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      initialRequest.responseType = "json";

      initialRequest.onreadystatechange = function() {
        if (initialRequest.readyState === 4) {
          console.log('[DEBUG] Initial request status:', initialRequest.status);
          console.log('[DEBUG] Initial request response:', initialRequest.response);
          
          if (initialRequest.status === 200 && initialRequest.response && initialRequest.response.bash_cmd) {
            // Now start the job via HTTP
            startHttpJob(initialRequest.response.bash_cmd);
          } else {
            appendOutput(`\nError starting the job: ${initialRequest.status}\n`);
            setStatus('error');
          }
        }
      };

      initialRequest.onerror = function() {
        console.error('[DEBUG] Initial request error');
        appendOutput('\nConnection error during job submission.\n');
        setStatus('error');
      };

      initialRequest.send(formData);
      
    } catch (error) {
      console.error('[DEBUG] Submit job error:', error);
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
      console.log('[DEBUG] Reset called');
      stopPolling();
      accumulatedData.current = 'Starting job submission...\n';
      setOutputBuffer('Starting job submission...\n');
      setProcessedLines(['Starting job submission...\n']);
      setHtmlOutput(ansiUp.current.ansi_to_html('Starting job submission...\n'));
      setStatus(null);
      currentJobId.current = null;
      outputPosition.current = 0;
      setIsConnected(false);
      baseUrl.current = '';
    }
  };
}
