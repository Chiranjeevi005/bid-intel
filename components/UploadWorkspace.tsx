'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AnalysisResults from './AnalysisResults';

export default function UploadWorkspace({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [successFilename, setSuccessFilename] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'AMBIGUOUS'>('IDLE');
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (runId && (analysisStatus === 'QUEUED' || analysisStatus === 'PROCESSING')) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/analysis-status?runId=${runId}`);
          if (res.ok) {
            const data = await res.json();
            setAnalysisStatus(data.status);
            if (data.status === 'FAILED') {
              setErrorMsg(data.error || 'Analysis failed.');
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [runId, analysisStatus]);
  
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setStatus('IDLE');
    setSuccessFilename('');
    setDocumentId(null);
    setAnalysisStatus('IDLE');
    setRunId(null);
    
    if (!selected) {
      setFile(null);
      return;
    }

    // 1. Client-side intake validation
    // Note: True binary validation happens securely during the future BUILD-005 processing stage.
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only PDF files are supported.');
      setFile(null);
      return;
    }
    
    // 10 MB application-level limit
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds the 10 MB application limit.');
      setFile(null);
      return;
    }
    
    setErrorMsg('');
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setStatus('UPLOADING');
    setErrorMsg('');
    
    // Log start (safely omitting sensitive details)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'rfp_upload_started');
    }

    // Generate collision-resistant secure path: {user_id}/{uuid}.pdf
    // Using native browser crypto API as required.
    const uuid = crypto.randomUUID();
    const storagePath = `${userId}/${uuid}.pdf`;

    try {
      // Step 1: Upload to Supabase Storage (which enforces bucket-level MIME/size/RLS)
      const { error: storageError } = await supabase.storage
        .from('rfps')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      // Step 2: Insert Database Record
      const { data: insertedDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          original_filename: file.name,
          storage_path: storagePath,
          size_bytes: file.size,
          status: 'UPLOADED'
        })
        .select('id')
        .single();

      // Partial Failure Edge Case:
      // If DB insert fails, we attempt to delete the orphaned storage object.
      // Note: If the client network drops here, the orphan will remain in storage.
      if (dbError) {
        console.error('Database insert failed, attempting storage rollback...', dbError);
        await supabase.storage.from('rfps').remove([storagePath]);
        throw new Error(`Database record failed: ${dbError.message}`);
      }

      // Step 3: Trigger Document Processing
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'document_processing_started');
      }

      const processRes = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: insertedDoc.id })
      });

      if (!processRes.ok) {
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'document_processing_failed');
        }
        throw new Error('Document uploaded, but processing failed. Please try again.');
      }

      const processData = await processRes.json();
      
      if (processData.status === 'OCR_REQUIRED') {
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'document_ocr_required');
        }
        setSuccessFilename(`${file.name} (Saved. Requires OCR processing)`);
      } else {
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'document_processing_completed');
        }
        setSuccessFilename(`${file.name} (Text Extracted successfully)`);
      }

      // Success
      setStatus('SUCCESS');
      setFile(null);
      setDocumentId(insertedDoc.id);
      
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'rfp_upload_completed');
      }

    } catch (err: unknown) {
      console.error(err);
      setStatus('ERROR');
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during upload.';
      setErrorMsg(errorMessage);
      
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as unknown as { gtag: (...args: string[]) => void }).gtag('event', 'rfp_upload_failed');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!documentId) return;
    setAnalysisStatus('QUEUED');
    setErrorMsg('');
    try {
      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Analysis failed');
      }
      const data = await res.json();
      
      if (!data.success) {
        if (data.status === 'AI_REJECTED') {
          setAnalysisStatus('REJECTED');
          setErrorMsg(`Document identified as non-procurement. Analysis stopped. Reason: ${data.reason}`);
          return;
        } else if (data.status === 'AI_AMBIGUOUS') {
          setAnalysisStatus('AMBIGUOUS');
          return;
        }
      }
      
      setRunId(data.runId || data.run_id || null);
      if (data.status) {
        setAnalysisStatus(data.status as any);
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisStatus('FAILED');
      setErrorMsg(err.message || 'Analysis failed to complete.');
    }
  };

  const handleConfirmProcurement = async () => {
    if (!documentId) return;
    try {
      const { error } = await supabase
        .from('documents')
        .update({ qualification_status: 'USER_CONFIRMED' })
        .eq('id', documentId);
        
      if (error) throw error;
      
      // Retry analysis
      handleAnalyze();
    } catch (err: any) {
      setErrorMsg('Failed to confirm document. ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload RFP</h2>
      
      <div className="mb-6">
        <label 
          htmlFor="file-upload" 
          className="block w-full cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100"
        >
          <span className="mt-2 block text-sm font-semibold text-gray-900">
            Select a PDF to analyze
          </span>
          <span className="mt-1 block text-sm text-gray-500">
            PDF files only, up to 10 MB
          </span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={handleFileChange}
            disabled={status === 'UPLOADING'}
          />
        </label>
      </div>

      {file && status !== 'SUCCESS' && (
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
          <span className="text-sm text-gray-700 truncate mr-4">{file.name}</span>
          <span className="text-xs font-medium text-gray-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {errorMsg}
        </div>
      )}

      {status === 'SUCCESS' && (
        <div className="mb-6 p-4 rounded-md bg-green-50 text-green-800 border border-green-200 text-sm flex justify-between items-center">
          <div>
            <strong>Secure upload successful.</strong> <br/>
            <span className="text-green-700">{successFilename}</span> has been securely stored.
          </div>
          {documentId && successFilename.includes('Text Extracted') && analysisStatus === 'IDLE' && (
            <button
              onClick={handleAnalyze}
              className="ml-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              Analyze RFP
            </button>
          )}
          {analysisStatus === 'QUEUED' && (
            <div className="ml-4 text-indigo-600 font-semibold text-sm">
              Queued for analysis...
            </div>
          )}
          {analysisStatus === 'PROCESSING' && (
            <div className="ml-4 text-indigo-600 font-semibold text-sm flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing document... (this usually takes about a minute)
            </div>
          )}
          {analysisStatus === 'FAILED' && (
            <div className="ml-4 text-red-600 font-semibold text-sm">
              Analysis Failed
            </div>
          )}
          {analysisStatus === 'REJECTED' && (
            <div className="ml-4 text-red-600 font-semibold text-sm">
              Qualification Rejected
            </div>
          )}
          {analysisStatus === 'AMBIGUOUS' && (
            <div className="ml-4 flex items-center space-x-2">
              <span className="text-yellow-700 text-sm">Classification uncertain. Is this a procurement opportunity?</span>
              <button
                onClick={handleConfirmProcurement}
                className="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-yellow-500"
              >
                Confirm as Procurement Opportunity
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!file || status === 'UPLOADING'}
          className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {status === 'UPLOADING' ? 'Uploading securely...' : 'Upload securely'}
        </button>
      </div>

      {runId && <AnalysisResults runId={runId} />}
    </div>
  );
}
