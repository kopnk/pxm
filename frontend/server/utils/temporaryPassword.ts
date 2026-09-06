import { randomInt } from "node:crypto";

const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowercase = "abcdefghijkmnopqrstuvwxyz";
const digits = "23456789";
const symbols = "!@#$%*-_";
const allCharacters = `${uppercase}${lowercase}${digits}${symbols}`;

function randomCharacter(characters: string) {
  return characters[randomInt(characters.length)];
}

export function generateTemporaryPassword(length = 20) {
  if (length < 8) throw new Error("Temporary password length must be at least 8 characters.");

  const characters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(digits),
    randomCharacter(symbols),
    ...Array.from({ length: length - 4 }, () => randomCharacter(allCharacters)),
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const targetIndex = randomInt(index + 1);
    [characters[index], characters[targetIndex]] = [
      characters[targetIndex]!,
      characters[index]!,
    ];
  }

  return characters.join("");
}
