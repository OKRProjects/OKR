'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'ash', label: 'Ash' },
  { id: 'coral', label: 'Coral' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'nova', label: 'Nova' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'sage', label: 'Sage' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'marin', label: 'Marin' },
] as const;

export default function TextToVoicePage() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voice, setVoice] = useState('coral');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Enter text to convert to speech');
      return;
    }
    if (trimmed.length > 4096) {
      setError('Text too long. Maximum: 4096 characters');
      return;
    }

    setError(null);
    setIsLoading(true);
    setAudioUrl(null);

    // Revoke previous URL if any
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const blob = await api.textToSpeech(trimmed, { voice });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating speech');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Text-to-Voice</h1>
          <p className="mt-2 text-gray-600">
            Enter text and convert it to spoken audio with OpenAI TTS.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
              Text to convert
            </label>
            <textarea
              id="text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to convert to speech..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">{text.length} / 4096 characters</p>
          </div>

          <div>
            <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
              Voice
            </label>
            <select
              id="voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || !text.trim()}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate speech'}
          </button>

          {audioUrl && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Generated audio</h2>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
              />
              <p className="mt-2 text-xs text-gray-500">
                AI-generated voice. Not a human voice.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
