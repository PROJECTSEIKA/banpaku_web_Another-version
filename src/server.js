// server.js
const express = require('express');
const { Translate } = require('@google-cloud/translate').v2;

// Google CloudプロジェクトID
const projectId = 'seika-419310';
// Google Cloud認証情報へのパス
const keyFilename = 'C:/banpaku_2025/banpaku/public/keyfile.json'; 

const app = express();
app.use(express.json());

// Google Translateクライアントを初期化
const translate = new Translate({ projectId, keyFilename });

app.post('/translate', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).send({ error: 'Text is required.' });
  }

  try {
    const [translation] = await translate.translate(text, 'en');
    res.json({ translatedText: translation });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).send({ error: 'Translation failed.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});