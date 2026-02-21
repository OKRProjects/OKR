'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';

type Message = { role: 'user' | 'assistant'; content: string };

const VOICES = [
  'alloy',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'shimmer',
] as const;

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function playBase64Audio(base64: string, format: 'mp3' | 'wav'): Promise<void> {
  return new Promise((resolve, reject) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    audio.play().catch(reject);
  });
}

export default function VoiceAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('coral');
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecognition, setHasRecognition] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBusyRef = useRef(false);
  const isPausedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const selectedVoiceRef = useRef(selectedVoice);
  const interimDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef('');
  const SEND_DEBOUNCE_MS = 1400;

  messagesRef.current = messages;
  isPausedRef.current = isPaused;
  selectedVoiceRef.current = selectedVoice;
  isBusyRef.current = status === 'processing' || status === 'speaking';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendToPipeline = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatus('processing');
    setError(null);
    const currentMessages = messagesRef.current;
    const voice = selectedVoiceRef.current;
    try {
      const response = await api.chatPipeline({
        text: text.trim(),
        messages: currentMessages,
        tts: true,
        voice,
        mode: 'assistant',
      });
      const assistantContent = response.message || 'I didn’t get that.';
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: assistantContent },
      ]);
      if (response.audio_base64 && response.audio_format) {
        setStatus('speaking');
        await playBase64Audio(response.audio_base64, response.audio_format);
      }
      setStatus('listening');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: `Error: ${msg}` },
      ]);
      setStatus('listening');
    }
  }, []);

  useEffect(() => {
    const Recognition = getSpeechRecognition();
    setHasRecognition(!!Recognition);
    if (!Recognition) {
      setStatus('error');
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isPausedRef.current || isBusyRef.current) return;
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result[0]?.transcript || '').trim();
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }
      const anyTranscript = (finalTranscript || interimTranscript).trim();
      if (anyTranscript) {
        lastTranscriptRef.current = finalTranscript || interimTranscript || lastTranscriptRef.current;
        setLiveTranscript(anyTranscript);
      }
      if (finalTranscript.trim()) {
        if (interimDebounceRef.current) {
          clearTimeout(interimDebounceRef.current);
          interimDebounceRef.current = null;
        }
        sendToPipeline(finalTranscript.trim());
        setLiveTranscript('');
        lastTranscriptRef.current = '';
        return;
      }
      if (interimTranscript.trim()) {
        if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
        interimDebounceRef.current = setTimeout(() => {
          interimDebounceRef.current = null;
          const toSend = (lastTranscriptRef.current || interimTranscript).trim();
          if (toSend && !isBusyRef.current && !isPausedRef.current) {
            sendToPipeline(toSend);
            setLiveTranscript('');
            lastTranscriptRef.current = '';
          }
        }, SEND_DEBOUNCE_MS);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed') {
        setStatus('idle');
        setError(
          'Microphone access was denied. Allow the mic for this site (click the lock or icon in the address bar → Site settings → Microphone → Allow), then click Start listening again.'
        );
        return;
      }
      setError(`Recognition: ${event.error}`);
    };

    recognition.onend = () => {
      if (!isPausedRef.current) {
        try {
          recognition.start();
        } catch {
          // already started or stopped
        }
      }
    };

    recognitionRef.current = recognition;
    // Don't auto-start: browsers require a user gesture (click) to allow microphone.
    // User must click "Start listening" to begin.

    return () => {
      if (interimDebounceRef.current) {
        clearTimeout(interimDebounceRef.current);
        interimDebounceRef.current = null;
      }
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [sendToPipeline]);

  const requestMic = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicAllowed(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission denied') || msg.includes('NotAllowedError')) {
        setError(
          'Microphone blocked. Use the lock icon in the address bar → Site settings → set Microphone to Allow, then reload and click again.'
        );
      } else if (msg.includes('secure') || msg.includes('SecureContext')) {
        setError('Chrome needs a secure page. Use http://localhost:3000 or HTTPS.');
      } else {
        setError(`Microphone error: ${msg}`);
      }
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setError(null);
    if (!micAllowed) {
      const ok = await requestMic();
      if (!ok) return;
    }
    setStatus('listening');
    setIsPaused(false);
    try {
      rec.start();
    } catch {
      setStatus('idle');
    }
  }, [micAllowed, requestMic]);

  const stopListening = useCallback(() => {
    setIsPaused(true);
    setStatus('idle');
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0E1117] text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">AI Voice Assistant</h1>
        <p className="text-gray-400 text-sm mb-4">
          Click Start listening. Your browser will ask for microphone access — choose <strong className="text-gray-300">Allow</strong>. Then speak and the assistant will reply with voice using the same AI pipeline as chat.
        </p>

        <details className="mb-6 text-sm text-gray-500 border border-white/10 rounded-lg bg-white/5">
          <summary className="px-4 py-2 cursor-pointer hover:text-gray-400 select-none">
            Why does Chrome keep blocking the mic?
          </summary>
          <ul className="px-4 py-3 space-y-1.5 list-disc list-inside text-gray-400">
            <li><strong className="text-gray-300">You chose “Block” before</strong> — Chrome remembers. Click the lock/info icon in the address bar → Site settings → Microphone → set to <strong>Allow</strong>, then reload the page.</li>
            <li><strong className="text-gray-300">Not a secure context</strong> — Use <code className="bg-white/10 px-1 rounded">http://localhost:3000</code> (localhost is allowed). If you use <code className="bg-white/10 px-1 rounded">http://127.0.0.1</code> or a network IP like <code className="bg-white/10 px-1 rounded">http://192.168.x.x</code>, Chrome may block the mic; switch to <code className="bg-white/10 px-1 rounded">localhost</code> or HTTPS.</li>
            <li><strong className="text-gray-300">OS or browser policy</strong> — In Windows: Settings → Privacy → Microphone, and ensure “Allow apps to access your microphone” is on and Chrome is allowed. At work, admin policies can block the mic.</li>
          </ul>
        </details>

        {/* Status & controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              status === 'listening'
                ? 'bg-[#4F8CFF]/20 border-[#4F8CFF]/50'
                : status === 'processing' || status === 'speaking'
                  ? 'bg-amber-500/20 border-amber-500/50'
                  : 'bg-white/5 border-white/10'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${
                status === 'listening'
                  ? 'bg-green-500 animate-pulse'
                  : status === 'processing' || status === 'speaking'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-gray-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-200">
              {status === 'listening' && 'Listening…'}
              {status === 'processing' && 'Thinking…'}
              {status === 'speaking' && 'Speaking…'}
              {status === 'idle' && (isPaused ? 'Paused' : 'Starting…')}
              {status === 'error' && 'Error'}
            </span>
          </div>
          {hasRecognition && (
            <button
              type="button"
              onClick={status === 'listening' ? stopListening : startListening}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                status === 'listening'
                  ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                  : 'bg-[#4F8CFF] text-white hover:bg-[#5A96FF]'
              }`}
            >
              {status === 'listening' ? 'Pause listening' : 'Start listening'}
            </button>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="voice" className="text-sm text-gray-400">Voice</label>
            <select
              id="voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#4F8CFF]"
            >
              {VOICES.map((v) => (
                <option key={v} value={v} className="bg-[#0E1117]">{v}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-2">
            <p>{error}</p>
            {error.includes('denied') && (
              <p className="text-gray-400 text-xs mt-2">
                If you’re on localhost, the mic should work in Chrome/Edge. Make sure no other app is blocking the microphone and that your OS allows the browser to use it.
              </p>
            )}
          </div>
        )}

        {/* Conversation */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col" style={{ minHeight: '320px' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ maxHeight: '50vh' }}>
            {messages.length === 0 && !liveTranscript && (
              <p className="text-gray-500 text-sm">Say something after starting the mic. The assistant will reply with voice.</p>
            )}
            {liveTranscript && (
              <p className="text-gray-400 text-sm italic">Hearing: &quot;{liveTranscript}&quot;</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#4F8CFF]/20 border border-[#4F8CFF]/30'
                      : 'bg-white/5 border border-white/10 text-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {!hasRecognition && (
          <p className="mt-4 text-amber-400/90 text-sm">
            Use Chrome or Edge for always-on voice. Safari and Firefox have limited support.
          </p>
        )}
      </div>
    </div>
  );
}
