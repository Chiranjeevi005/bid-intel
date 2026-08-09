import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { parsePdfBuffer } from '@/lib/processing/pdf-parser';

export const runtime = 'nodejs';
// Vercel allows up to 300s on hobby for standard functions if explicitly opted in, but 60s is a safe explicit value for an API route processing a 10MB PDF.
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json({ error: 'Missing document_id' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Verify session (done automatically by SSR client under the hood, but let's be explicit)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query trusted storage_path from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('storage_path, status')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    if (document.status === 'TEXT_EXTRACTED') {
      return NextResponse.json({ message: 'Document already processed' }, { status: 200 });
    }

    // Mark as processing
    await supabase
      .from('documents')
      .update({ status: 'PROCESSING' })
      .eq('id', document_id);

    // 3. Download the private object
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('rfps')
      .download(document.storage_path);

    if (downloadError || !fileBlob) {
      await markFailed(supabase, document_id);
      return NextResponse.json({ error: 'Failed to download file from secure storage' }, { status: 500 });
    }

    // Convert Blob to Node Buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Extract text
    const parseResult = await parsePdfBuffer(buffer);
    
    // 5. Extraction Quality Diagnostics & Heuristics
    const totalPages = parseResult.total_pages;
    const totalChars = parseResult.total_chars;
    
    let pagesWithMeaningfulText = 0;
    let pagesWithLittleOrNoText = 0;

    for (const page of parseResult.pages) {
      // Heuristic: A page with fewer than 50 characters is likely scanned, empty, or just a title page.
      if (page.char_count > 50) {
        pagesWithMeaningfulText++;
      } else {
        pagesWithLittleOrNoText++;
      }
    }

    let finalStatus = 'TEXT_EXTRACTED';
    
    // Heuristic: If more than 50% of the pages have practically no text, this document is mixed or scanned and requires OCR.
    // Or if the total char count across all pages is extremely low (e.g. < 500 chars total).
    if (totalPages === 0) {
      finalStatus = 'FAILED';
    } else if (pagesWithMeaningfulText === 0 || (pagesWithLittleOrNoText / totalPages) > 0.5 || totalChars < 500) {
      finalStatus = 'OCR_REQUIRED';
    }

    if (finalStatus === 'FAILED') {
      await markFailed(supabase, document_id);
      return NextResponse.json({ error: 'PDF parsing failed to yield pages' }, { status: 400 });
    }

    // 6. Persist document_pages
    if (parseResult.pages.length > 0) {
      // We use upsert on (document_id, page_number) to ensure idempotency.
      const pagesToInsert = parseResult.pages.map(p => ({
        document_id,
        page_number: p.page_number,
        content: p.content,
        char_count: p.char_count
      }));

      const { error: insertError } = await supabase
        .from('document_pages')
        .upsert(pagesToInsert, { onConflict: 'document_id,page_number' });

      if (insertError) {
        await markFailed(supabase, document_id);
        console.error('Failed to insert pages:', insertError);
        return NextResponse.json({ error: 'Database persistence failed' }, { status: 500 });
      }
    }

    // 7. Update status
    await supabase
      .from('documents')
      .update({ status: finalStatus })
      .eq('id', document_id);

    return NextResponse.json({ 
      status: finalStatus, 
      diagnostics: {
        total_pages: totalPages,
        total_chars: totalChars,
        meaningful_pages: pagesWithMeaningfulText,
        empty_pages: pagesWithLittleOrNoText
      }
    }, { status: 200 });

  } catch (err: unknown) {
    console.error('Process error:', err);
    // Generic error returned to client to hide stack trace
    return NextResponse.json({ error: 'An unexpected processing error occurred' }, { status: 500 });
  }
}

async function markFailed(supabase: SupabaseClient, document_id: string) {
  await supabase
    .from('documents')
    .update({ status: 'FAILED' })
    .eq('id', document_id);
}
