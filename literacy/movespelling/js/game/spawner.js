/**
 * Spawner - Smart Distractor Generation Algorithm
 * Generates letter orbs with intelligent distractors based on phonetic and visual confusion.
 */

// Phonetic and visual confusion map
const CONFUSION_MAP = {
  // Phonetic confusion (Sound alike)
  'A': ['E', 'I'],
  'B': ['P', 'D'],
  'C': ['K', 'S'],
  'D': ['T', 'B'],
  'E': ['I', 'A'],
  'F': ['V', 'S'],
  'G': ['J', 'K'],
  'H': ['A'],
  'I': ['E', 'Y'],
  'J': ['G', 'CH'],
  'K': ['C', 'G'],
  'L': ['R', 'W'],
  'M': ['N'],
  'N': ['M'],
  'O': ['U', 'A'],
  'P': ['B', 'T'],
  'Q': ['K'],
  'R': ['L', 'W'],
  'S': ['C', 'Z'],
  'T': ['D', 'P'],
  'U': ['O', 'W'],
  'V': ['F', 'W'],
  'W': ['V', 'U'],
  'X': ['S'],
  'Y': ['I', 'E'],
  'Z': ['S']
};

// Visual confusion map (letters that look alike)
const VISUAL_CONFUSION_MAP = {
  'B': ['D', 'R', 'P'],
  'C': ['G', 'O'],
  'D': ['B', 'O', 'Q'],
  'E': ['F'],
  'F': ['E', 'T'],
  'G': ['C', 'Q'],
  'H': ['N', 'M'],
  'I': ['L', 'T'],
  'J': ['I'],
  'K': ['X'],
  'L': ['I', 'T'],
  'M': ['N', 'W'],
  'N': ['M', 'H'],
  'O': ['Q', 'D', 'C'],
  'P': ['R', 'B'],
  'Q': ['O', 'G'],
  'R': ['P', 'B'],
  'S': ['Z', '5'],
  'T': ['I', 'L', 'F'],
  'U': ['V'],
  'V': ['U', 'W'],
  'W': ['M', 'V'],
  'X': ['K'],
  'Y': ['V'],
  'Z': ['S', '2']
};

// Vowels and consonants
const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'];

class Spawner {
  constructor() {
    this.usedLetters = new Set();
  }
  
  /**
   * Reset the spawner state for a new word
   */
  reset() {
    this.usedLetters.clear();
  }
  
  /**
   * Generate distractor letters for a target letter
   * Priority: Phonetic > Visual > Same type (vowel/consonant) > Random
   * @param {String} targetLetter - The letter to generate distractors for
   * @param {Number} count - Number of distractors to generate
   * @param {Array} excludeLetters - Letters to exclude from distractors
   * @returns {Array} Array of distractor letters
   */
  generateDistractors(targetLetter, count, excludeLetters = []) {
    const distractors = [];
    const excluded = new Set([...excludeLetters, targetLetter]);
    
    // Get phonetic confusions
    const phoneticConfusions = CONFUSION_MAP[targetLetter] || [];
    
    // Get visual confusions
    const visualConfusions = VISUAL_CONFUSION_MAP[targetLetter] || [];
    
    // Priority 1: Phonetic confusions
    for (const letter of phoneticConfusions) {
      if (distractors.length >= count) break;
      if (!excluded.has(letter) && letter.length === 1) {
        distractors.push(letter);
        excluded.add(letter);
      }
    }
    
    // Priority 2: Visual confusions
    for (const letter of visualConfusions) {
      if (distractors.length >= count) break;
      if (!excluded.has(letter) && letter.length === 1) {
        distractors.push(letter);
        excluded.add(letter);
      }
    }
    
    // Priority 3: Same type (vowel or consonant)
    const isVowel = VOWELS.includes(targetLetter);
    const sameTypePool = isVowel ? VOWELS : CONSONANTS;
    
    const shuffledPool = this.shuffle([...sameTypePool]);
    for (const letter of shuffledPool) {
      if (distractors.length >= count) break;
      if (!excluded.has(letter)) {
        distractors.push(letter);
        excluded.add(letter);
      }
    }
    
    // Priority 4: Random letters
    const allLetters = this.shuffle([...VOWELS, ...CONSONANTS]);
    for (const letter of allLetters) {
      if (distractors.length >= count) break;
      if (!excluded.has(letter)) {
        distractors.push(letter);
        excluded.add(letter);
      }
    }
    
    return distractors;
  }
  
