import { useState, useRef, useEffect } from 'react';
import { SonioxClient } from '@soniox/speech-to-text-web';
import { getTemporaryApiKey } from '../lib/soniox';
import '../styles/VoiceInput.css';

export default function VoiceInput({ textareaRef, disabled = false, onTranscriptUpdate = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const sonioxClientRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const inactivityTimerRef = useRef(null);
  const isStartingRef = useRef(false);
  const lastStartClickTimeRef = useRef(0);
  const initialContentRef = useRef(''); // Store content before recording starts
  const DEBOUNCE_MS = 1000; // Prevent clicks within 1 second

  // This is now handled by onTranscriptUpdate callback during recording
  // No need for insertTranscriptAtEnd since we update live
  const insertTranscriptAtEnd = () => {
    // If onTranscriptUpdate is provided, it already updated state
    // Nothing more needed
  };

  // Properly close and cleanup connection
   const closeConnection = () => {
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Close Soniox connection
    if (sonioxClientRef.current) {
      try {
        console.log('[VoiceInput] Stopping Soniox...');
        sonioxClientRef.current.stop();
      } catch (err) {
        console.error('[VoiceInput] Error closing connection:', err);
      }
      // CRITICAL: Explicitly null the ref to prevent double connections
      sonioxClientRef.current = null;
      console.log('[VoiceInput] ✓ Soniox stopped & cleaned up');
    }
  };

  const handleStartRecording = async () => {
     // CRITICAL: Debounce rapid clicks (prevent double-click)
     // Date.now() is safe in event handlers
     const now = Date.now();
    if (now - lastStartClickTimeRef.current < DEBOUNCE_MS) {
      return;
    }
    lastStartClickTimeRef.current = now;

    // CRITICAL: Prevent multiple simultaneous connection attempts
    if (isStartingRef.current || isRecording || sonioxClientRef.current) {
      return;
    }

    isStartingRef.current = true;
    setError(''); // Clear previous errors
    setIsProcessing(true);
    transcriptBufferRef.current = '';
    
    // Store current content to preserve it
    initialContentRef.current = textareaRef.current?.value || '';

    try {
      const apiKey = await getTemporaryApiKey();

      sonioxClientRef.current = new SonioxClient({
        apiKey,
        keepAlive: true, // Prevent connection timeout during pauses
        keepAliveInterval: 5000, // Send keepalive every 5 seconds
        onStarted: () => {
          isStartingRef.current = false;
          setIsProcessing(false);
          setIsRecording(true);
          
          // Reset 30-second inactivity timer on each successful start
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
          }
          inactivityTimerRef.current = setTimeout(() => {
            closeConnection();
            setIsRecording(false);
          }, 30000);
        },
        onPartialResult: (result) => {
          // RESET 30-second timeout on each new token (keeps connection alive while talking)
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
          }
          inactivityTimerRef.current = setTimeout(() => {
            console.log('[VoiceInput] 30 seconds of no new tokens, auto-closing...');
            closeConnection();
            setIsRecording(false);
          }, 30000);

          // Accumulate ONLY final tokens to buffer
          if (result.tokens && result.tokens.length > 0) {
            let finalTokensThisBatch = '';
            result.tokens.forEach((token) => {
              if (token.is_final) {
                finalTokensThisBatch += token.text;
              }
            });
            // Add new final tokens to buffer (accumulate, don't replace)
            if (finalTokensThisBatch.length > 0) {
              transcriptBufferRef.current += finalTokensThisBatch;
              // LIVE UPDATE: Show transcript while talking (APPEND to existing content)
              if (onTranscriptUpdate) {
                const space = initialContentRef.current.length > 0 ? ' ' : '';
                const fullContent = initialContentRef.current + space + transcriptBufferRef.current;
                onTranscriptUpdate(fullContent);
              }
            }
          }
        },
        onFinished: () => {
          console.log('[VoiceInput] ✓ Soniox onFinished callback received');
          if (transcriptBufferRef.current.trim()) {
            insertTranscriptAtEnd(transcriptBufferRef.current);
          }
          // CRITICAL: Close connection properly
          closeConnection();
          setIsRecording(false);
          transcriptBufferRef.current = '';
        },
        onError: (status, message) => {
          console.error('[VoiceInput] Error:', message);
          setError(`Recording error: ${message}`);
          // CRITICAL: Close connection on error
          closeConnection();
          setIsRecording(false);
          setIsProcessing(false);
          // Auto-clear error after 5 seconds
          setTimeout(() => setError(''), 5000);
        },
      });

      await sonioxClientRef.current.start({
        model: 'stt-rt-preview',
        language_hints: ['en', 'te'], // English first, then Telugu (order matters for priority)
        enable_language_identification: true, // Auto-detect language
      });
    } catch (err) {
      console.error('[VoiceInput] Failed to start:', err);
      setError(err.message || 'Failed to start recording');
      setIsProcessing(false);
      // CRITICAL: Close connection on startup failure
      closeConnection();
      isStartingRef.current = false;
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
      }
      };

  const handleStopRecording = async () => {
    // CRITICAL: Debounce stop clicks too
    const now = Date.now();
    if (now - lastStartClickTimeRef.current < DEBOUNCE_MS) {
      return;
    }
    lastStartClickTimeRef.current = now;

    console.log('[VoiceInput] Stop button clicked - calling closeConnection()');
    // CRITICAL: Use unified closeConnection function
    closeConnection();
    setIsRecording(false);
    };

  // Cleanup on unmount - CRITICAL for preventing connection leaks
  useEffect(() => {
    return () => {
      // Close connection and clear timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (sonioxClientRef.current) {
        try {
          sonioxClientRef.current.cancel();
        } catch (err) {
          console.error('[VoiceInput] Unmount error:', err);
        }
        sonioxClientRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className={`voice-mic-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        disabled={disabled || (isProcessing && !isRecording)}
        title={isRecording ? 'Stop recording' : 'Start recording (debounced 1s)'}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isRecording ? (
            <>
              <circle cx="12" cy="12" r="9" className="recording-circle" />
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>

      {error && <div className="voice-error">{error}</div>}
    </>
  );
}
