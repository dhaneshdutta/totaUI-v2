const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const ollmaUrl = 'http://localhost:11434/';

app.get('/models', async (req, res) => {
  try {
    const response = await axios.get(ollmaUrl + 'api/tags');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.post('/generate', async (req, res) => {
  try {
    const response = await axios.post(ollmaUrl + 'api/generate', req.body, {
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/plain');
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      lines.forEach(line => {
        try {
          const parsedLine = JSON.parse(line);
          if (parsedLine.response) {
            res.write(parsedLine.response);
          }
        } catch (e) {
          console.error('Failed to parse line:', line);
        }
      });
    });

    response.data.on('end', () => {
      res.end();
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
