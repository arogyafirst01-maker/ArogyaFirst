const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint works!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
