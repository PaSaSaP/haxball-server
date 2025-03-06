import Glicko2 from 'glicko2';

const glicko = new Glicko2.Glicko2(); // Tworzysz instancję systemu Glicko2
let p = glicko.makePlayer(1, 1, 1);
console.log(p)