  /**
   * Generate letter orb data for a word based on difficulty
   * @param {String} word - The target word
   * @param {String} difficulty - 'easy' | 'medium' | 'hard'
   * @returns {Object} { letters: Array, blanks: Array, orbs: Array }
   */
  generateOrbsForWord(word, difficulty = 'medium') {
    this.reset();
    
    const letters = word.toUpperCase().split('');
    const uniqueLetters = [...new Set(letters)];
    
    // Determine which positions to blank based on difficulty
    let blankIndices = [];
    
    switch (difficulty) {
      case 'easy':
        // Blank only 1 letter
        blankIndices = [Math.floor(Math.random() * letters.length)];
        break;
      case 'medium':
        // Blank ~50% of letters
        const halfCount = Math.ceil(letters.length / 2);
        blankIndices = this.getRandomIndices(letters.length, halfCount);
        break;
      case 'hard':
        // Blank all letters
        blankIndices = letters.map((_, i) => i);
        break;
    }
    
    // Create blank pattern
    const blanks = letters.map((letter, index) => ({
      position: index,
      letter: letter,
      isBlank: blankIndices.includes(index),
      isFilled: false
    }));
    
    // Get letters that need to be spelled
    const lettersToSpell = blankIndices.map(i => letters[i]);
    const uniqueLettersToSpell = [...new Set(lettersToSpell)];
    
    // Calculate distractor count (2-3 distractors per word length up to 5)
    const distractorCount = Math.min(Math.max(2, Math.floor(letters.length * 0.5)), 5);
    
    // Generate distractors
    const allDistractors = [];
    for (const letter of uniqueLettersToSpell) {
      const distractors = this.generateDistractors(letter, 2, [...uniqueLetters, ...allDistractors]);
      allDistractors.push(...distractors);
    }
    
    // Limit total distractors
    const limitedDistractors = allDistractors.slice(0, distractorCount);
    
    // Create orb data
    const orbLetters = [...lettersToSpell, ...limitedDistractors];
    const orbs = this.shuffle(orbLetters).map((letter, index) => ({
      id: `orb-${index}`,
      letter: letter,
      isCorrect: lettersToSpell.includes(letter),
      isGrabbed: false,
      isPlaced: false
    }));
    
    return {
      word: word,
      letters: letters,
      blanks: blanks,
      orbs: orbs,
      lettersToSpell: lettersToSpell
    };
  }
  
  /**
   * Get random indices from an array
   * @param {Number} length - Length of the array
   * @param {Number} count - Number of indices to get
   * @returns {Array} Array of random indices
   */
  getRandomIndices(length, count) {
    const indices = Array.from({ length }, (_, i) => i);
    const shuffled = this.shuffle(indices);
    return shuffled.slice(0, count).sort((a, b) => a - b);
  }
  
  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  /**
   * Generate spawn positions for orbs
   * @param {Number} count - Number of orbs
   * @param {Number} gameWidth - Game canvas width
   * @param {Number} gameHeight - Game canvas height
   * @returns {Array} Array of {x, y} positions
   */
  generateSpawnPositions(count, gameWidth, gameHeight) {
    const positions = [];
    const margin = Math.min(gameWidth * 0.1, 150); // Responsive margin
    
    // Spawn orbs in the middle area, closer to slots (which are at 25% from bottom)
    // This means orbs should be around 35-55% from the top
    const spawnAreaTop = gameHeight * 0.30;
    const spawnAreaBottom = gameHeight * 0.55;
    const spawnAreaLeft = margin;
    const spawnAreaRight = gameWidth - margin;
    
    // Distribute orbs in a horizontal line for easier access
    const orbSpacing = (spawnAreaRight - spawnAreaLeft) / (count + 1);
    
    for (let i = 0; i < count; i++) {
      // Spread horizontally
      const x = spawnAreaLeft + orbSpacing * (i + 1);
      // Slight vertical variation
      const y = spawnAreaTop + (spawnAreaBottom - spawnAreaTop) * (0.3 + Math.random() * 0.4);
      
      positions.push({ x, y });
    }
    
    return this.shuffle(positions);
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Spawner;
}
