import { DOCTR_LATIN_VOCAB } from './vocab';

export interface DecodedSequence {
  text: string;
  confidence: number;
}

/**
 * CTC Greedy Decoder for CRNN and PARSeq logits
 */
export function ctcGreedyDecode(
  logits: Float32Array,
  seqLen: number,
  vocabSize: number,
  vocab: string[] = DOCTR_LATIN_VOCAB,
  blankIndex: number = vocab.length // default blank token at the end
): DecodedSequence {
  const chars: string[] = [];
  let prevIdx = -1;
  let totalProb = 0;
  let charCount = 0;

  for (let t = 0; t < seqLen; t++) {
    const offset = t * (vocabSize + 1);
    let maxLogit = -Infinity;
    let maxIdx = 0;

    // Argmax
    for (let c = 0; c <= vocabSize; c++) {
      const val = logits[offset + c];
      if (val > maxLogit) {
        maxLogit = val;
        maxIdx = c;
      }
    }

    // Softmax estimate for probability
    const expVal = Math.exp(Math.min(maxLogit, 20));
    let sumExp = 0;
    for (let c = 0; c <= vocabSize; c++) {
      sumExp += Math.exp(Math.min(logits[offset + c], 20));
    }
    const prob = sumExp > 0 ? expVal / sumExp : 0.9;

    // CTC Collapse: skip blanks and duplicate consecutive tokens
    if (maxIdx !== blankIndex && maxIdx !== prevIdx && maxIdx < vocab.length) {
      chars.push(vocab[maxIdx]);
      totalProb += prob;
      charCount++;
    }

    prevIdx = maxIdx;
  }

  const confidence = charCount > 0 ? totalProb / charCount : 0.85;
  return {
    text: chars.join(''),
    confidence: Number(Math.min(1.0, Math.max(0.1, confidence)).toFixed(3)),
  };
}

/**
 * PARSeq Autoregressive token decoder
 */
export function parseqDecode(
  tokenIds: Int32Array | number[],
  vocab: string[] = DOCTR_LATIN_VOCAB,
  eosToken: number = 1
): string {
  const chars: string[] = [];
  for (let i = 0; i < tokenIds.length; i++) {
    const id = tokenIds[i];
    if (id === eosToken) break;
    if (id >= 0 && id < vocab.length) {
      chars.push(vocab[id]);
    }
  }
  return chars.join('');
}
