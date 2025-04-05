import * as JSON5 from "json5";


// Przykładowy input w formacie JSON5 (przekazujesz tutaj swój string)
const inputJson5 = `
{
  "segments": [
  		{ "v0" : 233, "v1" : 234, "color" : "9eba72", "trait" : "art" },
		{ "v0" : 235, "v1" : 236, "color" : "c5c580", "trait" : "art" },
		{ "v0" : 237, "v1" : 238, "color" : "c8b690", "trait" : "art" },
		{ "v0" : 221, "v1" : 222, "color" : "a0aeb8", "trait" : "art" },
		{ "v0" : 223, "v1" : 224, "color" : "70a0b4", "trait" : "art" },
		{ "v0" : 225, "v1" : 226, "color" : "6090b0", "trait" : "art" },
		{ "v0" : 227, "v1" : 228, "color" : "5080ac", "trait" : "art" },
		{ "v0" : 229, "v1" : 230, "color" : "4070a4", "trait" : "art" },
		{ "v0" : 231, "v1" : 232, "color" : "3060a0", "trait" : "art" },
		{ "v0" : 212, "v1" : 219, "color" : "709868", "trait" : "art" },

		{ "v0" : 188, "v1" : 212, "vis" : false, "trait" : "playerArea" },
		{ "v0" : 194, "v1" : 192, "color" : "cfc999", "trait" : "playerArea" },

		{ "v0" : 239, "v1" : 253, "color" : "618361", "trait" : "art" },
		{ "v0" : 253, "v1" : 254, "color" : "5d7f5d", "trait" : "art" },
		{ "v0" : 254, "v1" : 242, "color" : "618361", "trait" : "art" },
		{ "v0" : 239, "v1" : 251, "color" : "3f613f", "trait" : "art" },
		{ "v0" : 251, "v1" : 252, "color" : "3b5d3b", "trait" : "art" },
		{ "v0" : 252, "v1" : 242, "color" : "3f613f", "trait" : "art" },
		{ "v0" : 239, "v1" : 240, "color" : "433a3a", "trait" : "art" },
		{ "v0" : 240, "v1" : 241, "color" : "433a3a", "trait" : "art" },
		{ "v0" : 241, "v1" : 242, "color" : "433a3a", "trait" : "art" },
		{ "v0" : 239, "v1" : 243, "color" : "895137", "trait" : "art" },
		{ "v0" : 243, "v1" : 244, "color" : "8b5339", "trait" : "art" },
		{ "v0" : 244, "v1" : 242, "color" : "895137", "trait" : "art" },
		{ "v0" : 239, "v1" : 245, "color" : "693921", "trait" : "art" },
		{ "v0" : 245, "v1" : 246, "color" : "693921", "trait" : "art" },
		{ "v0" : 246, "v1" : 242, "color" : "693921", "trait" : "art" },
		{ "v0" : 239, "v1" : 247, "color" : "5b321f", "trait" : "art" },
		{ "v0" : 247, "v1" : 248, "color" : "5b321f", "trait" : "art" },
		{ "v0" : 248, "v1" : 242, "color" : "5b321f", "trait" : "art" },
		{ "v0" : 239, "v1" : 249, "color" : "4f2d1d", "trait" : "art" },
		{ "v0" : 249, "v1" : 250, "color" : "4f2d1d", "trait" : "art" },
		{ "v0" : 250, "v1" : 242, "color" : "4f2d1d", "trait" : "art" },
		{ "v0" : 195, "v1" : 198, "color" : "556d55", "trait" : "art" },
		{ "v0" : 193, "v1" : 198, "color" : "556d55", "trait" : "art" },
		{ "v0" : 186, "v1" : 198, "color" : "556d55", "trait" : "art" },
		{ "v0" : 198, "v1" : 200, "color" : "556d55", "trait" : "art" },
		{ "v0" : 187, "v1" : 205, "color" : "5d755e", "trait" : "art" },
		{ "v0" : 191, "v1" : 205, "color" : "5d755e", "trait" : "art" },
		{ "v0" : 176, "v1" : 177, "color" : "eadaaa", "trait" : "art" },
		{ "v0" : 180, "v1" : 181, "color" : "cfc28f", "trait" : "art" },
		{ "v0" : 182, "v1" : 183, "color" : "9eaa62", "trait" : "art" },
		{ "v0" : 0, "v1" : 1, "color" : "ad9f73", "trait" : "art" },
		{ "v0" : 2, "v1" : 3, "color" : "b4a67a", "trait" : "art" },
		{ "v0" : 4, "v1" : 5, "color" : "b6a97d", "trait" : "art" },
		{ "v0" : 6, "v1" : 7, "color" : "bbac80", "trait" : "art" },
		{ "v0" : 8, "v1" : 9, "color" : "beaf82", "trait" : "art" },
		{ "v0" : 10, "v1" : 11, "color" : "c0b284", "trait" : "art" },
		{ "v0" : 12, "v1" : 13, "color" : "c2b486", "trait" : "art" },
		{ "v0" : 14, "v1" : 15, "color" : "c4b688", "trait" : "art" },
		{ "v0" : 16, "v1" : 17, "color" : "c6b88a", "trait" : "art" },
		{ "v0" : 18, "v1" : 19, "color" : "c8ba8c", "trait" : "art" },
		{ "v0" : 20, "v1" : 21, "color" : "c9bc8d", "trait" : "art" },
		{ "v0" : 22, "v1" : 23, "color" : "cabd8e", "trait" : "art" },
		{ "v0" : 24, "v1" : 25, "color" : "cbbe8f", "trait" : "art" },
		{ "v0" : 26, "v1" : 27, "color" : "ccbf90", "trait" : "art" },
		{ "v0" : 28, "v1" : 29, "color" : "cdc091", "trait" : "art" },
		{ "v0" : 30, "v1" : 31, "color" : "cec192", "trait" : "art" },
		{ "v0" : 32, "v1" : 33, "color" : "cfc293", "trait" : "art" },
		{ "v0" : 34, "v1" : 35, "color" : "d0c394", "trait" : "art" },
		{ "v0" : 36, "v1" : 37, "color" : "d1c495", "trait" : "art" },
		{ "v0" : 38, "v1" : 39, "color" : "d2c696", "trait" : "art" },
		{ "v0" : 40, "v1" : 41, "color" : "d3c797", "trait" : "art" },
		{ "v0" : 42, "v1" : 43, "color" : "d4c898", "trait" : "art" },
		{ "v0" : 44, "v1" : 45, "color" : "d5c999", "trait" : "art" },
		{ "v0" : 46, "v1" : 47, "color" : "d6ca9a", "trait" : "art" },
		{ "v0" : 48, "v1" : 49, "color" : "d7cb9b", "trait" : "art" },
		{ "v0" : 50, "v1" : 51, "color" : "d8cc9c", "trait" : "art" },
		{ "v0" : 52, "v1" : 53, "color" : "d9cd9d", "trait" : "art" },
		{ "v0" : 54, "v1" : 55, "color" : "dace9e", "trait" : "art" },
		{ "v0" : 56, "v1" : 57, "color" : "dbd09f", "trait" : "art" },
		{ "v0" : 58, "v1" : 59, "color" : "dcd1a0", "trait" : "art" },
		{ "v0" : 60, "v1" : 61, "color" : "ddd2a1", "trait" : "art" },
		{ "v0" : 62, "v1" : 63, "color" : "ded3a2", "trait" : "art" },
		{ "v0" : 64, "v1" : 65, "color" : "dfd4a3", "trait" : "art" },
		{ "v0" : 66, "v1" : 67, "color" : "e0d5a4", "trait" : "art" },
		{ "v0" : 68, "v1" : 69, "color" : "e1d6a5", "trait" : "art" },
		{ "v0" : 70, "v1" : 71, "color" : "e2d8a6", "trait" : "art" },
		{ "v0" : 72, "v1" : 73, "color" : "e3d9a7", "trait" : "art" },
		{ "v0" : 74, "v1" : 75, "color" : "e4daa8", "trait" : "art" },
		{ "v0" : 76, "v1" : 77, "color" : "e5dba9", "trait" : "art" },
		{ "v0" : 78, "v1" : 79, "color" : "e6dcaa", "trait" : "art" },
		{ "v0" : 80, "v1" : 81, "color" : "e7ddab", "trait" : "art" },
		{ "v0" : 82, "v1" : 83, "color" : "e8deac", "trait" : "art" },
		{ "v0" : 84, "v1" : 85, "color" : "e9e0ad", "trait" : "art" },
		{ "v0" : 86, "v1" : 87, "color" : "eae1ae", "trait" : "art" },
		{ "v0" : 88, "v1" : 89, "color" : "ebe2af", "trait" : "art" },
		{ "v0" : 90, "v1" : 91, "color" : "ece3b0", "trait" : "art" },
		{ "v0" : 92, "v1" : 93, "color" : "ede4b1", "trait" : "art" },
		{ "v0" : 94, "v1" : 95, "color" : "eee5b2", "trait" : "art" },
		{ "v0" : 96, "v1" : 97, "color" : "efe6b3", "trait" : "art" },
		{ "v0" : 98, "v1" : 99, "color" : "f0e8b4", "trait" : "art" },
		{ "v0" : 100, "v1" : 101, "color" : "f1e9b5", "trait" : "art" },
		{ "v0" : 102, "v1" : 103, "color" : "f2eab6", "trait" : "art" },
		{ "v0" : 104, "v1" : 105, "color" : "f3ebb7", "trait" : "art" },
		{ "v0" : 106, "v1" : 107, "color" : "f4ecb8", "trait" : "art" },
		{ "v0" : 108, "v1" : 109, "color" : "f5edb9", "trait" : "art" },
		{ "v0" : 110, "v1" : 111, "color" : "f5eeba", "trait" : "art" },
		{ "v0" : 112, "v1" : 113, "color" : "f6efbb", "trait" : "art" },
		{ "v0" : 114, "v1" : 115, "color" : "f6f0bc", "trait" : "art" },
		{ "v0" : 116, "v1" : 117, "color" : "f7f1bd", "trait" : "art" },
		{ "v0" : 118, "v1" : 119, "color" : "f7f2be", "trait" : "art" },
		{ "v0" : 120, "v1" : 121, "color" : "f8f3bf", "trait" : "art" },
		{ "v0" : 122, "v1" : 123, "color" : "f8f4c0", "trait" : "art" },
		{ "v0" : 124, "v1" : 125, "color" : "f9f5c1", "trait" : "art" },
		{ "v0" : 126, "v1" : 127, "color" : "f9f6c2", "trait" : "art" },
		{ "v0" : 128, "v1" : 129, "color" : "faf7c3", "trait" : "art" },
		{ "v0" : 130, "v1" : 131, "color" : "faf8c4", "trait" : "art" },
		{ "v0" : 132, "v1" : 133, "color" : "faf9c5", "trait" : "art" },
		{ "v0" : 134, "v1" : 135, "color" : "fbfac6", "trait" : "art" },
		{ "v0" : 136, "v1" : 137, "color" : "fbfac7", "trait" : "art" },
		{ "v0" : 138, "v1" : 139, "color" : "fbfbc8", "trait" : "art" },
		{ "v0" : 140, "v1" : 141, "color" : "fcfbc9", "trait" : "art" },
		{ "v0" : 142, "v1" : 143, "color" : "fcfcca", "trait" : "art" },
		{ "v0" : 144, "v1" : 145, "color" : "fcfccb", "trait" : "art" },
		{ "v0" : 146, "v1" : 147, "color" : "fdfdcc", "trait" : "art" },
		{ "v0" : 148, "v1" : 149, "color" : "fdfdcd", "trait" : "art" },
		{ "v0" : 150, "v1" : 151, "color" : "fdfdce", "trait" : "art" },
		{ "v0" : 152, "v1" : 153, "color" : "fefecf", "trait" : "art" },
		{ "v0" : 154, "v1" : 155, "color" : "fefed0", "trait" : "art" },
		{ "v0" : 156, "v1" : 157, "color" : "fefed1", "trait" : "art" },
		{ "v0" : 158, "v1" : 159, "color" : "ffffd2", "trait" : "art" },
		{ "v0" : 160, "v1" : 161, "color" : "ffffd3", "trait" : "art" },
		{ "v0" : 162, "v1" : 163, "color" : "ffffd4", "trait" : "art" },
		{ "v0" : 164, "v1" : 165, "color" : "ffffd5", "trait" : "art" },
		{ "v0" : 166, "v1" : 167, "color" : "ffffd6", "trait" : "art" },
		{ "v0" : 168, "v1" : 169, "color" : "ffffd7", "trait" : "art" },
		{ "v0" : 170, "v1" : 171, "color" : "faf0bc", "trait" : "art" },
		{ "v0" : 0, "v1" : 170, "color" : "d2c498", "trait" : "art" },
		{ "v0" : 1, "v1" : 171, "color" : "d2c498", "trait" : "art" },
		{ "v0" : 185, "v1" : 189, "color" : "d4c494", "trait" : "art" },
		{ "v0" : 187, "v1" : 188, "color" : "737373", "trait" : "art" },
		{ "v0" : 191, "v1" : 220, "color" : "555555", "trait" : "art" },
		{ "v0" : 213, "v1" : 214, "color" : "556d55", "trait" : "art" },
		{ "v0" : 215, "v1" : 216, "color" : "5d755e", "trait" : "art" },
		{ "v0" : 216, "v1" : 203, "color" : "b1a171", "trait" : "art" },
		{ "v0" : 214, "v1" : 199, "color" : "a19161", "trait" : "art" },
		{ "v0" : 200, "v1" : 201, "color" : "b1a171", "trait" : "art" },
		{ "v0" : 201, "v1" : 202, "color" : "c1b181", "trait" : "art" },
		{ "v0" : 202, "v1" : 197, "color" : "baaa7a", "trait" : "art" },
		{ "v0" : 199, "v1" : 204, "color" : "c1b181", "trait" : "art" },
		{ "v0" : 204, "v1" : 203, "color" : "baaa7a", "trait" : "art" },
		{ "v0" : 205, "v1" : 197, "color" : "b1a171", "trait" : "art" },
		{ "v0" : 199, "v1" : 200, "color" : "a99969", "trait" : "art" },
		{ "v0" : 206, "v1" : 210, "color" : "c1b181", "trait" : "art" },
		{ "v0" : 210, "v1" : 207, "color" : "baaa7a", "trait" : "art" },
		{ "v0" : 208, "v1" : 211, "color" : "baaa7a", "trait" : "art" },
		{ "v0" : 211, "v1" : 209, "color" : "baaa7a", "trait" : "art" },
		{ "v0" : 209, "v1" : 206, "color" : "a99969", "trait" : "art" },
		{ "v0" : 197, "v1" : 203, "color" : "b7a777", "trait" : "art" },
		{ "v0" : 207, "v1" : 208, "color" : "b7a777", "trait" : "art" },
		{ "v0" : 173, "v1" : 175, "color" : "435d91", "trait" : "art" },
		{ "v0" : 175, "v1" : 174, "color" : "3a5e9c", "trait" : "art" },
		{ "v0" : 174, "v1" : 172, "color" : "435d91", "trait" : "art" },
		{ "v0" : 172, "v1" : 173, "color" : "4c6286", "trait" : "art" },
		{ "v0" : 177, "v1" : 178, "color" : "eadaaa", "trait" : "art" },
		{ "v0" : 181, "v1" : 178, "color" : "cfc28f", "trait" : "art" },
		{ "v0" : 179, "v1" : 176, "color" : "eadaaa", "trait" : "art" },
		{ "v0" : 179, "v1" : 180, "color" : "cfc28f", "trait" : "art" },
		{ "v0" : 178, "v1" : 182, "color" : "a6aa6a", "trait" : "art" },
		{ "v0" : 183, "v1" : 179, "color" : "a6aa6a", "trait" : "art" },
		{ "v0" : 178, "v1" : 179, "color" : "98a060", "trait" : "art" },
		{ "v0" : 216, "v1" : 205, "color" : "909658", "trait" : "art" },
		{ "v0" : 189, "v1" : 190, "color" : "e1e1e1", "trait" : "art" },
		{ "v0" : 190, "v1" : 192, "color" : "dcdcdc", "trait" : "art" },

		{ "v0" : 195, "v1" : 196, "color" : "999999", "bCoef" : 0.65, "cMask" : ["ball" ] },
		{ "v0" : 195, "v1" : 196, "vis" : false, "color" : "999999", "bCoef" : 0, "cMask" : ["red","blue" ] },
		{ "v0" : 184, "v1" : 185, "color" : "797979", "bCoef" : 0.65, "cMask" : ["ball" ] },
		{ "v0" : 186, "v1" : 185, "color" : "5c5c5c", "bCoef" : 0.65, "cMask" : ["ball" ] },
		{ "v0" : 193, "v1" : 194, "color" : "757575", "bCoef" : 0.65, "cMask" : ["ball" ] },

		{ "v0" : 194, "v1" : 196, "vis" : false, "bCoef" : 0.65, "trait" : "ballArea" },

		{ "v0" : 188, "v1" : 212, "curve" : -244, "vis" : false, "bCoef" : 0, "cMask" : ["red" ], "cGroup" : ["redKO" ] },
		{ "v0" : 212, "v1" : 188, "curve" : -244, "vis" : false, "bCoef" : 0, "cMask" : ["blue" ], "cGroup" : ["blueKO" ] },

		{ "v0" : 217, "v1" : 218, "curve" : -180, "vis" : false, "trait" : "kickoffBarrier" },
		{ "v0" : 218, "v1" : 217, "curve" : -180, "vis" : false, "trait" : "kickoffBarrier" },

		{ "v0" : 212, "v1" : 186, "vis" : false, "trait" : "ballArea" }
  ]
}
`;

const data = JSON5.parse(inputJson5);

function darkenColor(hexColor: string, factor: number = 0.6): string {
  let r = parseInt(hexColor.substring(0, 2), 16);
  let g = parseInt(hexColor.substring(2, 4), 16);
  let b = parseInt(hexColor.substring(4, 6), 16);

  r = Math.max(0, Math.floor(r * factor));
  g = Math.max(0, Math.floor(g * factor));
  b = Math.max(0, Math.floor(b * factor));

  return `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Przyciemnienie kolorów w segmentach
if (data.segments && Array.isArray(data.segments)) {
  data.segments.forEach((segment: any) => {
    if (segment.trait === "art") {
      if (segment.color) {
        segment.color = darkenColor(segment.color);
      }
    }
  });
}

// Wyświetlenie zmodyfikowanego JSON
console.log(JSON.stringify(data, null, 2));

