// ai-worker.js — laat de computer (ai.js) op de achtergrond nadenken,
// zodat het bord blijft reageren. Wordt gestart door computer.js.

import { chooseMove } from './ai.js';

self.onmessage = (e) => {
  const { id, game, level } = e.data;
  let move = null;
  try {
    move = chooseMove(game, level);
  } catch {
    // niets: computer.js valt dan terug op een snelle zet
  }
  self.postMessage({ id, move });
};
