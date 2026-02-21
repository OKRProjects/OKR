'use client';

import { useState, useRef, useEffect } from 'react';
import { getCurrentUser, login } from '@/lib/auth';
import { api } from '@/lib/api';
import DashboardShell from '@/components/DashboardShell';
import { Mic, MicOff, ImagePlus, Volume2, Send, Video } from 'lucide-react';

const MAX_VIDEO_SECONDS = 20;

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.mpeg', '.mpeg4'];
function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const name = (file.name || '').toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load video'));
    };
    video.src = url;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const TTS_VOICES = [
  // OpenAI
  { id: 'alloy', label: 'Alloy' },
  { id: 'ash', label: 'Ash' },
  { id: 'ballad', label: 'Ballad' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'coral', label: 'Coral' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'marin', label: 'Marin' },
  { id: 'nova', label: 'Nova' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'sage', label: 'Sage' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'verse', label: 'Verse' },
  // Magic Hour
  { id: 'Elon Musk', label: 'Elon Musk' },
  { id: 'Morgan Freeman', label: 'Morgan Freeman' },
  { id: 'Joe Rogan', label: 'Joe Rogan' },
  { id: 'Barack Obama', label: 'Barack Obama' },
  { id: 'Donald Trump', label: 'Donald Trump' },
  { id: 'Joe Biden', label: 'Joe Biden' },
  { id: 'Taylor Swift', label: 'Taylor Swift' },
  { id: 'Samuel L. Jackson', label: 'Samuel L. Jackson' },
  { id: 'David Attenborough', label: 'David Attenborough' },
  { id: 'Kanye West', label: 'Kanye West' },
  { id: 'Kim Kardashian', label: 'Kim Kardashian' },
  { id: 'James Earl Jones', label: 'James Earl Jones' },
  { id: 'Jeff Goldblum', label: 'Jeff Goldblum' },
  { id: 'Marilyn Monroe', label: 'Marilyn Monroe' },
  { id: 'Albert Einstein', label: 'Albert Einstein' },
] as const;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  isVideo?: boolean;
  videoDuration?: number;
}

