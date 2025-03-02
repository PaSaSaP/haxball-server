export class Emoji {
  room: RoomObject;
  emojiInterval: any;

  constructor(room: RoomObject) {
    this.room = room;
    this.emojiInterval = null;
  }

  assignEmojisToPlayers() {
    let players = this.room.getPlayerList();
    players.forEach(player => {
      let randomEmoji = Emoji.funnyEmojis[Math.floor(Math.random() * Emoji.funnyEmojis.length)];
      this.room.setPlayerAvatar(player.id, randomEmoji);
    });
  }

  resetPlayerEmojis() {
    let players = this.room.getPlayerList();
    players.forEach(player => {
      this.room.setPlayerAvatar(player.id, null);
    });

  }

  startEmojiLoop() {
    if (this.emojiInterval !== null) {
      console.log("Emoji loop już działa!");
      return;
    }

    this.emojiInterval = setInterval(() => {
      this.assignEmojisToPlayers();
    }, 3000);

    console.log("Emoji loop uruchomiony!");
  }

  stopEmojiLoop() {
    if (this.emojiInterval !== null) {
      clearInterval(this.emojiInterval);
      this.resetPlayerEmojis();
      this.emojiInterval = null;
      console.log("Emoji loop zatrzymany!");
    } else {
      console.log("Emoji loop nie był uruchomiony.");
    }
  }

  turnOnOff() {
    if (this.emojiInterval !== null) {
      this.stopEmojiLoop();
    } else {
      this.startEmojiLoop();
    }
  }

  static funnyEmojis = [
    "💩", "🤣", "😂", "😹", "🤡", "👻", "💀", "😛", "🤪", "🦄", "🐸", "🐵", "🙈", "🙉", "🙊",
    "👽", "🛸", "🚀", "👾", "🤖", "🎃", "🥳", "🤑", "🤠", "👀", "😵", "🤯", "🤢", "🤮",
    "🤕", "🥴", "🤤", "👅", "👄", "🦷", "🦠", "🕷", "🐙", "🐍", "🦎", "🐢", "🐉", "🐲",
    "🍄", "🌵", "🌪", "🔥", "💥", "⚡", "☄️", "💨", "🌊", "🎩", "👑", "🦹", "🦸", "🦀",
    "🐡", "🐔", "🦜", "🐧", "🐧", "🦆", "🐦", "🐤", "🦢", "🦩", "🐢", "🐍", "🐛", "🐝",
    "🦗", "🦟", "🦠", "🍕", "🍔", "🌮", "🌯", "🥙", "🍖", "🍗", "🥩", "🍠", "🍜", "🍛",
    "🍤", "🦞", "🦑", "🍣", "🍱", "🥟", "🥠", "🍪", "🍩", "🍿", "🍭", "🍬", "🍫", "🍼",
    "☕", "🍵", "🥤", "🧃", "🧉", "🍾", "🍺", "🍻", "🥂", "🍷", "🥃", "🥳", "🎉", "🎊",
    "🎭", "🃏", "🎰", "🎲", "🎯", "🕹", "🎮", "📸", "📷", "📹", "🎥", "📺", "📻", "🎙",
    "🎤", "🎧", "🎵", "🎶", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎬", "🏆",
    "🎯", "🎳", "🏀", "🏈", "⚽", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🪀", "🏓", "🥏",
    "🛹", "🛷", "⛷", "🏂", "🚴", "🏇", "🤹", "🎭", "🕺", "💃", "🦸", "🦹", "🧙", "🧛",
    "🧜", "🧚", "🧞", "🧟", "👮", "🕵", "💂", "🤴", "👸", "🧑‍🚀", "🧑‍🚒", "🦸‍♂️", "🦸‍♀️",
    "🦹‍♂️", "🦹‍♀️", "🧙‍♂️", "🧙‍♀️", "🧛‍♂️", "🧛‍♀️", "🧜‍♂️", "🧜‍♀️", "🧚‍♂️", "🧚‍♀️", "🧞‍♂️", "🧞‍♀️",
    "🧟‍♂️", "🧟‍♀️", "🦄", "🐲", "👹", "👺", "🦊", "🐻", "🐼", "🐵", "🦍", "🦧", "🦝", "🦨",
    "🦡", "🦦", "🦥", "🐶", "🐱", "🦁", "🐯", "🐴", "🐮", "🐷", "🐗", "🐭", "🐹", "🐰"
  ];

  static Afk = '💤';
  // static AfkMaybe = '❓';
  static AfkMaybe = '💤';
}

