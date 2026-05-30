'use client';

import { useState, useEffect } from 'react';
import { api, InvestigationNote, EvidenceFile, TimelineEntry, RedFlagDetails } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Paperclip, Clock, MessageSquare, AlertCircle, CheckCircle, FileIcon, User } from 'lucide-react';

interface InvestigationPanelProps {
  caseId: string;
  flagId: string;
}

const statusConfig = {
  OPEN: { color: 'bg-blue-100 text-blue-800', label: 'Open' },
  UNDER_REVIEW: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
  RESOLVED: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
  FALSE_POSITIVE: { color: 'bg-gray-100 text-gray-800', label: 'False Positive' },
};

const eventTypeLabels: Record<string, string> = {
  FLAG_CREATED: 'Flag Created',
  FLAG_REVIEWED: 'Flag Reviewed',
  FLAG_STATUS_CHANGED: 'Status Changed',
  FLAG_FEEDBACK_ADDED: 'Feedback Added',
  NOTE_ADDED: 'Note Added',
  EVIDENCE_ATTACHED: 'Evidence Attached',
  EVIDENCE_REMOVED: 'Evidence Removed',
  TRANSACTION_IMPORTED: 'Transaction Imported',
  TRANSACTION_EXAMINED: 'Transaction Examined',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InvestigationPanel({ caseId, flagId }: InvestigationPanelProps) {
  const [flag, setFlag] = useState<RedFlagDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'evidence'>('timeline');
  
  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  // Status form state
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchFlagDetails();
  }, [caseId, flagId]);

  const fetchFlagDetails = async () => {
    try {
      setIsLoading(true);
      const data = await api.getRedFlagDetails(caseId, flagId);
      setFlag(data);
      setNewStatus(data.status);
    } catch (err) {
      console.error('Failed to fetch flag details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    
    try {
      setIsAddingNote(true);
      await api.addNoteToRedFlag(caseId, flagId, {
        title: noteTitle,
        content: noteContent,
      });
      setNoteTitle('');
      setNoteContent('');
      fetchFlagDetails();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === flag?.status) return;
    
    try {
      await api.updateRedFlagStatus(caseId, flagId, newStatus);
      fetchFlagDetails();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!flag) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Flag not found</p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = statusConfig[flag.status as keyof typeof statusConfig] || statusConfig.OPEN;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Investigation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
              </SelectContent>
            </Select>
            {newStatus !== flag.status && (
              <Button size="sm" onClick={handleStatusChange}>
                Update Status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('timeline')}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Timeline ({flag.timeline?.length || 0})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('notes')}
        >
          <MessageSquare className="h-4 w-4 inline mr-2" />
          Notes ({flag.investigationNotes?.length || 0})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'evidence'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('evidence')}
        >
          <Paperclip className="h-4 w-4 inline mr-2" />
          Evidence ({flag.evidenceFiles?.length || 0})
        </button>
      </div>

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardContent className="p-0">
            {flag.timeline && flag.timeline.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border"></div>
                
                <div className="space-y-0">
                  {flag.timeline.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-4 p-4 pl-12">
                      <div className="absolute left-4 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {eventTypeLabels[entry.eventType] || entry.eventType}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {entry.description || entry.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {entry.user && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.user.name}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No timeline events yet
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add Note Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add Investigation Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Note title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
              <Textarea
                placeholder="Write your investigation notes here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleAddNote} 
                disabled={isAddingNote || !noteTitle.trim() || !noteContent.trim()}
              >
                {isAddingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </CardContent>
          </Card>

          {/* Notes List */}
          {flag.investigationNotes && flag.investigationNotes.length > 0 ? (
            <div className="space-y-3">
              {flag.investigationNotes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{note.title}</h4>
                      {note.author && (
                        <span className="text-xs text-muted-foreground">
                          {note.author.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No notes yet. Add the first investigation note above.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attached Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Evidence files linked to this red flag will appear here.
              </p>
              {flag.evidenceFiles && flag.evidenceFiles.length > 0 ? (
                <div className="space-y-2">
                  {flag.evidenceFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB • Uploaded by {file.uploadedBy?.name || 'Unknown'}
                        </p>
                      </div>
                      {file.category && (
                        <Badge variant="outline">{file.category}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No evidence attached yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}