export default function ChatPage() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI assistant. You can speak, type, or attach images. Enable "Speak response" to hear my replies.' },
  ]);
  const [text, setText] = useState('');
  const [chatMode, setChatMode] = useState<'assistant' | 'roast'>('assistant');
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<{ file: File; preview: string; duration: number } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('coral');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u)).catch(() => login());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const SILENCE_THRESHOLD = 15;
  const SILENCE_DURATION_MS = 1500;
  const MIN_RECORDING_MS = 800;
  const VAD_CHECK_INTERVAL_MS = 100;

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (vadIntervalRef.current) {
          clearInterval(vadIntervalRef.current);
          vadIntervalRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        await sendPipeline({ audio: file });
      };
      mr.start();
      setIsRecording(true);

      // Voice Activity Detection: auto-stop when user stops talking
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastLoudTime = Date.now();
      const startTime = Date.now();

      vadIntervalRef.current = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > SILENCE_THRESHOLD) lastLoudTime = Date.now();
        const elapsed = Date.now() - startTime;
        const silentFor = Date.now() - lastLoudTime;
        if (elapsed >= MIN_RECORDING_MS && silentFor >= SILENCE_DURATION_MS) {
          stopRecording();
        }
      }, VAD_CHECK_INTERVAL_MS);
    } catch {
      setError('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    // Use recorder state (not isRecording) so VAD interval can stop recording — avoids stale closure
    if (mediaRecorderRef.current?.state === 'recording') {
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setVideoError(null);
    const file = files[0];
    const isVideo = isVideoFile(file);
    if (isVideo) {
      setVideoError(null);
      getVideoDuration(file)
        .then((duration) => {
          if (duration > MAX_VIDEO_SECONDS) {
            setVideoError(`Video must be ${MAX_VIDEO_SECONDS}s or less (this one is ${duration.toFixed(1)}s).`);
            return;
          }
          setAttachedVideo({ file, preview: URL.createObjectURL(file), duration });
          setAttachedImages([]);
        })
        .catch(() => {
          setAttachedVideo({ file, preview: URL.createObjectURL(file), duration: 0 });
          setAttachedImages([]);
        });
      e.target.value = '';
      return;
    }
    if (attachedVideo) setAttachedVideo(null);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      setAttachedImages((prev) => [...prev, { file: f, preview: URL.createObjectURL(f) }]);
    }
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setAttachedImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const removeVideo = () => {
    if (attachedVideo) {
      URL.revokeObjectURL(attachedVideo.preview);
      setAttachedVideo(null);
      setVideoError(null);
    }
  };

  const sendPipeline = async (overrides?: { audio?: File; text?: string }) => {
    const inputText = (overrides?.text ?? text).trim();
    const audio = overrides?.audio;
    const images = attachedImages.map((x) => x.file);
    const video = attachedVideo?.file;

    const hasMedia = images.length > 0 || !!video;
    if (!inputText && !audio && !hasMedia) return;

    const userContent = inputText || (audio ? '(Voice message)' : video ? '(See video)' : '(Image attached)');
    const userMsg: Message = { role: 'user', content: userContent };
    if (video) {
      userMsg.isVideo = true;
      userMsg.videoDuration = attachedVideo?.duration;
    }
    setMessages((prev) => [...prev, userMsg]);
    setText('');
    setAttachedImages([]);
    const currentVideo = attachedVideo;
    setAttachedVideo(null);
    setVideoError(null);
    setIsLoading(true);
    setError(null);

    try {
      const prevMessages = messages;
      const apiMessages = [
        ...prevMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: inputText || (audio ? '(Voice message)' : currentVideo ? '(See video)' : '(See image)') },
      ];

      // Voice messages use pipeline (STT + chat + TTS). Text/images/video use same API as popout chat.
      if (audio) {
        const pipelineMessages = apiMessages.slice(0, -1);
        const result = await api.chatPipeline({
          audio,
          text: inputText || undefined,
          images: images.length ? images : undefined,
          video: currentVideo?.file,
          messages: pipelineMessages,
          tts: ttsEnabled,
          voice: ttsVoice,
          mode: chatMode,
        });
        const assistantMsg: Message = {
          role: 'assistant',
          content: result.message || 'No response.',
        };
        if (result.audio_base64) {
          const format = result.audio_format === 'wav' ? 'wav' : 'mpeg';
          assistantMsg.audioUrl = `data:audio/${format};base64,${result.audio_base64}`;
        }
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'user' && result.transcribed_text) {
            next[lastIdx] = { ...next[lastIdx], content: result.transcribed_text };
          }
          return [...next, assistantMsg];
        });
      } else {
        let imagesBase64: string[] | undefined;
        let videoBase64: string | undefined;
        let videoMime: string | undefined;
        if (currentVideo) {
          videoBase64 = await fileToBase64(currentVideo.file);
          const f = currentVideo.file;
          videoMime = f.type?.startsWith('video/') ? f.type : (f.name?.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
        } else if (images.length > 0) {
          imagesBase64 = await Promise.all(images.map((f) => fileToBase64(f)));
        }
        const result = await api.sendChatMessage(
          apiMessages,
          'openai/gpt-3.5-turbo',
          imagesBase64,
          chatMode,
          videoBase64,
          videoMime
        );
        setMessages((prev) => [...prev, { role: 'assistant', content: result.message || 'No response.' }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPipeline({ text });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E1117] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="flex flex-col max-w-4xl mx-auto w-full">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-1">Chat Pipeline</h2>
          <p className="text-gray-400 text-sm">
            Voice, text, images, or video → AI response → optional speech
          </p>
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mt-2 w-fit">
            <button
              type="button"
              onClick={() => { setChatMode('assistant'); if (attachedVideo) removeVideo(); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${chatMode === 'assistant' ? 'bg-[#4F8CFF] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Assistant
            </button>
            <button
              type="button"
              onClick={() => setChatMode('roast')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${chatMode === 'roast' ? 'bg-[#4F8CFF] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Roast
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 min-h-[320px]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  m.role === 'user'
                    ? 'bg-[#4F8CFF]/20 text-white'
                    : 'bg-white/10 text-gray-200'
                }`}
              >
                {m.isVideo && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <Video className="w-4 h-4" />
                    Video{m.videoDuration != null ? ` (${m.videoDuration.toFixed(1)}s)` : ''}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.audioUrl && (
                  <audio controls src={m.audioUrl} className="mt-2 w-full max-w-xs" />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {(error || videoError) && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error || videoError}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {attachedVideo && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <Video className="w-5 h-5 text-[#4F8CFF]" />
                <span className="text-sm">Video ({attachedVideo.duration.toFixed(1)}s)</span>
              </div>
              <button type="button" onClick={removeVideo} className="p-1.5 bg-red-500/80 rounded-lg hover:bg-red-500">×</button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!attachedVideo && attachedImages.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img.preview}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`p-3 rounded-lg ${isRecording ? 'bg-red-500/30' : 'bg-white/10 hover:bg-white/20'}`}
              title={isRecording ? 'Stop recording' : 'Record voice'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20"
              title="Attach image or video"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime,video/mpeg,.mov,.mp4,.webm,.mpeg"
              multiple={!attachedVideo}
              className="hidden"
              onChange={handleImageSelect}
            />

            <button
              type="button"
              onClick={() => setTtsEnabled((v) => !v)}
              className={`p-3 rounded-lg ${ttsEnabled ? 'bg-emerald-500/30' : 'bg-white/10 hover:bg-white/20'}`}
              title="Speak response"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {ttsEnabled && (
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8CFF]"
                title="TTS voice"
              >
                {TTS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={chatMode === 'roast' ? 'Attach image or video ≤20s (optional caption)' : 'Type a message...'}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#4F8CFF]"
            />

            <button
              type="submit"
              disabled={isLoading || (!text.trim() && attachedImages.length === 0 && !attachedVideo)}
              className="p-3 rounded-lg bg-[#4F8CFF] hover:bg-[#6BA0FF] disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {chatMode === 'roast' && 'Roast: image or video (MOV, MP4, WebM; max 20s). '}
            {ttsEnabled ? `✓ Voice: ${TTS_VOICES.find((v) => v.id === ttsVoice)?.label || ttsVoice}` : 'Enable speaker icon to hear responses'}
            {' • '}Press mic to speak — auto-sends when you stop talking
          </p>
        </form>
      </div>
    </DashboardShell>
  );
}
