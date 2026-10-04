'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import LogoutButton from '@/app/dashboard/LogoutButton';
import {
  ArrowLeft,
  Download,
  ChevronDown,
  Plus,
  ListOrdered,
  MoreVertical,
  Check,
  FileText
} from 'lucide-react';

export interface DocumentSummary {
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
  onExportJSON?: () => void;
  onExportCSV?: () => void;
}

interface DocumentSwitcherProps {
  activeDoc: {
    id: string;
    filename: string;
    total_pages: number;
    document_type: string | null;
    status: string;
    qualification_status: string | null;
  } | null;
  documentsList: DocumentSummary[];
  onSelectDocument: (id: string) => void;
  isMobile?: boolean;
}

/**
 * Single Responsive Document Switcher
 * Shared across desktop, tablet, and mobile breakpoints.
 * Handles touch and mouse interactions, keyboard navigation, and outside dismissals.
 */
function DocumentSwitcher({
  activeDoc,
  documentsList,
  onSelectDocument,
  isMobile = false,
}: DocumentSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasMultipleDocs = documentsList.length > 1;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!activeDoc) return null;

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <div className="flex items-center min-w-0">
        {hasMultipleDocs ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-label="Switch tender document"
            className="group/doc inline-flex items-center gap-1.5 min-w-0 max-w-full text-left cursor-pointer hover:bg-[#F5F6F4] active:bg-[#ECEEEA] rounded px-1.5 py-0.5 -ml-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3157D5]"
            title="Click to switch tender document"
          >
            <span
              className={`font-bold text-[#111827] group-hover/doc:text-[#3157D5] transition-colors truncate ${isMobile
                  ? 'text-[13.5px] max-w-[calc(100vw-7.5rem)]'
                  : 'text-[14px] max-w-37.5 md:max-w-50 lg:max-w-xs xl:max-w-md'
                }`}
            >
              {activeDoc.filename}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#667085] group-hover/doc:text-[#3157D5] transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-[#3157D5]' : ''
                }`}
              strokeWidth={2}
            />
          </button>
        ) : (
          <span
            className={`font-bold text-[#111827] truncate select-text ${isMobile
                ? 'text-[13.5px] max-w-[calc(100vw-7.5rem)]'
                : 'text-[14px] max-w-37.5 md:max-w-50 lg:max-w-xs xl:max-w-md'
              }`}
            title={activeDoc.filename}
          >
            {activeDoc.filename}
          </span>
        )}
      </div>

      {/* Document Switcher Dropdown Popover */}
      <AnimatePresence>
        {isOpen && hasMultipleDocs && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute left-0 top-full mt-1.5 max-h-72 overflow-y-auto bg-white border border-[#D9DEE5] rounded-md shadow-lg py-1 z-50 motion-reduce:transition-none motion-reduce:transform-none ${isMobile
                ? 'w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm'
                : 'w-80 max-w-[calc(100vw-2rem)]'
              }`}
            role="menu"
            aria-label="Select tender document"
          >
            <div className="px-3 py-1.5 border-b border-[#EAECF0] flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              <span>Switch Document</span>
              <span className="font-mono">{documentsList.length} total</span>
            </div>

            <div className="py-1">
              {documentsList.map((doc) => {
                const isCurrent = doc.id === activeDoc.id;
                return (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      if (onSelectDocument) onSelectDocument(doc.id);
                    }}
                    className={`px-3 py-2 text-[12.5px] flex items-center justify-between hover:bg-[#F5F6F4] active:bg-[#ECEEEA] transition-colors cursor-pointer ${isCurrent ? 'bg-[#F0F4FE] text-[#3157D5] font-semibold' : 'text-[#111827]'
                      }`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[#3157D5]' : 'text-[#98A2B3]'
                          }`}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{doc.original_filename}</span>
                    </div>
                    {isCurrent && (
                      <Check className="w-3.5 h-3.5 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkspaceHeader({
  activeDoc,
  runStatus,
  documentsList,
  onSelectDocument,
  onNewTenderClick,
  queueSummary,
  onOpenQueue,
  onExportJSON,
  onExportCSV,
}: WorkspaceHeaderProps) {
  // Dropdown states
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for outside pointer interaction detection
  const exportRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside pointerdown or Escape
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Format quiet metadata
  const renderQuietMetadata = () => {
    if (!activeDoc) return null;

    const pageText = activeDoc.total_pages > 0 ? `${activeDoc.total_pages} pages` : 'Pending page audit';
    const isCompleted = runStatus === 'COMPLETED' || activeDoc.status === 'ANALYSIS_COMPLETE';
    const isProcessing = runStatus === 'PROCESSING' || activeDoc.status === 'PROCESSING' || activeDoc.status === 'QUEUED';
    const isFailed = runStatus === 'FAILED' || activeDoc.status === 'FAILED';

    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-[#667085] leading-none">
        <span>{pageText}</span>
        <span>·</span>
        {isCompleted && (
          <span className="text-[#027A48] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
            Analysis Complete
          </span>
        )}
        {isProcessing && (
          <span className="text-[#3157D5] font-medium flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
            Analysing...
          </span>
        )}
        {isFailed && (
          <span className="text-[#B42318] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]" />
            Analysis Failed
          </span>
        )}
        {!isCompleted && !isProcessing && !isFailed && (
          <span className="text-[#475467] font-medium">Uploaded</span>
        )}

        {/* Quiet Qualification Flag if rejected or ambiguous */}
        {activeDoc.qualification_status === 'AI_REJECTED' && (
          <>
            <span>·</span>
            <span className="text-[#B42318] font-mono text-[10.5px]">Non-Tender</span>
          </>
        )}
        {activeDoc.qualification_status === 'AI_AMBIGUOUS' && (
          <>
            <span>·</span>
            <span className="text-[#B54708] font-mono text-[10.5px]">Ambiguous</span>
          </>
        )}
      </div>
    );
  };

  return (
    <header className="bg-white border-b border-[#D9DEE5] sticky top-0 z-40">

      {/* ========================================================================= */}
      {/* DESKTOP & TABLET VIEW (md and up)                                         */}
      {/* ========================================================================= */}
      <div className="hidden md:flex h-14 px-4 md:px-6 items-center justify-between">

        {/* Left: Brand + Level 1 Navigation + Level 2 Document Identity & Level 3 Metadata */}
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          {/* Brand */}
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

          {/* LEVEL 1: Navigation Escape */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#344054] hover:text-[#111827] px-2 py-1 rounded-sm hover:bg-[#F5F6F4] transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none shrink-0"
            title="Return to Document Library"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#667085] shrink-0" strokeWidth={2} />
            <span className="whitespace-nowrap">All Documents</span>
          </Link>

          <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

          {/* LEVEL 2 & LEVEL 3: Current Document Identity & Quiet Metadata */}
          <div className="flex flex-col justify-center min-w-0">
            <DocumentSwitcher
              activeDoc={activeDoc}
              documentsList={documentsList}
              onSelectDocument={onSelectDocument}
              isMobile={false}
            />
            {activeDoc && (
              <div className="mt-0.5">
                {renderQuietMetadata()}
              </div>
            )}
          </div>
        </div>

        {/* Right: LEVEL 4 Workspace Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Queue Button */}
          {queueSummary && queueSummary.total_jobs > 0 && (
            <button
              onClick={onOpenQueue}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[#D9DEE5] bg-[#F8F9FA] px-2.5 py-1.5 text-[12px] font-semibold text-[#344054] hover:bg-gray-100 transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none cursor-pointer shadow-2xs"
              title="Open Analysis Queue"
            >
              <ListOrdered className="w-3.5 h-3.5 text-[#667085]" strokeWidth={2} />
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

          {/* Export Dropdown */}
          {(onExportJSON || onExportCSV) && (
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isExportOpen}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none cursor-pointer shadow-2xs shrink-0 whitespace-nowrap ${isExportOpen
                    ? 'border-[#3157D5] bg-[#F5F6F4] text-[#111827]'
                    : 'border-[#D9DEE5] bg-white text-[#344054] hover:bg-[#F5F6F4]'
                  }`}
                title="Export Extracted Findings"
              >
                <Download className="w-3.5 h-3.5 text-[#667085]" strokeWidth={2} />
                <span>Export</span>
                <ChevronDown
                  className={`w-3 h-3 text-[#98A2B3] transition-transform duration-150 ${isExportOpen ? 'rotate-180 text-[#3157D5]' : ''
                    }`}
                  strokeWidth={2}
                />
              </button>

              <AnimatePresence>
                {isExportOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#D9DEE5] rounded-sm shadow-md py-1 z-50 motion-reduce:transition-none motion-reduce:transform-none"
                  >
                    {onExportJSON && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportOpen(false);
                          onExportJSON();
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[#344054] hover:bg-[#F5F6F4] hover:text-[#111827] font-medium flex items-center gap-2 cursor-pointer transition-colors active:bg-[#ECEEEA]"
                      >
                        <span className="font-mono text-[10px] px-1 py-0.5 bg-gray-100 rounded text-gray-600">JSON</span>
                        <span>Findings</span>
                      </button>
                    )}
                    {onExportCSV && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportOpen(false);
                          onExportCSV();
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[#344054] hover:bg-[#F5F6F4] hover:text-[#111827] font-medium flex items-center gap-2 cursor-pointer transition-colors active:bg-[#ECEEEA]"
                      >
                        <span className="font-mono text-[10px] px-1 py-0.5 bg-gray-100 rounded text-gray-600">CSV</span>
                        <span>Findings</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* New Tender CTA */}
          <button
            onClick={onNewTenderClick}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#3157D5] px-2.5 sm:px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2544ab] transition-all duration-150 ease-out active:scale-[0.98] active:translate-y-px motion-reduce:transform-none cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">New Tender</span>
            <span className="sm:hidden">Tender</span>
          </button>

          <span className="h-4 w-px bg-[#D9DEE5] shrink-0" />

          {/* Sign Out */}
          <LogoutButton />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE RESPONSIVE HEADER (< md)                                            */}
      {/* ========================================================================= */}
      <div className="md:hidden flex flex-col px-3 py-2">
        {/* Row 1: Back + Current Document Name (DocumentSwitcher) + Overflow Menu Trigger */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Level 1: Navigation Escape Button */}
          <Link
            href="/dashboard"
            className="p-1.5 -ml-1 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F4] rounded-sm transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none cursor-pointer shrink-0"
            title="All Documents"
            aria-label="All Documents"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>

          {/* Level 2: Single Responsive Document Switcher */}
          <div className="flex-1 min-w-0">
            <DocumentSwitcher
              activeDoc={activeDoc}
              documentsList={documentsList}
              onSelectDocument={onSelectDocument}
              isMobile={true}
            />
          </div>

          {/* Level 4: Mobile Overflow Menu Trigger */}
          <div className="relative" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Workspace Actions Menu"
              aria-expanded={isMobileMenuOpen}
              className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F4] rounded-sm transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none cursor-pointer shrink-0"
            >
              <MoreVertical className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Mobile Action Overflow Menu */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#D9DEE5] rounded-md shadow-xl py-1 z-50 motion-reduce:transition-none motion-reduce:transform-none"
                  role="menu"
                >
                  {/* Action 1: New Tender */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNewTenderClick();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-[#3157D5] hover:bg-[#F0F4FE] flex items-center gap-2 cursor-pointer transition-colors active:bg-[#E0E8F9]"
                  >
                    <Plus className="w-4 h-4 text-[#3157D5]" strokeWidth={2} />
                    <span>Upload New Tender</span>
                  </button>

                  {/* Action 2: Queue */}
                  {queueSummary && queueSummary.total_jobs > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (onOpenQueue) onOpenQueue();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-[13px] text-[#344054] hover:bg-[#F5F6F4] flex items-center gap-2 cursor-pointer transition-colors active:bg-[#EAECF0]"
                    >
                      <ListOrdered className="w-4 h-4 text-[#667085]" strokeWidth={2} />
                      <span>Analysis Queue ({queueSummary.ready_count})</span>
                    </button>
                  )}

                  {/* Action 3: Export Findings */}
                  {onExportJSON && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onExportJSON();
                      }}
                      className="w-full text-left px-3.5 py-2 text-[12.5px] text-[#344054] hover:bg-[#F5F6F4] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#667085]" strokeWidth={2} />
                      <span>Export JSON Findings</span>
                    </button>
                  )}
                  {onExportCSV && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onExportCSV();
                      }}
                      className="w-full text-left px-3.5 py-2 text-[12.5px] text-[#344054] hover:bg-[#F5F6F4] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#667085]" strokeWidth={2} />
                      <span>Export CSV Findings</span>
                    </button>
                  )}

                  {/* Action 4: All Documents */}
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-[#344054] hover:bg-[#F5F6F4] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#667085]" strokeWidth={2} />
                    <span>All Documents Library</span>
                  </Link>

                  <div className="my-1 border-t border-[#EAECF0]" />

                  {/* Action 5: Sign Out */}
                  <div className="px-3.5 py-2">
                    <LogoutButton />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Row 2: Level 3 Quiet Metadata (indented under back arrow) */}
        {activeDoc && (
          <div className="pl-6 pt-0.5">
            {renderQuietMetadata()}
          </div>
        )}
      </div>

    </header>
  );
}
