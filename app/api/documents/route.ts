import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, original_filename, size_bytes, status, qualification_status, document_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (err: any) {
    console.error('Documents List API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
