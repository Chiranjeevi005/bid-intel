import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCategoryCandidates, getPageCoverageAudit } from '@/lib/ai/retrieval';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        original_filename,
        size_bytes,
        status,
        qualification_status,
        qualification_reason,
        document_type,
        created_at,
        document_pages(count),
        analysis_runs(id, status, started_at, completed_at, last_error)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Determine completed document IDs to fetch their page coverage deterministically
    const completedDocIds = (documents || [])
      .filter((d: any) => d.analysis_runs?.[0]?.status === 'COMPLETED' || d.status === 'ANALYSIS_COMPLETE')
      .map((d: any) => d.id);

    const evaluatedPagesPerDoc: Record<string, number> = {};

    if (completedDocIds.length > 0) {
      const { data: pagesData } = await supabase
        .from('document_pages')
        .select('document_id, page_number, content')
        .in('document_id', completedDocIds)
        .order('page_number', { ascending: true });

      if (pagesData && pagesData.length > 0) {
        const pagesByDoc: Record<string, { page_number: number; content: string }[]> = {};
        for (const p of pagesData) {
          if (!pagesByDoc[p.document_id]) pagesByDoc[p.document_id] = [];
          pagesByDoc[p.document_id].push({ page_number: p.page_number, content: p.content });
        }

        for (const docId of completedDocIds) {
          const docPages = pagesByDoc[docId] || [];
          if (docPages.length > 0) {
            const candidateSets = getCategoryCandidates(docPages);
            const audit = getPageCoverageAudit(docPages, candidateSets);
            evaluatedPagesPerDoc[docId] = audit.evaluated_count;
          }
        }
      }
    }

    const formattedDocs = (documents || []).map((doc: any) => {
      const latestRun = doc.analysis_runs?.[0] || null;
      const totalPages = doc.document_pages?.[0]?.count || 0;

      let operationalStatus: string = latestRun?.status || doc.status;
      if (doc.qualification_status === 'AI_REJECTED' && latestRun?.status !== 'COMPLETED') {
        operationalStatus = 'REJECTED';
      } else if (doc.qualification_status === 'AI_AMBIGUOUS' && (!latestRun || latestRun?.status !== 'COMPLETED')) {
        operationalStatus = 'AMBIGUOUS';
      }

      // Authoritative recommended action
      let recommendedAction = 'Review extracted requirements and bid criteria.';
      if (doc.qualification_status === 'AI_REJECTED' || operationalStatus === 'REJECTED') {
        recommendedAction = 'Disqualified as non-RFP document. Review qualification details or perform manual override if this is a valid tender.';
      } else if (doc.qualification_status === 'AI_AMBIGUOUS' || operationalStatus === 'AMBIGUOUS') {
        recommendedAction = 'Ambiguous intake classification. Review candidate clauses, unindexed pages, and risk ledger before bidding.';
      } else if (operationalStatus === 'COMPLETED' || operationalStatus === 'ANALYSIS_COMPLETE') {
        recommendedAction = 'Analysis complete. Inspect high-priority attention lanes, verify requirement quotes, and review coverage audit.';
      } else if (operationalStatus === 'FAILED') {
        recommendedAction = 'Analysis failed. Inspect error logs and re-trigger extraction pipeline.';
      } else if (operationalStatus === 'UPLOADED' || operationalStatus === 'TEXT_EXTRACTED') {
        recommendedAction = 'Text extracted. Trigger analysis to classify requirements and detect risks.';
      }

      return {
        id: doc.id,
        original_filename: doc.original_filename,
        size_bytes: doc.size_bytes,
        status: doc.status,
        operational_status: operationalStatus,
        qualification_status: doc.qualification_status,
        qualification_reason: doc.qualification_reason,
        document_type: doc.document_type,
        created_at: doc.created_at,
        total_pages: totalPages,
        evaluated_pages_count: evaluatedPagesPerDoc[doc.id] ?? totalPages,
        recommended_action: recommendedAction,
        latest_run: latestRun
      };
    });

    return NextResponse.json({ documents: formattedDocs });
  } catch (err: any) {
    console.error('Documents List API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let user: any = null;

    // 1. Try Bearer token from authorization header first
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { createClient: createSupabaseJsClient } = await import('@supabase/supabase-js');
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const adminClient = createSupabaseJsClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        const { data: userData } = await adminClient.auth.getUser(token);
        if (userData?.user) {
          user = userData.user;
        }
      }
    }

    // 2. Fall back to cookie auth via createClient()
    if (!user) {
      try {
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData?.user) {
          user = authData.user;
        }
      } catch {
        // Fallback for non-request environments
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate size (10 MB maximum)
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json({ error: `File exceeds 10 MB limit (${sizeMB} MB).` }, { status: 400 });
    }

    // Validate PDF type and extension
    const filename = file.name || 'document.pdf';
    if (file.type !== 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Invalid file format. Only PDF documents are supported.' }, { status: 400 });
    }

    // 4. Upload to Supabase Storage bucket 'rfps' under user folder
    const storageKey = `${user.id}/${crypto.randomUUID()}.pdf`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { createClient: createSupabaseJsClient } = await import('@supabase/supabase-js');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server configuration error: missing service key' }, { status: 500 });
    }

    const adminClient = createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { error: uploadError } = await adminClient.storage
      .from('rfps')
      .upload(storageKey, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[API /api/documents POST] Storage Upload Error:', uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // 5. Insert record in PostgreSQL documents table
    const { data: docData, error: dbError } = await adminClient
      .from('documents')
      .insert({
        user_id: user.id,
        original_filename: filename,
        storage_path: storageKey,
        size_bytes: file.size,
        status: 'UPLOADED',
      })
      .select()
      .single();

    if (dbError || !docData) {
      console.error('[API /api/documents POST] Database Insert Error:', dbError);
      // Clean up orphaned storage object
      await adminClient.storage.from('rfps').remove([storageKey]);
      return NextResponse.json({ error: 'Failed to create document record.' }, { status: 500 });
    }

    return NextResponse.json({ document: docData }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/documents POST] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

