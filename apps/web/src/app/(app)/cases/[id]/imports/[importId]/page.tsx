'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, FileText, Table, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { ColumnMapping, MappingPreview, ConfirmMappingRequest } from '@/types/import';
import { TARGET_FIELDS } from '@/types/import';

interface MappingPageProps {
  params: {
    id: string;
    importId: string;
  };
}

export default function ImportMappingPage({ params }: MappingPageProps) {
  const [mapping, setMapping] = useState<MappingPreview | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [skipHeader, setSkipHeader] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load mapping preview
  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/v1/cases/${params.id}/imports/${params.importId}/mapping-preview`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load mapping preview');
      }
      
      const data: MappingPreview = await response.json();
      setMapping(data);
      setColumnMappings(data.suggestedMapping || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.importId]);

  // Handle column mapping change
  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => {
      // Remove existing mapping for this target
      const filtered = prev.filter(m => m.targetField !== targetField);
      
      if (sourceColumn && sourceColumn !== 'none') {
        return [...filtered, { sourceColumn, targetField }];
      }
      
      return filtered;
    });
  };

  // Get current mapping for a target field
  const getCurrentMapping = (targetField: string): string => {
    const mappingItem = columnMappings.find(m => m.targetField === targetField);
    return mappingItem?.sourceColumn || '';
  };

  // Check if required fields are mapped
  const isMappingComplete = (): boolean => {
    if (!mapping) return false;
    return mapping.requiredFields.every(field => 
      columnMappings.some(m => m.targetField === field)
    );
  };

  // Confirm mapping and start import
  const confirmMapping = async () => {
    if (!isMappingComplete()) {
      setError('Please map all required fields before confirming');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const request: ConfirmMappingRequest = {
        columns: columnMappings,
        skipHeader,
      };

      const response = await fetch(
        `/api/v1/cases/${params.id}/imports/${params.importId}/confirm-mapping`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to confirm mapping');
      }

      setResult({
        success: true,
        message: data.message || 'Import completed successfully',
      });
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Get file type label
  const getFileTypeLabel = (type: string): string => {
    switch (type) {
      case 'csv': return 'CSV File';
      case 'xlsx': return 'Excel File';
      case 'pdf': return 'PDF (Text)';
      case 'ocr': return 'PDF (OCR)';
      default: return 'Unknown';
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXTRACTED_TEXT':
      case 'NEEDS_MANUAL_MAPPING':
        return 'warning';
      case 'MAPPING_CONFIRMED':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/cases/${params.id}/transactions`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import Column Mapping</h1>
          <p className="text-muted-foreground">
            Review and map columns before importing transactions
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {result && (
        <Card className={result.success ? 'border-green-500' : 'border-destructive'}>
          <CardContent className="flex items-center gap-2 pt-6">
            {result.success ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
            <p className="text-sm">{result.message}</p>
            {result.success && (
              <Link href={`/cases/${params.id}/transactions`}>
                <Button size="sm" variant="outline" className="ml-4">
                  View Transactions
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading preview...</span>
          </CardContent>
        </Card>
      )}

      {/* Mapping Preview */}
      {mapping && !result && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {mapping.fileType === 'pdf' || mapping.fileType === 'ocr' ? (
                  <FileText className="h-5 w-5" />
                ) : (
                  <Table className="h-5 w-5" />
                )}
                File Preview
              </CardTitle>
              <CardDescription>
                {mapping.fileName} - {getFileTypeLabel(mapping.fileType)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusBadge(mapping.status) as any}>
                  {mapping.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* File Info */}
              {mapping.isScanned && (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  This appears to be a scanned document. OCR text will be used for import.
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-md overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      {mapping.availableColumns.map((col, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.previewRows.slice(0, 10).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{rowIndex + 1}</td>
                        {mapping.availableColumns.map((col, colIndex) => (
                          <td key={colIndex} className="px-3 py-2">
                            {String(row[col] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {Math.min(10, mapping.previewRows.length)} of {mapping.totalRows} rows
              </p>
            </CardContent>
          </Card>

          {/* Right Column: Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Column Mapping</CardTitle>
              <CardDescription>
                Map source columns to transaction fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Warning Banner */}
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      Please verify mapping before import
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      These records will become forensic transaction records. Incorrect mapping 
                      may affect investigation accuracy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Skip Header Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipHeader"
                  checked={skipHeader}
                  onChange={(e) => setSkipHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="skipHeader" className="text-sm">
                  Skip header row
                </label>
              </div>

              {/* Required Fields */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-destructive">
                  Required Fields *
                </h3>
                {TARGET_FIELDS.filter(f => f.required).map(field => (
                  <div key={field.value} className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm">
                      {field.label}
                      <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={getCurrentMapping(field.value)}
                      onValueChange={(value) => handleMappingChange(value, field.value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Not mapped --</SelectItem>
                        {mapping.availableColumns.map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Optional Fields */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Optional Fields</h3>
                {TARGET_FIELDS.filter(f => !f.required).map(field => (
                  <div key={field.value} className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-sm">{field.label}</label>
                    <Select
                      value={getCurrentMapping(field.value)}
                      onValueChange={(value) => handleMappingChange(value, field.value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Not mapped --</SelectItem>
                        {mapping.availableColumns.map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Confirm Button */}
              <div className="pt-4 border-t">
                <Button
                  onClick={confirmMapping}
                  disabled={!isMappingComplete() || isConfirming}
                  className="w-full"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Confirm Mapping & Import'
                  )}
                </Button>
                {!isMappingComplete() && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Please map all required fields to continue
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Mapping Data */}
      {!mapping && !isLoading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No import data available</p>
              <Button onClick={loadPreview}>
                Load Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
