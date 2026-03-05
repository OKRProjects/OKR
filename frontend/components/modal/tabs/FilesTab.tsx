'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type Objective, type KeyResult, type Attachment } from '@/lib/api';
import { FileText, Image, File, Upload, Trash2, Download } from 'lucide-react';

interface FilesTabProps {
  objective: Objective;
  keyResults: KeyResult[];
  readOnly?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

function isPdfType(type: string): boolean {
  return type === 'application/pdf' || type === 'application/pdf';
}

export function FilesTab({ objective, keyResults, readOnly }: FilesTabProps) {
  const objectiveId = objective._id;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedKrId, setSelectedKrId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);

  const load = useCallback(async () => {
    if (!objectiveId) return;
    setLoading(true);
    try {
      const list = await api.getAttachments(objectiveId);
      setAttachments(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [objectiveId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!objectiveId || !files?.length || readOnly || uploading) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await api.createAttachment({
          objectiveId,
          keyResultId: selectedKrId || undefined,
          file: files[i],
        });
      }
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    if (readOnly) return;
    try {
      await api.deleteAttachment(id);
      await load();
      if (preview?._id === id) setPreview(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <p className="text-sm text-muted-foreground">
            Attach files to this objective or to a specific key result.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Associate with:</span>
                <Select
                  value={selectedKrId ?? 'objective'}
                  onValueChange={(v) => setSelectedKrId(v === 'objective' ? null : v)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Objective" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objective">This objective</SelectItem>
                    {keyResults.map((kr) => (
                      <SelectItem key={kr._id} value={kr._id!}>
                        {kr.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop files here, or click to browse.
                </p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {uploading ? 'Uploading…' : 'Choose files'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((att) => (
                <Card key={att._id} className="overflow-hidden">
                  <div
                    className="aspect-video bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => setPreview(att)}
                  >
                    {isImageType(att.fileType) ? (
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground">
                        {isPdfType(att.fileType) ? (
                          <FileText className="h-12 w-12" />
                        ) : (
                          <File className="h-12 w-12" />
                        )}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate" title={att.fileName}>
                      {att.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(att.fileSize)} · {formatDate(att.uploadedAt)}
                    </p>
                    {att.keyResultId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Key result: {keyResults.find((k) => k._id === att.keyResultId)?.title ?? att.keyResultId}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => att._id && handleDelete(att._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-card rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 flex justify-between items-center border-b">
              <span className="font-medium truncate">{preview.fileName}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={preview.url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" /> Download
                  </a>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              {isImageType(preview.fileType) ? (
                <img src={preview.url} alt={preview.fileName} className="max-w-full max-h-[80vh] object-contain" />
              ) : isPdfType(preview.fileType) ? (
                <iframe src={preview.url} title={preview.fileName} className="w-full h-[80vh]" />
              ) : (
                <p className="text-muted-foreground">
                  Preview not available. <a href={preview.url} target="_blank" rel="noopener noreferrer" className="underline">Download</a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
