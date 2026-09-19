import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeAnalysisPipeline } from '@/lib/pipeline/runner';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { document_id, user_confirmed, request_id } = body;

    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    // 1. Initialize SERVER-ONLY Supabase service-role client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing from environment');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // 2. Authenticate user session (Cookie or Bearer token)
    let user: any = null;
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userData, error: jwtError } = await serviceSupabase.auth.getUser(token);
      if (!jwtError && userData?.user) {
        user = userData.user;
      }
    }

    if (!user) {
      try {
        const { createClient: createServerClient } = await import('@/lib/supabase/server');
        const authSupabase = await createServerClient();
        const { data: sessionData, error: authError } = await authSupabase.auth.getUser();
        if (!authError && sessionData?.user) {
          user = sessionData.user;
        }
      } catch {
        // Ignored when outside Next.js cookie context
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Verify document ownership & text extraction status
    const { data: doc, error: docError } = await serviceSupabase
      .from('documents')
      .select('id, status, user_id, qualification_status, original_filename')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to analyze this document' }, { status: 403 });
    }

    if (doc.status !== 'TEXT_EXTRACTED') {
      return NextResponse.json({ error: 'Document pages not extracted yet. Please extract pages first.' }, { status: 400 });
    }

    // 4. Determine model & idempotency request ID
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
    const requestId = request_id || crypto.randomUUID();

    // 5. Call start_analysis_session RPC
    const { data: ledgerId, error: rpcError } = await serviceSupabase.rpc('start_analysis_session', {
      p_user_id: user.id,
      p_document_id: document_id,
      p_request_id: requestId,
      p_model: model
    });

    if (rpcError) {
      const errMsg = rpcError.message || '';

      if (errMsg.startsWith('FREE quota exceeded') || errMsg.startsWith('PRO quota exceeded')) {
        return NextResponse.json({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: errMsg
        }, { status: 403 });
      }

      if (errMsg.startsWith('An active analysis reservation already exists')) {
        return NextResponse.json({
          success: false,
          error: 'CONCURRENT_ANALYSIS',
          message: 'An analysis job is already in progress for this document.'
        }, { status: 409 });
      }

      if (errMsg.startsWith('Document not owned by user')) {
        return NextResponse.json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Document not owned by user.'
        }, { status: 403 });
      }

      if (errMsg.startsWith('Request ID already belongs to a different document')) {
        return NextResponse.json({
          success: false,
          error: 'INVALID_REQUEST_ID',
          message: errMsg
        }, { status: 400 });
      }

      console.error('start_analysis_session error:', rpcError);
      return NextResponse.json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: errMsg || 'An unexpected error occurred during analysis session initialization.'
      }, { status: 500 });
    }

    if (!ledgerId) {
      return NextResponse.json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to obtain entitlement reservation ledger ID.'
      }, { status: 500 });
    }

    // 6. Query ledger and associated run state
    const { data: ledgerEntry, error: ledgerError } = await serviceSupabase
      .from('analysis_entitlement_ledger')
      .select('id, status, analysis_run_id, analysis_runs!inner(id, status)')
      .eq('id', ledgerId)
      .single();

    if (ledgerError || !ledgerEntry) {
      console.error('Failed to query session state:', ledgerError);
      return NextResponse.json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: `Failed to query session state: ${ledgerError?.message || 'Ledger entry missing'}`
      }, { status: 500 });
    }

    const runId = ledgerEntry.analysis_run_id;
    const runStatus = (ledgerEntry.analysis_runs as any)?.status;

    // 7. Evaluate session state and prevent re-dispatch
    if (ledgerEntry.status === 'CONSUMED') {
      return NextResponse.json({
        success: true,
        document_id,
        runId,
        run_id: runId,
        ledgerId,
        status: 'COMPLETED',
        filename: doc.original_filename,
        message: 'Analysis already completed'
      }, { status: 200 });
    }

    if (ledgerEntry.status === 'RELEASED') {
      return NextResponse.json({
        success: false,
        document_id,
        runId,
        run_id: runId,
        ledgerId,
        status: 'FAILED',
        error: 'SESSION_TERMINATED',
        message: 'Analysis session previously terminated. A new analysis requires a new request_id.'
      }, { status: 409 });
    }

    if (ledgerEntry.status === 'RESERVED') {
      if (runStatus === 'PROCESSING') {
        return NextResponse.json({
          success: true,
          document_id,
          runId,
          run_id: runId,
          ledgerId,
          status: 'PROCESSING',
          filename: doc.original_filename,
          message: 'Analysis already in progress'
        }, { status: 200 });
      }

      if (runStatus === 'QUEUED') {
        // Atomic compare-and-swap (CAS) to claim dispatch responsibility
        const { data: claimedRun, error: claimError } = await serviceSupabase
          .from('analysis_runs')
          .update({ status: 'PROCESSING', started_at: new Date().toISOString() })
          .eq('id', runId)
          .eq('status', 'QUEUED')
          .select('id')
          .maybeSingle();

        if (claimError) {
          console.error('Error claiming analysis run dispatch:', claimError);
          return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: `Failed to claim analysis run: ${claimError.message}`
          }, { status: 500 });
        }

        if (!claimedRun) {
          // Another concurrent request claimed it
          return NextResponse.json({
            success: true,
            document_id,
            runId,
            run_id: runId,
            ledgerId,
            status: 'PROCESSING',
            filename: doc.original_filename,
            message: 'Analysis already in progress'
          }, { status: 200 });
        }
      }
    }

    // 8. Dispatch background execution (CAS winner)
    let dispatchEstablished = false;

    // Primary durable dispatcher: Inngest
    try {
      const { inngest } = await import('@/lib/inngest/client');
      await inngest.send({
        name: 'rfp.analysis.requested',
        data: {
          documentId: document_id,
          runId: runId,
          ledgerId: ledgerId,
          userConfirmed: !!user_confirmed
        }
      });
      dispatchEstablished = true;
    } catch (inngestErr: any) {
      console.warn('[analyze-document] Inngest dispatch failed, attempting local runner fallback:', inngestErr.message);
    }

    // Fallback dispatcher: local runner
    if (!dispatchEstablished) {
      try {
        executeAnalysisPipeline(document_id, runId, {
          userConfirmed: !!user_confirmed,
          ledgerId: ledgerId
        }).catch((unhandled: any) => {
          console.error('Fatal unhandled background pipeline rejection:', unhandled);
        });
        dispatchEstablished = true;
      } catch (runnerErr: any) {
        console.error('[analyze-document] Local runner fallback invocation failed:', runnerErr);
      }
    }

    // 9. Emergency cleanup if both dispatch mechanisms failed to initiate
    if (!dispatchEstablished) {
      console.error('[analyze-document] Both Inngest and local fallback failed to initiate. Executing emergency release.');
      let emergencyReleaseSucceeded = false;
      let emergencyError: Error | null = null;

      try {
        const { error: rpcCleanError } = await serviceSupabase.rpc('finalize_analysis_entitlement', {
          p_ledger_id: ledgerId,
          p_success: false,
          p_consumed: false
        });
        if (rpcCleanError) throw new Error(`RPC finalize error: ${rpcCleanError.message}`);

        const { error: runCleanError } = await serviceSupabase
          .from('analysis_runs')
          .update({
            status: 'FAILED',
            last_error: 'Failed to establish background pipeline dispatch',
            failed_at: new Date().toISOString()
          })
          .eq('id', runId);
        if (runCleanError) throw new Error(`analysis_runs update error: ${runCleanError.message}`);

        emergencyReleaseSucceeded = true;
      } catch (cleanErr: any) {
        emergencyError = cleanErr;
        console.error('CRITICAL: Emergency entitlement release failed:', cleanErr);
      }

      if (emergencyReleaseSucceeded) {
        return NextResponse.json({
          success: false,
          error: 'DISPATCH_FAILED_AND_RELEASED',
          message: 'Unable to initiate background analysis. Entitlement reservation was successfully released.'
        }, { status: 500 });
      } else {
        return NextResponse.json({
          success: false,
          error: 'DISPATCH_FAILED_RELEASE_FAILED',
          message: `Unable to initiate background analysis, and emergency entitlement release failed: ${emergencyError?.message || 'Unknown error'}`
        }, { status: 500 });
      }
    }

    // 10. Return success to client
    return NextResponse.json({
      success: true,
      document_id,
      runId,
      run_id: runId,
      ledgerId,
      status: 'PROCESSING',
      filename: doc.original_filename
    }, { status: 200 });

  } catch (err: any) {
    console.error('Analyze Document Dispatch Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
