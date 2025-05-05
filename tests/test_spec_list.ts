function moveAllTeamToSpecV1(
  specTeam: number[],
  savedSpecTeam: number[],
  inTeam: number[],
  inFavor: number[],
  addedWhileMatch: number[] = []
): number[] {
  const specNonAfk = specTeam.slice(); // zakładamy brak AFK

  let sortedSpec: number[] = [];
  for (const id of savedSpecTeam) {
    if (specNonAfk.includes(id) || addedWhileMatch.includes(id)) sortedSpec.push(id);
  }

  // Dodaj graczy których nie ma w savedSpecTeam (np. zupełnie nowi)
  for (const id of specNonAfk) {
    if (!sortedSpec.includes(id)) {
      sortedSpec.push(id);
    }
  }

  // Posortuj inTeam tak, by najpierw były te z addedWhileMatch
  inTeam.sort((a, b) => {
    const aInAdded = addedWhileMatch.includes(a);
    const bInAdded = addedWhileMatch.includes(b);

    if (aInAdded && !bInAdded) {
      return -1; // A comes first
    } else if (!aInAdded && bInAdded) {
      return 1; // B comes first
    }
    return 0; // Keep original order for others
  });

  // Wstaw graczy z drużyny
  let insertIdx = 1;
  for (const id of inTeam) {
    if (inFavor.includes(id)) {
      sortedSpec.splice(insertIdx, 0, id);
      insertIdx++;
    } else if (addedWhileMatch.includes(id)) {
      if (-1 === sortedSpec.findIndex(s => id === s))
          sortedSpec.push(id);
      // do nothing, currently in list
    } else {
      sortedSpec.push(id);
    }
  }

  return sortedSpec;
}


function arrays_equal(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function run_test(
  name: string,
  spec_team: number[],
  saved_spec_team: number[],
  in_team: number[],
  in_favor: number[],
  added_while_match: number[],
  expected: number[]
): void {
  const result = moveAllTeamToSpecV1(spec_team, saved_spec_team, in_team, in_favor, added_while_match);
  const ok = arrays_equal(result, expected);
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Got:      ${result}`);
  }
}

// === TEST CASES ===

run_test(
  "basic insert + addedWhileMatch",
  [1, 2, 3, 4],  // current spec
  [1, 2, 3, 4, 5, 6],  // saved spec
  [7, 8],  // moved team to spec
  [7],  // in favor
  [3, 4],  // added while match
  [1, 7, 2, 3, 4, 8]  // expected result
  // [1, 2, 3, 4, 7, 8]  // expected result
);

run_test(
  "missing from saved_spec_team",
  [10, 11, 12],  // current spec
  [11, 10],  // saved spec
  [13],  // moved team to spec
  [],  // in favor
  [],  // added while match
  [11, 10, 12, 13]  // expected result
);

run_test(
  "favor insert at index 1",
  [1, 2],  // current spec
  [2, 1],  // saved spec
  [3, 4],  // moved team to spec
  [4],  // in favor
  [],  // added while match
  [2, 4, 1, 3]  // expected result
);

run_test(
  "with addedWhileMatch reorder",
  [101, 102, 99],  // current spec
  [102, 101, 100, 99],  // saved spec
  [103, 104, 100],  // moved team to spec
  [103],  // in favor
  [100],  // added while match
  [102, 103, 101, 100, 99, 104]  // expected result
);

run_test(
  "added then moved to spec",
  [101, 102, 99, 100],  // current spec
  [102, 101, 100, 99, 100],  // saved spec
  [103, 104],  // moved team to spec
  [103],  // in favor
  [],  // added while match
  [102, 103, 101, 99, 100, 104]  // expected result
);

run_test(
  "lord kolba added at the end",
  [101, 102, 99],  // current spec
  [100, 101, 102, 99],  // saved spec
  [103, 104, 100],  // moved team to spec
  [],  // in favor
  [100],  // added while match
  [100, 101, 102, 99, 103, 104]  // expected result
);

run_test(
  "lost player",
  [15],  // current spec
  [15],  // saved spec
  [50,81,79,69],  // moved team to spec
  [],  // in favor
  [79],  // added while match
  [50,81,69,15]  // expected result
);
