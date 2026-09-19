'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/app/dashboard/LogoutButton';
import DocumentIntake from '@/components/workspace/DocumentIntake';

export interface LibraryDocument {
  id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
  operational_status: string;
  qualification_status: string | null;
  qualification_reason: string | null;
  document_type: string | null;
  created_at: string;
  total_pages: number;
  evaluated_pages_count?: number;
  recommended_action?: string;
  latest_run?: {
    id: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    last_error: string | null;
  } | null;
}

interface DocumentLibraryProps {
  userId: string;
  userEmail?: string | null;
}

type FilterTab = 'ALL' | 'READY' | 'PROCESSING' | 'REVIEW' | 'FAILED' | 'REJECTED';

export default function DocumentLibrary({ userId, userEmail }: DocumentLibraryProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Deletion state
  const [deletingDoc, setDeletingDoc] = useState<LibraryDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch all documents for this user
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/documents');
      if (!res.ok) return;
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch document library:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/documents/${deletingDoc.id}`, {
        method: 'DELETE'
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Storage deletion failed or DB deletion failed: keep document visible and show truthful error
        setDeleteError(data.error || `Deletion failed with status ${res.status}. Your document was not removed.`);
        return;
      }

      // Deletion succeeded on backend:
      // Remove from local React state
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Network error occurred while requesting deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: documents.length,
      READY: 0,
      PROCESSING: 0,
      REVIEW: 0,
      FAILED: 0,
      REJECTED: 0,
    };

    documents.forEach((doc) => {
      const opStatus = doc.operational_status?.toUpperCase() || doc.status?.toUpperCase();
      const qualStatus = doc.qualification_status?.toUpperCase();

      if (opStatus === 'COMPLETED' || opStatus === 'ANALYSIS_COMPLETE') {
        counts.READY++;
      } else if (qualStatus === 'AI_REJECTED' || opStatus === 'REJECTED') {
        counts.REJECTED++;
      } else if (qualStatus === 'AI_AMBIGUOUS' || opStatus === 'AMBIGUOUS') {
        counts.REVIEW++;
      } else if (opStatus === 'FAILED' || opStatus === 'ERROR') {
        counts.FAILED++;
      } else {
        // Any active extraction/analysis status
        counts.PROCESSING++;
      }
    });

    return counts;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Tab filter
      const opStatus = doc.operational_status?.toUpperCase() || doc.status?.toUpperCase();
      const qualStatus = doc.qualification_status?.toUpperCase();

      if (activeTab === 'READY') {
        if (opStatus !== 'COMPLETED' && opStatus !== 'ANALYSIS_COMPLETE') return false;
      } else if (activeTab === 'PROCESSING') {
        const isReady = opStatus === 'COMPLETED' || opStatus === 'ANALYSIS_COMPLETE';
        const isRejected = qualStatus === 'AI_REJECTED' || opStatus === 'REJECTED';
        const isReview = qualStatus === 'AI_AMBIGUOUS' || opStatus === 'AMBIGUOUS';
        const isFailed = opStatus === 'FAILED' || opStatus === 'ERROR';
        if (isReady || isRejected || isReview || isFailed) return false;
      } else if (activeTab === 'REVIEW') {
        if (qualStatus !== 'AI_AMBIGUOUS' && opStatus !== 'AMBIGUOUS') return false;
      } else if (activeTab === 'FAILED') {
        if (opStatus !== 'FAILED' && opStatus !== 'ERROR') return false;
      } else if (activeTab === 'REJECTED') {
        if (qualStatus !== 'AI_REJECTED' && opStatus !== 'REJECTED') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.original_filename.toLowerCase().includes(q);
        const matchesReason = (doc.qualification_reason || '').toLowerCase().includes(q);
        const matchesType = (doc.document_type || '').toLowerCase().includes(q);
        if (!matchesName && !matchesReason && !matchesType) return false;
      }

      return true;
    });
  }, [documents, activeTab, searchQuery]);

  // Format relative timestamp
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleUploadComplete = (documentId: string) => {
    setIsUploadModalOpen(false);
    fetchDocuments();
    router.push(`/documents/${documentId}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F4] flex flex-col font-sans text-[#111827]">
      {/* 1. TOP HEADER */}
      <header className="h-14 bg-white border-b border-[#D9DEE5] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
            title="RFPground Homepage"
          >
            <Image
              src="/brand-assets/navbar-logo.png"
              alt="RFPground"
              width={128}
              height={32}
              className="h-7 w-auto object-contain shrink-0"
              priority
            />
          </Link>
          <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />
          <span className="text-[13px] font-semibold text-[#475467]">
            Document Library
          </span>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-[12px] font-medium text-[#667085] hidden md:inline">
              {userEmail}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-8 flex flex-col gap-6">
        {/* Title Bar & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">
                Documents
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[#E4E7EC] text-[#344054]">
                {documents.length}
              </span>
            </div>
            <p className="text-[13px] text-[#667085] mt-0.5">
              All documents uploaded and evaluated across your workspace
            </p>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3157D5] hover:bg-[#2544ab] text-white text-[13px] font-semibold rounded-md shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload Tender</span>
          </button>
        </div>

        {/* Search & Filter Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[#D9DEE5] shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name, type, or notes..."
              className="w-full pl-9 pr-4 py-1.5 text-[13px] text-[#111827] bg-[#F5F6F4]/60 rounded border-0 focus:ring-1 focus:ring-[#3157D5] placeholder:text-[#98A2B3]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(
              [
                { id: 'ALL', label: 'All', count: tabCounts.ALL },
                { id: 'READY', label: 'Ready', count: tabCounts.READY },
                { id: 'PROCESSING', label: 'Processing', count: tabCounts.PROCESSING },
                { id: 'REVIEW', label: 'Review', count: tabCounts.REVIEW },
                { id: 'FAILED', label: 'Failed', count: tabCounts.FAILED },
                { id: 'REJECTED', label: 'Rejected', count: tabCounts.REJECTED },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#3157D5] text-white shadow-2xs'
                      : 'text-[#475467] hover:bg-[#F5F6F4] hover:text-[#111827]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10.5px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#E4E7EC] text-[#475467]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. DOCUMENT LIST / HYBRID ROWS */}
        <div className="flex flex-col gap-2.5">
          {isLoading ? (
            <div className="bg-white border border-[#D9DEE5] rounded-lg p-12 flex flex-col items-center justify-center text-center">
              <div className="w-7 h-7 border-2 border-[#3157D5] border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-[13px] font-semibold text-[#111827]">
                Loading Document Library...
              </span>
              <span className="text-[11.5px] text-[#667085] mt-0.5">
                Fetching verified tender records
              </span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-white border border-[#D9DEE5] rounded-lg p-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#F5F6F4] flex items-center justify-center text-[#667085] mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-[14px] font-bold text-[#111827]">
                {searchQuery ? 'No matching documents found' : 'No documents in this view'}
              </h3>
              <p className="text-[12px] text-[#667085] max-w-sm mt-1 mb-4">
                {searchQuery
                  ? `No tender matched "${searchQuery}". Try searching for another filename or qualification status.`
                  : 'Get started by uploading a Request for Proposal (RFP) to extract findings and verify requirements.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#3157D5] hover:bg-[#2544ab] text-white text-[12.5px] font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  + Upload Your First RFP
                </button>
              )}
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const opStatus = doc.operational_status?.toUpperCase() || doc.status?.toUpperCase();
              const isCompleted = opStatus === 'COMPLETED' || opStatus === 'ANALYSIS_COMPLETE';
              const isFailed = opStatus === 'FAILED' || opStatus === 'ERROR';
              const isAmbiguous = doc.qualification_status === 'AI_AMBIGUOUS' || opStatus === 'AMBIGUOUS';
              const isRejected = doc.qualification_status === 'AI_REJECTED' || opStatus === 'REJECTED';
              const isProcessing =
                (opStatus === 'PROCESSING' ||
                  opStatus === 'EXTRACTING' ||
                  opStatus === 'ANALYSING' ||
                  opStatus === 'QUALIFYING' ||
                  opStatus === 'QUEUED') &&
                !isCompleted &&
                !isFailed;

              return (
                <div
                  key={doc.id}
                  className="bg-white border border-[#D9DEE5] hover:border-[#B2BDCE] rounded-lg p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-start justify-between gap-4 group shadow-2xs hover:shadow-xs"
                >
                  {/* Left Column: Filename, metadata, and status badges */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Filename & Qualification Tag */}
                    <div className="flex items-start sm:items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-[14.5px] font-bold text-[#111827] group-hover:text-[#3157D5] transition-colors truncate max-w-md md:max-w-xl cursor-pointer"
                        title={doc.original_filename}
                      >
                        {doc.original_filename}
                      </Link>

                      {/* Qualification Badge */}
                      {doc.qualification_status === 'AI_QUALIFIED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]">
                          ✓ Qualified RFP
                        </span>
                      )}
                      {isAmbiguous && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
                          Ambiguous Tender
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                          ✕ Non-RFP Rejected
                        </span>
                      )}
                      {doc.qualification_status === 'USER_CONFIRMED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                          Manually Confirmed
                        </span>
                      )}
                    </div>

                    {/* Metadata Line */}
                    <div className="flex items-center gap-2.5 text-[12px] text-[#667085] flex-wrap">
                      <span>{doc.total_pages > 0 ? `${doc.total_pages} pages` : 'Pending page audit'}</span>
                      <span>•</span>
                      <span>Uploaded {formatTimeAgo(doc.created_at)}</span>
                      
                      {/* Operational Status Tag */}
                      {isCompleted && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#027A48]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                            Analysis Complete
                          </span>
                          <span>•</span>
                          <span className="text-[#344054] font-medium bg-[#F5F6F4] px-1.5 py-0.5 rounded border border-[#E4E7EC]">
                            {doc.total_pages > 0
                              ? `${doc.evaluated_pages_count ?? doc.total_pages} / ${doc.total_pages} Pages Evaluated`
                              : 'Pages Evaluated'}
                          </span>
                        </>
                      )}

                      {isProcessing && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#B54708]">
                            <span className="w-2 h-2 rounded-full bg-[#F79009] animate-pulse" />
                            {opStatus === 'EXTRACTING'
                              ? 'Extracting Document Pages...'
                              : opStatus === 'QUALIFYING'
                              ? 'Qualifying Document Signals...'
                              : 'Analysis In Progress...'}
                          </span>
                        </>
                      )}

                      {!isCompleted && !isProcessing && !isFailed && (opStatus === 'TEXT_EXTRACTED' || opStatus === 'UPLOADED') && !isRejected && (
                        <>
                          <span>•</span>
                          <span className="text-[#344054] font-medium bg-[#F5F6F4] px-1.5 py-0.5 rounded border border-[#E4E7EC]">
                            {opStatus === 'TEXT_EXTRACTED' ? 'Text Extracted' : 'Uploaded'}
                          </span>
                        </>
                      )}

                      {isFailed && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#D92D20]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]" />
                            Analysis Failed
                          </span>
                          {doc.latest_run?.last_error && (
                            <span className="text-[#B42318] text-[11px] truncate max-w-xs" title={doc.latest_run.last_error}>
                              ({doc.latest_run.last_error})
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Document Summary & Recommended Action Box */}
                    {doc.qualification_reason && (
                      <div className="text-[12px] bg-[#F8F9FA] p-2.5 rounded border border-[#EAECF0] flex flex-col gap-1.5 mt-0.5">
                        <p className="text-[#344054] leading-relaxed">
                          <span className="font-semibold text-[#111827]">Document Summary: </span>
                          {doc.qualification_reason}
                        </p>
                        {doc.recommended_action && (
                          <div className="text-[11.5px] text-[#344054] flex items-start gap-1.5 border-t border-[#EAECF0] pt-1.5">
                            <span className="font-bold uppercase tracking-wider text-[10px] bg-[#EFF8FF] text-[#175CD3] px-1.5 py-0.5 rounded border border-[#B2DDFF] shrink-0">
                              Recommended Action
                            </span>
                            <span className="font-medium text-[#1D2939]">{doc.recommended_action}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Clear Primary Action Button + Secondary Menu */}
                  <div className="shrink-0 sm:self-center flex items-center gap-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold rounded-md transition-colors cursor-pointer ${
                        isCompleted
                          ? 'bg-[#3157D5] hover:bg-[#2544ab] text-white shadow-2xs'
                          : isRejected
                          ? 'bg-[#FEF3F2] hover:bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA]'
                          : isAmbiguous
                          ? 'bg-[#FFFAEB] hover:bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89]'
                          : isFailed
                          ? 'bg-[#FEF3F2] hover:bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA]'
                          : 'bg-white hover:bg-[#F5F6F4] text-[#344054] border border-[#D9DEE5]'
                      }`}
                    >
                      <span>
                        {isCompleted
                          ? 'Open Analysis →'
                          : isRejected
                          ? 'Review Qualification →'
                          : isAmbiguous
                          ? 'Review Intake →'
                          : isFailed
                          ? 'View Error →'
                          : 'View Status →'}
                      </span>
                    </Link>

                    {/* Direct Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingDoc(doc);
                        setDeleteError(null);
                      }}
                      title="Delete document"
                      aria-label="Delete document"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-[#B42318] hover:text-[#912018] bg-white hover:bg-[#FEF3F2] border border-[#FECDCA] hover:border-[#FDA29B] rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5 text-[#D92D20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 4. UPLOAD TENDER MODAL / INTAKE TRAY */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-6 md:p-10 flex items-center justify-center animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#D9DEE5]">
            <div className="px-6 py-4 border-b border-[#D9DEE5] flex items-center justify-between bg-[#F8F9FA]">
              <div>
                <h3 className="text-[15px] font-bold text-[#111827]">
                  Upload Tender for Review
                </h3>
                <p className="text-[12px] text-[#667085]">
                  Extract clauses, verify requirements, and evaluate bid coverage
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-gray-200 rounded transition-colors cursor-pointer text-[13px] font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <DocumentIntake
                userId={userId}
                onAnalysisComplete={handleUploadComplete}
                onCancel={() => setIsUploadModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. PERMANENT DELETE CONFIRMATION MODAL */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#D9DEE5] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#FEF3F2]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold text-[#B42318] uppercase tracking-wide">
                  DELETE DOCUMENT?
                </h3>
              </div>
              <button
                disabled={isDeleting}
                onClick={() => {
                  setDeletingDoc(null);
                  setDeleteError(null);
                }}
                className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-white/60 rounded transition-colors cursor-pointer text-[13px] font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="text-[13px] text-[#344054] space-y-2">
                <p className="font-medium text-[#1D2939]">
                  This will permanently delete:
                </p>
                <ul className="space-y-1.5 pl-2 text-[#475467]">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
                    <span>the uploaded file <strong className="text-[#1D2939]">({deletingDoc.original_filename})</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
                    <span>its extracted pages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
                    <span>its analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
                    <span>its evidence</span>
                  </li>
                </ul>
                <p className="text-[12px] font-semibold text-[#B42318] pt-2 border-t border-[#F2F4F7]">
                  This action cannot be undone.
                </p>
              </div>

              {/* Truthful error message display if deletion failed */}
              {deleteError && (
                <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-lg text-[#B42318] text-[12px] flex items-start gap-2">
                  <span className="font-bold">Error:</span>
                  <span className="leading-tight">{deleteError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#EAECF0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingDoc(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-[12.5px] font-semibold text-[#344054] bg-white hover:bg-[#F2F4F7] border border-[#D0D5DD] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-[12.5px] font-semibold text-white bg-[#D92D20] hover:bg-[#B42318] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting permanently...</span>
                  </>
                ) : (
                  <span>Delete permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
