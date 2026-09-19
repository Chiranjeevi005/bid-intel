import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * DELETE /api/documents/[documentId]
 * 
 * Permanently deletes a single user-owned document.
 * 
 * Invariant:
 * 1. Authenticates user session.
 * 2. Verifies document ownership (user_id === user.id).
 * 3. Enforces server-only SUPABASE_SERVICE_ROLE_KEY for privileged Storage removal.
 * 4. STORAGE-FIRST HARD GATE:
 *    - Attempts removal from Supabase Storage ('rfps' bucket).
 *    - If Storage deletion returns a real error (network, permission, 5xx),
 *      the handler STOPS immediately with 502. The database record is PRESERVED.
 *    - If Storage deletion succeeds (or file was already missing - idempotent),
 *      the handler proceeds to PostgreSQL deletion.
 * 5. Deletes the PostgreSQL documents row, triggering engine-level ON DELETE CASCADE
 *    across document_pages, analysis_runs, analysis_findings, analysis_finding_quotes,
 *    and analysis_metrics.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // 1. Authenticate user session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query document with strict ownership enforcement
    // Using user's authenticated client respects RLS, and explicit user_id filter ensures anti-enumeration
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, storage_path, user_id, original_filename')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !doc) {
      // Return 404 for non-existent, fabricated, or foreign documents (anti-enumeration)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 3. Strict Server-Side Service Role Validation
    // NEVER fall back to anon key for privileged backend storage operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('[Document Delete] Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing');
      return NextResponse.json(
        { error: 'Server configuration error. Storage deletion cannot be safely performed.' },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // 4. STORAGE-FIRST HARD GATE: Remove source PDF from Supabase Storage
    if (doc.storage_path) {
      const { data: storageData, error: storageError } = await adminSupabase.storage
        .from('rfps')
        .remove([doc.storage_path]);

      if (storageError) {
        console.error('[Document Delete] Storage removal failed:', storageError);
        // CRITICAL: Stop immediately. DO NOT touch PostgreSQL.
        return NextResponse.json(
          {
            error: 'Storage deletion failed. The document could not be removed from secure storage, so database records were preserved. Please retry.',
            details: storageError.message
          },
          { status: 502 }
        );
      }
    }

    // 5. Delete PostgreSQL root record using admin client (bypasses RLS while strictly enforcing user ownership)
    // Triggers ON DELETE CASCADE across:
    // - document_pages
    // - analysis_runs
    // - analysis_findings
    // - analysis_finding_quotes
    // - analysis_metrics
    const { error: dbDeleteError } = await adminSupabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (dbDeleteError) {
      console.error('[Document Delete] PostgreSQL deletion failed after storage removal:', dbDeleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete document records from database. Storage object was already freed. Please retry deletion to clean up database records.',
          details: dbDeleteError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document and all associated analysis data permanently deleted.',
      documentId,
      filename: doc.original_filename
    }, { status: 200 });

  } catch (err: any) {
    console.error('[Document Delete] Unexpected server exception:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
