import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserDocumentsPayload } from '@/lib/server/documents';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getUserDocumentsPayload(user.id, supabase);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json(result);
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

