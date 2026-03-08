const http = require('http');

console.log("Testing stream API...");

const req = http.get('http://localhost:5000/api/songs/download?url=https://youtube.com/watch?v=SOJpE1KMUbo', (res) => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers, null, 2));

    let dataSize = 0;
    let chunks = [];

    res.on('data', (chunk) => {
        dataSize += chunk.length;
        chunks.push(chunk);
        if (dataSize > 10000) {
            console.log(`Received > 10KB of data (${dataSize} bytes). Stream seems to be working!`);
            req.destroy();
        }
    });

    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.log('Error Body:', Buffer.concat(chunks).toString());
        }
        console.log('No more data in response. Total bytes:', dataSize);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});
