import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/getCoin', (req, res) => {
  // TODO: Implement coin retrieval logic
  res.status(501).json({ error: 'Not implemented' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
