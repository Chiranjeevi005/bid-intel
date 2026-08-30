'use client';

import LogoutButton from '@/app/dashboard/LogoutButton';

interface DocumentSummary {
  id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
  qualification_status: string | null;
  document_type: string | null;
  created_at: string;
}

interface WorkspaceHeaderProps {
  activeDoc: {
    id: string;
    filename: string;
    total_pages: number;
    document_type: string | null;
    status: string;
    qualification_status: string | null;
  } | null;
  runStatus: string | null;
  documentsList: DocumentSummary[];
  onSelectDocument: (id: string) => void;
  onNewTenderClick: () => void;
  queueSummary?: {
    total_jobs: number;
    analysing_count: number;
    ready_count: number;
    queued_count: number;
    failed_count: number;
  };
  onOpenQueue?: () => void;
}

export default function WorkspaceHeader({
  activeDoc,
  runStatus,
  documentsList,
  onSelectDocument,
  onNewTenderClick,
  queueSummary,
  onOpenQueue
}: WorkspaceHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-[#D9DEE5] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      
      {/* Left Group: Brand & Active Document Metadata */}
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
        <span className="font-bold text-[14px] text-[#111827] tracking-tight shrink-0">
          RFPground
        </span>

        <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

        {activeDoc ? (
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            {/* Document Switcher Dropdown */}
            <div className="relative shrink-0">
              <select
                value={activeDoc.id}
                onChange={(e) => onSelectDocument(e.target.value)}
                className="text-[13px] font-semibold text-[#111827] bg-transparent border-0 pr-6 pl-1 py-1 cursor-pointer focus:ring-1 focus:ring-[#3157D5] rounded-sm truncate max-w-50 sm:max-w-70 md:max-w-85"
                title={activeDoc.filename}
              >
                {documentsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.original_filename}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Count */}
            {activeDoc.total_pages > 0 && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F6F4] text-[#475467] border border-[#D9DEE5] shrink-0">
                {activeDoc.total_pages} Pages
              </span>
            )}

            {/* Document Type */}
            {activeDoc.document_type && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 uppercase shrink-0">
                {activeDoc.document_type}
              </span>
            )}

            {/* Qualification Badges for Non-Qualified Tenders */}
            {activeDoc.qualification_status === 'AI_REJECTED' && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] shrink-0">
                NON-TENDER
              </span>
            )}
            {activeDoc.qualification_status === 'AI_AMBIGUOUS' && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] shrink-0">
                AMBIGUOUS TENDER
              </span>
            )}

            {/* Operational Status Beacon */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0 pl-2">
              {runStatus === 'COMPLETED' ? (
                <span className="text-[11px] font-semibold text-[#027A48] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#027A48]" />
                  ANALYSIS COMPLETE
                </span>
              ) : runStatus === 'PROCESSING' ? (
                <span className="text-[11px] font-semibold text-[#3157D5] flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
                  ANALYSING
                </span>
              ) : runStatus === 'QUEUED' ? (
                <span className="text-[11px] font-semibold text-[#B54708] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B54708]" />
                  QUEUED
                </span>
              ) : runStatus === 'FAILED' ? (
                <span className="text-[11px] font-semibold text-[#B42318] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
                  ANALYSIS FAILED
                </span>
              ) : activeDoc.status === 'OCR_REQUIRED' ? (
                <span className="text-[11px] font-semibold text-[#B54708] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B54708]" />
                  OCR REQUIRED
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <span className="text-[13px] text-[#667085] font-medium">
            Tender Intake Desk
          </span>
        )}
      </div>

      {/* Right Group: Action Controls & User Logout */}
      <div className="flex items-center gap-3 shrink-0">
        {queueSummary && queueSummary.total_jobs > 0 && (
          <button
            onClick={onOpenQueue}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#D9DEE5] bg-[#F8F9FA] px-2.5 py-1.5 text-[12px] font-semibold text-[#344054] hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
            title="Open Analysis Queue"
          >
            {queueSummary.analysing_count > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#3157D5] animate-pulse" />
                <span>{queueSummary.analysing_count} analysing · {queueSummary.ready_count} ready</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#027A48]" />
                <span>Queue ({queueSummary.ready_count} ready)</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onNewTenderClick}
          className="inline-flex items-center justify-center rounded-sm border border-[#D9DEE5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#344054] hover:bg-gray-50 transition-colors shadow-xs"
        >
          + New Tender
        </button>

        <span className="h-4 w-px bg-[#D9DEE5]" />

        <LogoutButton />
      </div>

    </header>
  );
}
