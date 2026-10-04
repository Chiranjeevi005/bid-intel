import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDocumentAnalysisPayload } from '@/lib/server/document-analysis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Support both SSR cookie auth and Bearer token auth
    let user: any = null;
    let supabase: any = null;

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
          supabase = adminClient;
        }
      }
    }

    if (!user) {
      supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData?.user) {
        user = authData.user;
      }
    }

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDocumentAnalysisPayload(documentId, user.id, supabase);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json(result.data);

  } catch (err: any) {
    console.error('Document Analysis API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
