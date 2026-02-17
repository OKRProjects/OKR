'use client';

import { useState, FormEvent } from 'react';
import { api, KeyResult } from '@/lib/api';

interface KeyResultFormProps {
  objectiveId: string;
  keyResult?: KeyResult;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function KeyResultForm({ objectiveId, keyResult, onSuccess, onCancel }: KeyResultFormProps) {
  const [title, setTitle] = useState(keyResult?.title ?? '');
  const [target, setTarget] = useState(keyResult?.target ?? '');
  const [currentValue, setCurrentValue] = useState(keyResult?.currentValue ?? '');
  const [unit, setUnit] = useState(keyResult?.unit ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (keyResult?._id) {
        await api.updateKeyResult(keyResult._id, { title, target, currentValue, unit });
      } else {
        await api.createKeyResult({ objectiveId, title, target, currentValue, unit });
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save key result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Key Result Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 100% or 5 deployments"
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="%, count, etc."
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Current Value</label>
        <input
          type="text"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : keyResult ? 'Update' : 'Add Key Result'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
