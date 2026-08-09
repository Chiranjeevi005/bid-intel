// @ts-expect-error - No types available for the internal file, but we must use it to bypass the Next.js ENOENT build bug
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export interface ParsedPage {
  page_number: number;
  content: string;
  char_count: number;
}

export interface ParseResult {
  pages: ParsedPage[];
  total_pages: number;
  total_chars: number;
  metadata: unknown;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParseResult> {
  const pages: ParsedPage[] = [];
  let pageIndex = 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function render_page(pageData: any) {
    const render_options = {
      normalizeWhitespace: false,
      disableCombineTextItems: false
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pageData.getTextContent(render_options).then(function(textContent: any) {
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY == item.transform[5] || !lastY){
            text += item.str;
        } else {
            text += '\n' + item.str;
        }    
        lastY = item.transform[5];
      }
      
      const charCount = text.length;
      pages.push({
        page_number: pageIndex++, // Safely incrementing per callback
        content: text,
        char_count: charCount
      });
      
      return text;
    });
  }

  const options = {
    pagerender: render_page
  };

  const data = await pdfParse(buffer, options);

  return {
    pages,
    total_pages: data.numpages,
    total_chars: pages.reduce((acc, page) => acc + page.char_count, 0),
    metadata: data.info
  };
}
