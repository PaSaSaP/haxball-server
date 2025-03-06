let chosen_player_names: string[] = [];

function commandChoosingPlayers(cmds: string[]) {
  if (!cmds.length) {
    return;
  }
  cmds.reverse().forEach(playerName => {
    let e = playerName;
    if (e) {
      let newName = playerName;
      const prevIdx = chosen_player_names.indexOf(newName);
      if (prevIdx !== -1) {
        chosen_player_names.splice(prevIdx, 1);
      }
      chosen_player_names.unshift(newName); // add always at the beginning, given player list is in reverse order so it it as expected
    }
  });
  console.log(`obecna lista: ${chosen_player_names}`);
}

function expect(expected: string[]) {
  if (JSON.stringify(expected) !== JSON.stringify(chosen_player_names)) {
    console.log(`Expected: ${expected}, current: ${chosen_player_names}`);
  } else console.log("OK");
}

commandChoosingPlayers([]);
expect([])
commandChoosingPlayers(["A", "B", "C"]);
expect(["A", "B", "C"]);
commandChoosingPlayers(["A", "B", "C"]);
expect(["A", "B", "C"]);
commandChoosingPlayers(["B", "A", "C"]);
expect(["B", "A", "C"]);
commandChoosingPlayers(["D", "E", "F"]);
expect(["D", "E", "F", "B", "A", "C"]);
commandChoosingPlayers(["E", "F"]);
expect(["E", "F", "D", "B", "A", "C"]);