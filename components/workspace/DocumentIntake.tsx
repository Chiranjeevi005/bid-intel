'use client';

import React, { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DocumentIntakeProps {
  userId: string;
  onAnalysisComplete: (documentId: string) => void;
  onCancel?: () => void;
}

type IntakeStage =
  | 'IDLE'
  | 'UPLOADING'
  | 'EXTRACTING'
  | 'OCR_REQUIRED'
  | 'QUALIFYING'
  | 'AMBIGUOUS_CONFIRMATION'
  | 'REJECTED'
  | 'ANALYSING'
  | 'ACCEPTED'
  | 'FAILED';

export default function DocumentIntake({
  userId,
  onAnalysisComplete,
  onCancel
}: DocumentIntakeProps) {
  const [stage, setStage] = useState<IntakeStage>('IDLE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [ambiguityReason, setAmbiguityReason] = useState<string | null>(null);
  const [extractedPagesCount, setExtractedPagesCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  // Validate and select file
  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    // 1. Validate PDF format
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Invalid file format. Only PDF documents are supported.');
      return;
    }

    // 2. Validate file size (<= 10MB)
    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`File exceeds 10 MB limit (${sizeMB} MB). Please upload a smaller PDF.`);
      return;
    }

    setSelectedFile(file);
  };

  // Start the actual end-to-end processing pipeline
  const handleStartIntake = async () => {
    if (!selectedFile) return;

    try {
      setErrorMessage(null);
      setStage('UPLOADING');
      setStatusMessage('Uploading PDF to secure private storage...');

      // 1. Upload file to Supabase Storage bucket 'rfps'
      const fileExt = 'pdf';
      const storageKey = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rfps')
        .upload(storageKey, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Insert document record in PostgreSQL
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          original_filename: selectedFile.name,
          storage_path: storageKey,
          size_bytes: selectedFile.size,
          status: 'UPLOADED'
        })
        .select()
        .single();

      if (dbError || !docData) {
        console.error('Database Insert Error:', dbError);
        throw new Error('Failed to create document record.');
      }

      const currentDocId = docData.id;
      setDocId(currentDocId);

      // 3. Process Document (Page text extraction + OCR heuristics)
      setStage('EXTRACTING');
      setStatusMessage('Extracting document pages and verifying text density...');

      const processRes = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: currentDocId })
      });

      if (!processRes.ok) {
        const pData = await processRes.json();
        throw new Error(pData.error || 'Text extraction failed.');
      }

      const processData = await processRes.json();
      setExtractedPagesCount(processData.diagnostics?.total_pages || 0);

      if (processData.status === 'OCR_REQUIRED') {
        setStage('OCR_REQUIRED');
        setStatusMessage('Document text density is extremely low. Scanned/raster PDF detected.');
        return;
      }

      // 4. Trigger Qualification & Analysis
      await triggerAnalysis(currentDocId, false);

    } catch (err: any) {
      console.error('Intake Pipeline Error:', err);
      setStage('FAILED');
      setErrorMessage(err.message || 'An unexpected error occurred during processing.');
    }
  };

  // Trigger analysis execution
  const triggerAnalysis = async (documentId: string, userConfirmed: boolean) => {
    setStage('QUALIFYING');
    setStatusMessage('Evaluating procurement qualification gate...');

    const analyzeRes = await fetch('/api/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        user_confirmed: userConfirmed
      })
    });

    const analyzeData = await analyzeRes.json();

    if (!analyzeRes.ok) {
      if (analyzeRes.status === 422 && analyzeData.ambiguous) {
        setStage('AMBIGUOUS_CONFIRMATION');
        setAmbiguityReason(analyzeData.reason || 'Document structure is non-standard.');
        return;
      }
      if (analyzeRes.status === 422 && analyzeData.rejected) {
        setStage('REJECTED');
        setAmbiguityReason(analyzeData.reason || 'Document does not appear to be a procurement opportunity.');
        return;
      }
      throw new Error(analyzeData.error || 'Failed to dispatch analysis run.');
    }

    if (analyzeData.status === 'AI_REJECTED' || analyzeData.success === false && analyzeData.status === 'AI_REJECTED') {
      setStage('REJECTED');
      setAmbiguityReason(analyzeData.reason || 'Document does not appear to be a procurement opportunity.');
      return;
    }

    if (analyzeData.status === 'AI_AMBIGUOUS' || analyzeData.success === false && analyzeData.status === 'AI_AMBIGUOUS') {
      setStage('AMBIGUOUS_CONFIRMATION');
      setAmbiguityReason(analyzeData.reason || 'Document classification uncertain, requires user confirmation');
      return;
    }

    const currentRunId = analyzeData.runId || analyzeData.run_id;
    if (!currentRunId) {
      throw new Error(analyzeData.error || 'Failed to initialize analysis run ID.');
    }

    setRunId(currentRunId);
    setStage('ACCEPTED');
    setStatusMessage('Tender accepted. Analysis is running asynchronously in the background.');

    // Poll in background in case user stays on screen
    pollAnalysisStatus(currentRunId, documentId);
  };

  // Poll analysis run status
  const pollAnalysisStatus = (activeRunId: string, activeDocId: string) => {
    if (!activeRunId || activeRunId === 'undefined') {
      console.warn('Cannot poll analysis status without a valid runId');
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/analysis-status?runId=${activeRunId}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 400) {
            clearInterval(interval);
            setStage('FAILED');
            setErrorMessage('Analysis run was not found. Please try uploading again.');
          }
          return;
        }

        const data = await res.json();
        
        if (data.status === 'COMPLETED') {
          clearInterval(interval);
          onAnalysisComplete(activeDocId);
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setStage('FAILED');
          setErrorMessage(data.error || 'Analysis execution encountered a server error.');
        } else {
          setStatusMessage(`Analysing document pages (Stage: ${data.status})...`);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2500);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8 my-8 bg-white border border-[#D9DEE5] rounded-sm shadow-xs">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#D9DEE5] mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">
            Tender Intake & Processing
          </h2>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Upload a procurement tender or RFP (PDF format, up to 10 MB).
          </p>
        </div>

        {onCancel && stage === 'IDLE' && (
          <button
            onClick={onCancel}
            className="text-[12px] font-semibold text-[#667085] hover:text-[#111827]"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#FEF3F2] border border-[#FECDCA] rounded-sm text-[13px] text-[#B42318] flex items-start gap-2.5">
          <span className="font-bold">Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STAGE 1: IDLE / FILE SELECTION */}
      {stage === 'IDLE' && (
        <div className="flex flex-col gap-6">
          
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D9DEE5] hover:border-[#3157D5] bg-[#F5F6F4] hover:bg-white rounded-sm p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-10 h-10 rounded-full bg-white border border-[#D9DEE5] flex items-center justify-center mb-3 text-[#3157D5]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-semibold text-[#111827]">
                  {selectedFile.name}
                </span>
                <span className="text-[12px] font-mono text-[#667085] mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for analysis
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-semibold text-[#111827]">
                  Click to select or drag and drop tender PDF
                </span>
                <span className="text-[12px] text-[#667085] mt-1">
                  PDF format only · Maximum 10 MB
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            disabled={!selectedFile}
            onClick={handleStartIntake}
            className="w-full py-2.5 px-4 bg-[#3157D5] hover:bg-[#2546B8] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-[13.5px] rounded-sm transition-colors shadow-xs"
          >
            Start Tender Ingestion & Analysis &rarr;
          </button>
        </div>
      )}

      {/* STAGE 2: PROCESSING (UPLOADING / EXTRACTING / QUALIFYING / ANALYSING) */}
      {(stage === 'UPLOADING' || stage === 'EXTRACTING' || stage === 'QUALIFYING' || stage === 'ANALYSING') && (
        <div className="p-8 text-center flex flex-col items-center justify-center bg-[#F5F6F4] border border-[#D9DEE5] rounded-sm">
          <div className="w-8 h-8 border-2 border-[#3157D5] border-t-transparent rounded-full animate-spin mb-4" />
          
          <h3 className="text-[15px] font-bold text-[#111827] mb-1">
            {stage === 'UPLOADING' && 'Uploading Tender Document...'}
            {stage === 'EXTRACTING' && 'Extracting Document Pages...'}
            {stage === 'QUALIFYING' && 'Evaluating Procurement Qualification...'}
            {stage === 'ANALYSING' && 'Running Targeted Extraction & Evidence Verification...'}
          </h3>

          <p className="text-[13px] text-[#667085] max-w-md mb-3">
            {statusMessage}
          </p>

          {extractedPagesCount > 0 && (
            <span className="text-[11.5px] font-mono text-[#475467] bg-white px-2.5 py-1 rounded border border-[#D9DEE5]">
              {extractedPagesCount} Pages Extracted
            </span>
          )}
        </div>
      )}

      {/* STAGE 2.5: ACCEPTED & QUEUED IN BACKGROUND */}
      {stage === 'ACCEPTED' && (
        <div className="p-6 bg-[#ECFDF3] border border-[#ABEFC6] rounded-sm">
          <div className="flex items-center gap-2 mb-2 text-[#027A48]">
            <span className="font-bold text-[14px]">✓ Tender Accepted & Queued</span>
          </div>
          <p className="text-[13.5px] font-semibold text-[#054F31] mb-1">
            {selectedFile?.name}
          </p>
          <p className="text-[12.5px] text-[#067647] leading-relaxed mb-4">
            The document has been securely stored and queued for analysis in the background. You can continue working, upload another tender, or inspect the analysis queue.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedFile(null);
                setStage('IDLE');
              }}
              className="px-4 py-2 bg-[#027A48] hover:bg-[#05603A] text-white font-semibold text-[12.5px] rounded-sm transition-colors cursor-pointer shadow-xs"
            >
              + Upload Another Tender
            </button>
            <button
              onClick={() => {
                if (docId) {
                  onAnalysisComplete(docId);
                } else if (onCancel) {
                  onCancel();
                }
              }}
              className="px-4 py-2 bg-white border border-[#D9DEE5] text-[#344054] font-semibold text-[12.5px] rounded-sm hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              Go to Workspace &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: OCR REQUIRED WARNING */}
      {stage === 'OCR_REQUIRED' && (
        <div className="p-6 bg-[#FFFAEB] border border-[#FEDF89] rounded-sm">
          <div className="flex items-center gap-2 mb-2 text-[#B54708]">
            <span className="font-bold text-[14px]">⚠️ OCR Required</span>
          </div>
          <p className="text-[13px] text-[#7A2E0E] leading-relaxed mb-4">
            This document contains scanned image pages or extremely low text density. The current text extractor yielded insufficient character data. Optical Character Recognition (OCR) is required before this document can be analyzed.
          </p>
          <button
            onClick={() => setStage('IDLE')}
            className="px-4 py-2 bg-white border border-[#D9DEE5] rounded-sm text-[12.5px] font-semibold text-[#344054] hover:bg-gray-50"
          >
            Select Another Document
          </button>
        </div>
      )}

      {/* STAGE 4: AMBIGUOUS QUALIFICATION GATE */}
      {stage === 'AMBIGUOUS_CONFIRMATION' && (
        <div className="p-6 bg-[#FFFAEB] border border-[#FEDF89] rounded-sm">
          <div className="flex items-center gap-2 mb-2 text-[#B54708]">
            <span className="font-bold text-[14px]">⚠️ Document Qualification Ambiguous</span>
          </div>
          <p className="text-[13px] text-[#7A2E0E] leading-relaxed mb-2">
            The automated qualification gate classified this document with low confidence.
          </p>
          {ambiguityReason && (
            <p className="text-[12px] font-mono text-[#7A2E0E] bg-white/70 p-2.5 rounded border border-[#FEDF89] mb-4">
              Reason: {ambiguityReason}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => docId && triggerAnalysis(docId, true)}
              className="px-4 py-2 bg-[#3157D5] text-white font-semibold text-[12.5px] rounded-sm hover:bg-[#2546B8]"
            >
              Confirm as Procurement Opportunity & Proceed
            </button>
            <button
              onClick={() => setStage('IDLE')}
              className="px-3 py-2 bg-white border border-[#D9DEE5] text-[#344054] font-semibold text-[12.5px] rounded-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: REJECTED DOCUMENT GATE */}
      {stage === 'REJECTED' && (
        <div className="p-6 bg-[#FEF3F2] border border-[#FECDCA] rounded-sm">
          <div className="flex items-center gap-2 mb-2 text-[#B42318]">
            <span className="font-bold text-[14px]">🚫 Document Rejected</span>
          </div>
          <p className="text-[13px] text-[#912018] leading-relaxed mb-2">
            This document was classified as a non-procurement document (such as an internal resume, invoice, or brochure) and cannot be processed as a tender.
          </p>
          {ambiguityReason && (
            <p className="text-[12px] font-mono text-[#912018] bg-white/80 p-3 rounded border border-[#FECDCA] mb-4 leading-relaxed">
              Reason: {ambiguityReason}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setStage('IDLE')}
              className="px-4 py-2 bg-white border border-[#D9DEE5] text-[#344054] font-semibold text-[12.5px] rounded-sm hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              Upload Another Document
            </button>
            <button
              onClick={() => docId && triggerAnalysis(docId, true)}
              className="px-4 py-2 bg-[#111827] hover:bg-black text-white font-semibold text-[12.5px] rounded-sm transition-colors cursor-pointer shadow-xs"
            >
              Analyze Anyway (Override Gate) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STAGE 6: FAILURE STATE */}
      {stage === 'FAILED' && (
        <div className="p-6 bg-white border border-[#D9DEE5] rounded-sm text-center">
          <button
            onClick={() => setStage('IDLE')}
            className="px-4 py-2 bg-[#3157D5] text-white text-[12.5px] font-semibold rounded-sm hover:bg-[#2546B8]"
          >
            Try Again
          </button>
        </div>
      )}

    </div>
  );
}
