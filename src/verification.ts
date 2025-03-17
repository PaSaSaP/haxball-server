import crypto from 'crypto';
import * as config from "../src/config";
import { tokenDatabase } from './token_database';

const SECRET_KEY = 'No i co Sefinek?';

export function generateVerificationLink(player_name: string): string {
  const nonce = crypto.randomBytes(8).toString('hex'); // Generowanie losowego nonce
  const token = crypto.createHmac('sha256', SECRET_KEY) // HMAC z SHA256
    .update(player_name + nonce) // Łączenie nazwy gracza i nonce
    .digest('hex'); // Generowanie tokenu w formacie hex
  const shortToken = token.substring(0, 16);
  tokenDatabase.saveToken(player_name, shortToken);
  return `${config.webpageLink}/verify?token=${shortToken}`;
}
