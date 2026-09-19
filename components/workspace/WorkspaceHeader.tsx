'use client';

import Image from 'next/image';
import Link from 'next/link';
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
    <header className="h-14 bg-white border-b border-[#D9DEE5] px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      
      {/* Left Group: Brand & All Documents Navigation */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
        <Link
          href="/"
          className="flex items-center shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
          title="RFPground Homepage"
        >
          <Image
            src="/brand-assets/navbar-logo.png"
            alt="RFPground"
            width={120}
            height={30}
            className="h-6 sm:h-7 w-auto object-contain shrink-0"
            priority
          />
        </Link>

        <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

        {/* Link back to Document Library */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 sm:gap-1.5 text-[11.5px] sm:text-[12.5px] font-semibold text-[#344054] hover:text-[#111827] px-1.5 sm:px-2 py-1 rounded hover:bg-[#F5F6F4] transition-colors shrink-0"
          title="Return to Document Library"
        >
          <svg className="w-3.5 h-3.5 text-[#667085] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="whitespace-nowrap font-semibold">All Documents</span>
        </Link>

        {activeDoc && (
          <div className="hidden md:flex items-center gap-2 md:gap-3 overflow-hidden pl-1">
            <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

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
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F6F4] text-[#475467] border border-[#D9DEE5] shrink-0">
                {activeDoc.total_pages} Pages
              </span>
            )}

            {/* Qualification Badges */}
            {activeDoc.qualification_status === 'AI_REJECTED' && (
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] shrink-0">
                NON-TENDER
              </span>
            )}
            {activeDoc.qualification_status === 'AI_AMBIGUOUS' && (
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] shrink-0">
                AMBIGUOUS TENDER
              </span>
            )}

            {/* Operational Status Beacon */}
            <div className="hidden xl:flex items-center gap-1.5 shrink-0 pl-1">
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
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Right Group: Action Controls & User Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Queue button: hidden on mobile, visible on tablet/desktop */}
        {queueSummary && queueSummary.total_jobs > 0 && (
          <button
            onClick={onOpenQueue}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-sm border border-[#D9DEE5] bg-[#F8F9FA] px-2.5 py-1 text-[12px] font-semibold text-[#344054] hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
            title="Open Analysis Queue"
          >
            {queueSummary.analysing_count > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5] animate-pulse" />
                <span>{queueSummary.analysing_count} analysing</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#027A48]" />
                <span>Queue ({queueSummary.ready_count} ready)</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onNewTenderClick}
          className="inline-flex items-center gap-1 rounded-sm bg-[#3157D5] px-2.5 py-1 text-[11.5px] sm:text-[12px] font-semibold text-white hover:bg-[#2544ab] transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
        >
          <span>+ New Tender</span>
        </button>

        <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

        <LogoutButton />
      </div>

    </header>
  );
}
