

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

  // Dynamically import to prevent Next.js build-time DOM polyfill errors
  const pdfParseModule = await import('pdf-parse');
  // Handle both v1 default export and v2 named export
  // Cast to any to bypass outdated @types/pdf-parse which expects v1 API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyPdfParseModule: any = pdfParseModule;
  const parseFn = AnyPdfParseModule.default || AnyPdfParseModule.PDFParse || AnyPdfParseModule;
  
  let data;
  if (typeof parseFn === 'function' && !parseFn.prototype?.load) {
    // v1 API
    data = await parseFn(buffer, options);
  } else {
    // v2 API
    const { PDFParse } = AnyPdfParseModule;
    const parser = new PDFParse();
    
    // Convert Buffer to Uint8Array for v2
    const uint8Array = new Uint8Array(buffer);
    await parser.load(uint8Array);
    
    const pagesList = [];
    const numPages = parser.doc?.numPages || 1; // get total pages
    
    for (let i = 1; i <= numPages; i++) {
      const pageText = await parser.getPageText(i);
      pagesList.push({
        page_number: i,
        content: pageText || '',
        char_count: (pageText || '').length
      });
    }

    return {
      pages: pagesList,
      total_pages: numPages,
      total_chars: pagesList.reduce((acc: number, page: ParsedPage) => acc + page.char_count, 0),
      metadata: await parser.getInfo()
    };
  }

  return {
    pages,
    total_pages: data.numpages,
    total_chars: pages.reduce((acc, page) => acc + page.char_count, 0),
    metadata: data.info
  };
}
