/**
 * docTR / OnnxTR Character Vocabulary
 * Supports English Latin + Numbers + Punctuation + Currency Symbols (including ₹)
 */
export const DOCTR_LATIN_VOCAB: string[] = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',',
  '-', '.', '/', ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']',
  '^', '_', '`', '{', '|', '}', '~', '°', '₹', '€', '£', '¥'
];

export const VOCAB_MAP = new Map<number, string>();
DOCTR_LATIN_VOCAB.forEach((char, idx) => {
  VOCAB_MAP.set(idx, char);
});
