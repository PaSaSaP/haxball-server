const CountdownEmojis = ["😀", "🙂", "😐", "😕", "☹️", "😡", "🤬", "💀", "☠️"];
const MaxAllowedNoMoveTime = 15.0 * 1000; // [ms]

// let afkTime = 4900;
function f(afkTime: number) {
  if (afkTime > MaxAllowedNoMoveTime - 9 * 1000) {
    let idx = Math.min(8 - Math.floor((MaxAllowedNoMoveTime - afkTime)/1000), 8);
    console.log(`idx=${idx}`);
  }
}

for (let i = 4500; i < 15500; i += 500) {
  f(i);
}
