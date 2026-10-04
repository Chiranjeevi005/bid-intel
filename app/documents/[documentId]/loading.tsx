import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Download, Plus, ListOrdered, MoreVertical } from 'lucide-react';

export default function DocumentWorkspaceLoading() {
  return (
    <div className="min-h-screen bg-[#F5F6F4] flex flex-col font-sans text-[#111827]">
      
      {/* ========================================================================= */}
      {/* 1. WORKSPACE HEADER (Mirrors real WorkspaceHeader structure)             */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-[#D9DEE5] sticky top-0 z-40">
        
        {/* Desktop & Tablet Layout (md and up) */}
        <div className="hidden md:flex h-14 px-4 md:px-6 items-center justify-between">
          {/* Left: Brand + Level 1 Navigation + Level 2 Document Context */}
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
            {/* Real RFPground Brand */}
            <Link
              href="/"
              className="flex items-center shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
              title="RFPground Homepage"
            >
              <Image
                src="/brand-assets/navbar-logo.png"
                alt="RFPground"
                width={160}
                height={40}
                className="h-9 sm:h-9.5 md:h-10 w-auto object-contain shrink-0"
                priority
              />
            </Link>

            <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

            {/* Level 1 Navigation Escape Link */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#344054] hover:text-[#111827] px-2 py-1 rounded-sm hover:bg-[#F5F6F4] transition-colors shrink-0"
              title="Return to Document Library"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#667085] shrink-0" strokeWidth={2} />
              <span className="whitespace-nowrap">All Documents</span>
            </Link>

            <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

            {/* Level 2: Document Context (Clean & Restrained, zero pulse shimmers) */}
            <div className="flex flex-col justify-center min-w-0 py-1">
              <span className="text-[14px] font-bold text-[#667085] truncate">
                Workspace
              </span>
            </div>
          </div>

          {/* Right: Restrained Header Action Placeholders */}
          <div className="flex items-center gap-2.5 shrink-0 opacity-60">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-sm border border-[#D9DEE5] bg-[#F8F9FA] px-2.5 py-1.5 text-[12px] font-semibold text-[#667085]">
              <ListOrdered className="w-3.5 h-3.5 text-[#98A2B3]" strokeWidth={2} />
              <span>Queue</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-sm border border-[#D9DEE5] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#667085]">
              <Download className="w-3.5 h-3.5 text-[#98A2B3]" strokeWidth={2} />
              <span>Export</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-sm bg-[#3157D5] px-3 py-1.5 text-[12px] font-semibold text-white shadow-2xs">
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>New Tender</span>
            </div>

            <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

            <span className="text-[13px] text-[#98A2B3] font-medium">Sign Out</span>
          </div>
        </div>

        {/* Mobile Layout (< md) */}
        <div className="md:hidden flex flex-col px-3 py-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <Link
              href="/dashboard"
              className="p-1.5 -ml-1 text-[#667085] hover:text-[#111827] rounded-sm shrink-0"
              title="All Documents"
              aria-label="All Documents"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </Link>

            <div className="flex-1 min-w-0 pl-1">
              <span className="text-[13.5px] font-bold text-[#667085] truncate">
                Workspace
              </span>
            </div>

            <div className="p-1.5 text-[#98A2B3] shrink-0">
              <MoreVertical className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MINIMAL CENTERED LOADING STATE (Zero skeletons, clean & restrained)   */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-3.5rem)]">
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className="w-5 h-5 border-2 border-[#D9DEE5] border-t-[#3157D5] rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-[13px] font-medium text-[#111827] tracking-tight">
            Loading workspace...
          </p>
        </div>
      </main>

    </div>
  );
}
