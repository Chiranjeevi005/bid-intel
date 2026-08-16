const https = require('https');

function search(query) {
  return new Promise((resolve) => {
    const postData = 'q=' + encodeURIComponent(query);
    const options = {
      hostname: 'lite.duckduckgo.com',
      port: 443,
      path: '/lite/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const links = [];
        const regex = /\/lite\/[^>]+uddg=([^&]+)/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          try {
            const url = decodeURIComponent(match[1]);
            if (url.includes('.pdf')) {
              links.push(url);
            }
          } catch(e) {}
        }
        resolve(links.slice(0, 3));
      });
    });
    req.write(postData);
    req.end();
  });
}

async function run() {
  const q3 = await search('RFI filetype:pdf site:.gov');
  const q4 = await search('EOI filetype:pdf site:.gov');
  const q5 = await search('Tender IFB filetype:pdf site:.gov');
  
  console.log("RFI:", q3);
  console.log("EOI:", q4);
  console.log("Tender:", q5);
}

run();
