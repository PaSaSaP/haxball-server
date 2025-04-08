import { createHash } from 'crypto';
import { PlayerData } from './structs';

export function assignTeams(player1: PlayerData, player2: PlayerData)  {
  const team = selectTeamByPlayerAuth(player1.auth_id, player2.auth_id);
  return team;
}

export function selectTeamByPlayerAuth(playerAuth1: string, playerAuth2: string): 1|2 {
  const [a, b] = [playerAuth1, playerAuth2].sort();  // deterministyczne
  const combined = `${a}|${b}`;
  const hash = createHash('sha256').update(combined).digest();
  const first_byte = hash[0];
  return first_byte % 2 === 0? 1: 2;
}