const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static('public'));

// Changed port to 3333
const PORT = 3333;
const MTX_API = 'http://localhost:9997'; 
const MTX_PLAYBACK = 'http://localhost:9996';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

// List segments for the stream "mystream"
app.get('/api/list', async (req, res) => {
    try {
        const response = await axios.get(`${MTX_API}/v1/recordings/list`);
        const data = response.data.items.find(i => i.name === 'mystream');
        res.send(data ? data.segments : []);
    } catch (e) { res.status(500).send([]); }
});

// Live Clip (Last 30s)
app.post('/api/clip-live', (req, res) => {
    const fileName = `live_${Date.now()}.mp4`;
    const outputPath = path.join(DOWNLOAD_DIR, fileName);
    const cmd = `ffmpeg -i rtsp://localhost:8554/mystream -t 30 -c copy "${outputPath}"`;
    
    exec(cmd, (err) => {
        if (err) return res.status(500).send("FFmpeg Error");
        res.send({ url: `/downloads/${fileName}` });
    });
});

// Download Archive Range
app.get('/api/download', async (req, res) => {
    const { start, duration } = req.query;
    const filename = `archive_${start.replace(/[:.]/g, '-')}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    try {
        const response = await axios({
            method: 'get',
            url: `${MTX_PLAYBACK}/mystream/get?start=${start}&duration=${duration}&format=mp4`,
            responseType: 'stream'
        });
        response.data.pipe(res);
    } catch (e) { res.status(500).send("Export failed"); }
});

app.use('/downloads', express.static(DOWNLOAD_DIR));

// Start server on 3333
app.listen(PORT, () => console.log(`🚀 Clipper ready at http://localhost:${PORT}`));