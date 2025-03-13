import { BackendLoginSecretKey } from "../src/secrets";

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const users = [
  {
    username: 'kropka',
    password: '$2y$10$HAv82UND8J36PC5/uUTdbucU.YLzNQwoaOt.puuacVUuai2XQmR/.'
  }
];

const router = express.Router();
router.use(bodyParser.json());


router.post('/', (req: any, res: any) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'Użytkownik nie znaleziony' });

  bcrypt.compare(password, user.password, (err: any, result: any) => {
    if (!result) return res.status(403).json({ message: 'Nieprawidłowe hasło' });

    const token = jwt.sign({ username: user.username }, BackendLoginSecretKey, { expiresIn: '1h' });
    res.json({ token });
  });
});

export default router;
