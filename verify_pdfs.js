const https = require('https');

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function verifyPDF(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = https.request({
        method: 'HEAD',
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400 && res.headers['content-type'] && res.headers['content-type'].includes('pdf')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => { req.destroy(); resolve(false); });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

async function search(query) {
  const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
  const html = await fetchHTML(url);
  const regex = /href="([^"]+\.pdf)"/gi;
  let match;
  const links = [];
  while ((match = regex.exec(html)) !== null) {
    let link = match[1];
    if (link.startsWith('//')) link = 'https:' + link;
    else if (link.startsWith('/l/?uddg=')) {
        try {
            link = decodeURIComponent(link.split('uddg=')[1].split('&')[0]);
        } catch(e) {}
    }
    if (link.includes('.pdf') && !links.includes(link)) {
        links.push(link);
    }
  }
  
  for (const link of links) {
    if (await verifyPDF(link)) {
      return link;
    }
  }
  return null;
}

async function run() {
  console.log("Searching RFI...");
  const rfi = await search('RFI "Request for Information" +procurement ext:pdf');
  console.log("RFI:", rfi);
  
  console.log("Searching EOI...");
  const eoi = await search('EOI "Expression of Interest" +procurement ext:pdf');
  console.log("EOI:", eoi);
  
  console.log("Searching Tender...");
  const tender = await search('Tender IFB "Invitation for Bids" +procurement ext:pdf');
  console.log("Tender:", tender);
}

run();
