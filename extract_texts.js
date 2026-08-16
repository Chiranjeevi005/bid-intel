const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const sourceDir = path.join(__dirname, 'benchmarks', 'sourced-public-datasets');
const outDir = path.join(__dirname, 'scratch_texts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

const manifestPath = path.join(__dirname, 'benchmarks', 'build-008h', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Custom page render function to inject page dividers
function render_page(pageData) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    }
    return pageData.getTextContent(render_options).then(function(textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY){
                text += item.str;
            } else {
                text += '\n' + item.str;
            }    
            lastY = item.transform[5];
        }
        return `\n---PAGE_${pageData.pageIndex + 1}---\n` + text;
    });
}

async function extractAll() {
  for (const doc of manifest) {
    if (doc.expected_qualification === 'NON_PROCUREMENT' || doc.id === 'DOC-001') {
      // Internal docs might not be in the sourced-public-datasets, skip them for now
      continue;
    }
    const pdfPath = path.join(sourceDir, doc.filename);
    if (!fs.existsSync(pdfPath)) {
      console.log(`File not found: ${pdfPath}`);
      continue;
    }
    
    console.log(`Extracting ${doc.id} - ${doc.filename}...`);
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdf(dataBuffer, { pagerender: render_page });
      fs.writeFileSync(path.join(outDir, `${doc.id}.txt`), data.text);
      console.log(`-> Saved to ${doc.id}.txt`);
    } catch (e) {
      console.log(`Error on ${doc.id}:`, e);
    }
  }
}

extractAll().catch(console.error);
