'use client';

import React from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Inbox, RefreshCw } from 'lucide-react';

export interface QueueJob {
  document_id: string;
  document_name: string;
  size_bytes: number;
  total_pages: number;
  document_type: string | null;
  qualification_status: string | null;
  qualification_reason: string | null;
  created_at: string;
  run_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  findings_count: number;
  last_error: string | null;
}

interface AnalysisQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: QueueJob[];
  onSelectDocument: (docId: string) => void;
  onRetryAnalysis: (docId: string, userConfirmed?: boolean) => void;
}

export default function AnalysisQueueDrawer({
  isOpen,
  onClose,
  jobs,
  onSelectDocument,
  onRetryAnalysis
}: AnalysisQueueDrawerProps) {
  if (!isOpen) return null;

  // Split into in-progress, completed, failed/action required
  const activeJobs = jobs.filter(j => 
    ['QUEUED', 'PARSING', 'VALIDATING', 'ANALYZING', 'SYNTHESIZING', 'PROCESSING', 'EXTRACTING', 'QUALIFYING', 'ANALYSING', 'VERIFYING', 'FINALIZING'].includes(j.status)
  );
  
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
  
  const failedJobs = jobs.filter(j => 
    ['FAILED', 'REJECTED', 'CANCELLED'].includes(j.status)
  );

  const formatStageLabel = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return { label: 'Queued', sub: 'Waiting for worker allocation', color: 'bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]' };
      case 'PARSING':
      case 'EXTRACTING':
        return { label: 'Extracting Text', sub: 'Parsing document structure & pages', color: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' };
      case 'VALIDATING':
      case 'QUALIFYING':
        return { label: 'Tender Qualification', sub: 'Verifying RFP criteria & format', color: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' };
      case 'ANALYZING':
      case 'ANALYSING':
      case 'PROCESSING':
        return { label: 'Extracting Terms', sub: 'Running audit across 5 dimensions', color: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' };
      case 'SYNTHESIZING':
      case 'VERIFYING':
      case 'FINALIZING':
        return { label: 'Synthesizing', sub: 'Generating executive decision brief', color: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' };
      default:
        return { label: status, sub: 'Processing...', color: 'bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-xl flex flex-col">
          
          {/* Header */}
          <div className="h-14 px-6 border-b border-[#D9DEE5] flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[14px] font-bold text-[#111827] tracking-tight">
                Analysis Queue
              </h2>
              {activeJobs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF] animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" strokeWidth={2.5} />
                  {activeJobs.length} Active
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-100 transition-colors"
              title="Close Queue"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Jobs List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. Active Processing Jobs */}
            {activeJobs.length > 0 && (
              <div>
                <h3 className="text-[11.5px] font-bold text-[#667085] uppercase tracking-wider mb-3">
                  In Progress ({activeJobs.length})
                </h3>
                <div className="space-y-3">
                  {activeJobs.map(job => {
                    const info = formatStageLabel(job.status);
                    return (
                      <div 
                        key={job.document_id}
                        className="p-4 bg-white border border-[#D9DEE5] rounded-sm shadow-2xs hover:border-[#3157D5] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-[13px] font-semibold text-[#111827] truncate" title={job.document_name}>
                            {job.document_name}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border shrink-0 ${info.color}`}>
                            {info.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#667085] mb-2">
                          {info.sub}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[#98A2B3]">
                          {job.total_pages > 0 && <span>{job.total_pages} Pages</span>}
                          {job.size_bytes > 0 && <span>{(job.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Completed Ready Jobs */}
            {completedJobs.length > 0 && (
              <div>
                <h3 className="text-[11.5px] font-bold text-[#667085] uppercase tracking-wider mb-3">
                  Ready ({completedJobs.length})
                </h3>
                <div className="space-y-3">
                  {completedJobs.map(job => (
                    <div 
                      key={job.document_id}
                      className="p-4 bg-[#F8F9FA] border border-[#D9DEE5] rounded-sm hover:border-[#027A48] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-[#111827] truncate" title={job.document_name}>
                          {job.document_name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded border bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6] shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-[#027A48]" strokeWidth={2.5} />
                          READY
                        </span>
                      </div>
                      <p className="text-[12px] text-[#475467] mb-3">
                        {job.findings_count} extracted findings · 100% quote verified
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-[#E4E7EC]">
                        <span className="text-[11px] font-mono text-[#98A2B3]">
                          {job.total_pages} Pages
                        </span>
                        <button
                          onClick={() => {
                            onSelectDocument(job.document_id);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#027A48] hover:bg-[#05603A] text-white font-semibold text-[11.5px] rounded-sm transition-colors cursor-pointer"
                        >
                          Open Analysis
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Action Required / Failed Jobs */}
            {failedJobs.length > 0 && (
              <div>
                <h3 className="text-[11.5px] font-bold text-[#B42318] uppercase tracking-wider mb-3">
                  Action Required ({failedJobs.length})
                </h3>
                <div className="space-y-3">
                  {failedJobs.map(job => (
                    <div 
                      key={job.document_id}
                      className="p-4 bg-[#FEF3F2] border border-[#FECDCA] rounded-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-[#111827] truncate" title={job.document_name}>
                          {job.document_name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded border bg-white text-[#B42318] border-[#FECDCA] shrink-0">
                          <AlertTriangle className="w-3 h-3 mr-1 text-[#B42318]" strokeWidth={2} />
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#912018] mb-3 leading-relaxed">
                        {job.qualification_reason || job.last_error || 'Processing could not be completed.'}
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FECDCA]/60">
                        <button
                          onClick={() => onRetryAnalysis(job.document_id, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#111827] hover:bg-black text-white font-semibold text-[11.5px] rounded-sm transition-colors cursor-pointer"
                        >
                          {job.status === 'REJECTED' ? (
                            <>
                              Override & Analyze
                              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" strokeWidth={2} />
                              Retry Analysis
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jobs.length === 0 && (
              <div className="text-center py-12 text-[#667085]">
                <Inbox className="w-8 h-8 text-[#98A2B3] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-[#344054]">No tenders in queue</p>
                <p className="text-[11.5px] text-[#98A2B3] mt-1">Upload a PDF to begin analysis.</p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#D9DEE5] bg-[#F8F9FA] text-[11px] text-[#667085] flex items-center justify-between shrink-0">
            <span>Jobs execute asynchronously on server</span>
            <span className="font-mono text-[#98A2B3]">{jobs.length} Total Documents</span>
          </div>

        </div>
      </div>
    </div>
  );
}
