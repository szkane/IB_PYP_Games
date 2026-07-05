import { VOCAB } from '../src/literacy/wordquest/js/data.js';

console.log('typeof VOCAB:', typeof VOCAB);
console.log('VOCAB keys:', Object.keys(VOCAB));
console.log('kg length:', VOCAB.kg?.length);
console.log('kg[0]:', JSON.stringify(VOCAB.kg?.[0]));

const primer = VOCAB.kg?.find(c => c.name.includes('Primer'));
console.log('primer found:', !!primer);
if (primer) {
  console.log('primer name:', primer.name);
  console.log('primer words count:', primer.words.length);
  console.log('has empty:', primer.words.includes(''));
  console.log('last 5:', primer.words.slice(-5));
}
