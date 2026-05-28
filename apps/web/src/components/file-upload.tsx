'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Image, File, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface UploadResult {
  success: boolean;
  importId?: string;
  fileName: string;
  message: string;
  status?: string;
  isBankStatement?: boolean;
}

interface UploadComponentProps {
  caseId: string;
  onUploadComplete?: () => void;
  redFlagId?: string;
}

const ACCEPTED_BANK_FORMATS = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
];

const ACCEPTED_EVIDENCE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUploadComponent({ caseId, onUploadComplete, redFlagId }: UploadComponentProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const isValidFileType = (file: File): boolean => {
    return ACCEPTED_BANK_FORMATS.includes(file.type) || 
           ACCEPTED_EVIDENCE_FORMATS.includes(file.type) ||
           file.name.endsWith('.csv') ||
           file.name.endsWith('.xlsx') ||
           file.name.endsWith('.pdf') ||
           file.name.endsWith('.jpg') ||
           file.name.endsWith('.jpeg') ||
           file.name.endsWith('.png');
  };

  const isValidFileSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  const isBankStatement = (file: File): boolean => {
    const bankExtensions = ['.csv', '.xlsx', '.xls'];
    return bankExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) ||
           ACCEPTED_BANK_FORMATS.slice(0, 3).includes(file.type);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (!isValidFileType(file)) {
        return false;
      }
      if (!isValidFileSize(file)) {
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        // Initialize progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Simulate progress for now (in real app, use XMLHttpRequest for progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[file.name] || 0;
            if (current < 90) {
              return { ...prev, [file.name]: current + 10 };
            }
            return prev;
          });
        }, 200);

        const formData = new FormData();
        formData.append('file', file);
        if (redFlagId) {
          formData.append('redFlagId', redFlagId);
        }

        // Check if this is a bank statement upload
        const isBankFile = isBankStatement(file);

        let endpoint = '/api/v1/cases/${caseId}/evidence';
        if (isBankFile) {
          endpoint = '/api/v1/cases/${caseId}/import';  // Use existing import endpoint
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
        
        const response = await fetch(endpoint.replace('${caseId}', caseId), {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });

        clearInterval(progressInterval);

        const data = await response.json();

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        if (response.ok) {
          results.push({
            success: true,
            importId: data.id,
            fileName: file.name,
            message: isBankFile 
              ? 'Bank statement uploaded. Routing to mapping...' 
              : 'Evidence file uploaded successfully',
            status: data.status,
            isBankStatement: isBankFile,
          });
        } else {
          results.push({
            success: false,
            fileName: file.name,
            message: data.message || 'Upload failed',
          });
        }
      } catch (error) {
        results.push({
          success: false,
          fileName: file.name,
          message: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    setUploadResults(results);
    setFiles([]);
    setIsUploading(false);

    // Call callback if provided
    if (onUploadComplete) {
      onUploadComplete();
    }

    // Auto-navigate to mapping for bank statement imports
    const bankImport = results.find(r => r.success && r.isBankStatement);
    if (bankImport?.importId) {
      setTimeout(() => {
        router.push(`/cases/${caseId}/imports/${bankImport.importId}`);
      }, 1500);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type === 'application/pdf') return FileText;
    return File;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Files
        </CardTitle>
        <CardDescription>
          Upload bank statements (CSV, XLSX, PDF) or evidence files (images, PDFs)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or
          </p>
          <label className="cursor-pointer">
            <span className="text-primary hover:underline">browse files</span>
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted-foreground mt-4">
            CSV, XLSX, PDF, JPG, PNG • Max 50MB per file
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Files to upload ({files.length})</h4>
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file);
              const progress = uploadProgress[file.name] || 0;
              
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {isBankStatement(file) ? 'Bank Statement' : 'Evidence'}
                    </p>
                    {progress > 0 && progress < 100 && (
                      <Progress value={progress} className="h-1 mt-2" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button 
            onClick={uploadFiles} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Upload Results</h4>
            {uploadResults.map((result, index) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {result.success ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.fileName}
                  </p>
                  <p className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.message}
                  </p>
                </div>
                {result.success && result.isBankStatement && result.importId && (
                  <Link href={`/cases/${caseId}/imports/${result.importId}`}>
                    <Button size="sm" variant="outline">
                      Continue Mapping
                    </Button>
                  </Link>
                )}
                {result.status && (
                  <Badge variant="outline">{result.status.replace(/_/g, ' ')}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FileUploadComponent;
