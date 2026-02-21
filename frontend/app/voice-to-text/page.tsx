'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function VoiceToTextPage() {
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/m4a', 'audio/x-m4a'];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|mp4|m4a|webm|mpeg|mpga)$/i)) {
        setError('Format not supported. Use: mp3, wav, mp4, m4a or webm');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError('File too large. Maximum: 25MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleTranscribeFile = async () => {
    if (!selectedFile) {
      setError('Select an audio file');
      return;
    }
    setError(null);
    setIsLoading(true);
    setText('');
    setTranslatedText('');
    try {
      const result = await api.transcribeAudio(selectedFile, { language: 'en' });
      setText(result.text || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error transcribing');
      setText('');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    setText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setSelectedFile(file);
        setIsLoading(true);
        setTranslatedText('');
        try {
          const result = await api.transcribeAudio(file, { language: 'en' });
          setText(result.text || '');
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Error transcribing');
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError('Microphone permission denied or unavailable');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranslateToPortuguese = async () => {
    if (!text) return;
    setError(null);
    setIsTranslating(true);
    setTranslatedText('');
    try {
      const result = await api.sendChatMessage([
        {
          role: 'user',
          content: `Translate the following text to Portuguese. Output only the translation, nothing else:\n\n${text}`,
        },
      ]);
      setTranslatedText(result.message?.trim() || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error translating');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Voice-to-Text</h1>
          <p className="mt-2 text-gray-600">
            Record or upload audio and transcribe to text with OpenAI Whisper.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Record audio</h2>
            <div className="flex gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <span className="w-3 h-3 bg-white rounded-full" />
                  Start recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 animate-pulse"
                >
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  Stop recording
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Or upload file</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 cursor-pointer">
                <span className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600 hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors">
                  {selectedFile ? selectedFile.name : 'Click to select audio (mp3, wav, m4a...)'}
                </span>
                <input
                  type="file"
                  accept=".mp3,.wav,.mp4,.m4a,.webm,.mpeg,.mpga"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleTranscribeFile}
                disabled={!selectedFile || isLoading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                {isLoading ? 'Transcribing...' : 'Transcribe'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {text && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Transcribed text</h2>
                <button
                  onClick={handleTranslateToPortuguese}
                  disabled={isTranslating}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isTranslating ? 'Translating...' : 'Translate to Portuguese'}
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap min-h-[120px]">
                {text}
              </div>
              {translatedText && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Portuguese translation</h3>
                  <div className="p-4 bg-emerald-50 rounded-lg text-gray-800 whitespace-pre-wrap">
                    {translatedText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
