import Joi from 'joi';
import { BackendLoginSecretKey } from "../src/secrets";

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const router = express.Router();
router.use(bodyParser.json());

function authenticateToken(req: any, res: any, next: any) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Brak tokenu' });

  jwt.verify(token, BackendLoginSecretKey, (err: any, user: string) => {
    if (err) return res.status(403).json({ message: 'Nieautoryzowany' });
    req.user = user;
    next();
  });
}

router.post('/:selector', authenticateToken, (req: any, res: any) => {
  const { selector } = req.params;
  const data = req.body.data;

  const schema = Joi.object({
    data: Joi.string()
      .pattern(/^thr[A-Za-z0-9._-]+$/)
      .length(39)
      .required(),
    selector: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).min(3).max(30).required()
  });

  const { error } = schema.validate({ data, selector });
  if (error) {
    return res.status(400).json({ message: 'Błędne dane: ' + error.details[0].message });
  }

  const safeSelector = selector.replace(/[^a-zA-Z0-9_]/g, '_');
  const filePath = path.join('/src', 'dynamic', `token_${safeSelector}.txt`);
  fs.appendFile(filePath, data + '\n', (err: any) => {
    if (err) {
      console.error('Błąd zapisu:', err);
      return res.status(500).json({ message: 'Błąd zapisu danych' });
    }
    res.status(200).json({ message: 'Dane zapisane' });
  });
});

export default router;
