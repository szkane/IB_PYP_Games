/**
 * PlayScene - Main Game Loop
 * Handles the core spelling gameplay with grab & drop mechanics.
 */

class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
    this.currentWordIndex = 0;
    this.words = [];
    this.difficulty = 'medium';
    this.score = 0;
    this.correctWords = 0;
    this.incorrectAttempts = 0;
    this.currentWord = null;
    this.orbData = null;
    this.orbs = [];
    this.slots = [];
    this.phase = 'idle';
    this.grabbedOrb = null;
    this.spawner = new Spawner();
  }
  
  create() {
    const { width, height } = this.cameras.main;
    this.words = this.game.registry.get('selectedWords') || ['CAT', 'DOG'];
    this.difficulty = this.game.registry.get('selectedDifficulty') || 'medium';
    this.audioManager = this.game.registry.get('audioManager');
    this.words = Phaser.Utils.Array.Shuffle([...this.words]);
    
    // Background is transparent to show camera feed (with dark overlay)
    
    this.createHUD();
    // Position slots higher (at 70% from top = 30% from bottom)
    this.slotContainer = this.add.container(width / 2, height * 0.72);
    this.orbContainer = this.add.container(0, 0);
    
    // Child-friendly cursor colors (orange instead of cyan)
    const cursorSize = Math.max(35, Math.min(width, height) * 0.04);
    this.handCursor = this.add.circle(0, 0, cursorSize, 0xff9800, 0.5);
    this.handCursor.setStrokeStyle(4, 0xff9800);
    this.handCursor.setVisible(false);
    this.handCursor.setDepth(100);
    
    this.game.events.on('handUpdate', this.onHandUpdate, this);
    this.game.events.on('handStateChange', this.onHandStateChange, this);
    
    this.time.delayedCall(500, () => this.startWord());
  }
  
  createHUD() {
    const { width, height } = this.cameras.main;
    const fontSize = Math.max(20, Math.min(width, height) * 0.028);
    const theme = this.game.registry.get('selectedTheme') || 'scifi';
    const primaryColor = '#ffffff';  // Bright white for visibility
    const accentColor = '#66ff66';   // Bright green
    
    this.wordCounterText = this.add.text(30, 30, '', { 
      fontSize: `${fontSize}px`, 
      fontFamily: 'Fredoka', 
      color: primaryColor, 
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    this.scoreText = this.add.text(width - 30, 30, 'Score: 0', { 
      fontSize: `${fontSize}px`, 
      fontFamily: 'Fredoka', 
      color: accentColor, 
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0);
    
    // Much larger and brighter word display
    const wordFontSize = Math.max(48, Math.min(width, height) * 0.08);
    this.wordDisplay = this.add.text(width / 2, height * 0.15, '', { 
      fontSize: `${wordFontSize}px`, 
      fontFamily: 'Fredoka', 
      fontStyle: 'bold', 
      color: '#ffffff',
      stroke: '#ff9800',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);
    
    this.instructionText = this.add.text(width / 2, height * 0.24, '', { 
      fontSize: `${fontSize + 4}px`, 
      fontFamily: 'Nunito', 
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // Repeat button - larger and more visible
    const btnSize = Math.max(45, Math.min(width, height) * 0.05);
    this.repeatBtn = this.add.container(width - 100, height * 0.12);
    const repeatBg = this.add.circle(0, 0, btnSize, 0xff9800, 0.95).setStrokeStyle(4, 0xffffff);
    repeatBg.setInteractive();
    repeatBg.on('pointerdown', () => this.repeatWord());
    this.repeatBtn.add([repeatBg, this.add.text(0, 0, '🔊', { fontSize: `${btnSize}px` }).setOrigin(0.5)]);
    this.repeatBtn.setVisible(false);
    this.repeatBtn.setData('bg', repeatBg);
    this.repeatBtn.setData('radius', btnSize);
  }
  
  updateHUD() {
    this.wordCounterText.setText(`Word ${this.currentWordIndex + 1}/${this.words.length}`);
    this.scoreText.setText(`Score: ${this.score}`);
  }
  
  async startWord() {
    this.phase = 'listen';
    this.updateHUD();
    this.clearOrbs();
    this.clearSlots();
    
    this.currentWord = this.words[this.currentWordIndex];
    this.orbData = this.spawner.generateOrbsForWord(this.currentWord, this.difficulty);
    
    this.wordDisplay.setText('🎧 Listen...').setAlpha(1);
    this.instructionText.setText('Listen to the word...');
    
    if (this.audioManager) await this.audioManager.speakWord(this.currentWord);
    
    this.time.delayedCall(500, () => {
      this.phase = 'spawn';
      this.wordDisplay.setText(this.formatWordDisplay());
      this.createSlots();
      this.instructionText.setText('Grab letters and drop them in the slots!');
      this.repeatBtn.setVisible(true);
      this.time.delayedCall(300, () => { this.spawnOrbs(); this.phase = 'action'; });
    });
  }
  
  formatWordDisplay() {
    return this.orbData.blanks.map(b => b.isBlank && !b.isFilled ? '_' : b.letter).join(' ');
  }
  
  async repeatWord() { if (this.audioManager) await this.audioManager.speakWord(this.currentWord); }
  
  createSlots() {
    const { width, height } = this.cameras.main;
    // Larger slots - bigger than orbs for easy dropping
    const sw = Math.max(90, Math.min(width, height) * 0.12);
    const sh = Math.max(100, Math.min(width, height) * 0.14);
    const gap = Math.max(15, sw * 0.12);
    const letters = this.orbData.blanks;
    const startX = -(letters.length * sw + (letters.length - 1) * gap) / 2 + sw / 2;
    
    const theme = this.game.registry.get('selectedTheme') || 'scifi';
    const slotColor = theme === 'fantasy' ? 0xab47bc : 0x4fc3f7;
    const fontSize = Math.max(28, sw * 0.5);
    
    letters.forEach((blank, i) => {
      const slot = this.add.container(startX + i * (sw + gap), 0);
      const bg = this.add.rectangle(0, 0, sw, sh, slotColor, 0.15).setStrokeStyle(4, blank.isBlank ? slotColor : 0xbdbdbd);
      bg.setData('borderRadius', 15);
      slot.add(bg);
      if (!blank.isBlank) slot.add(this.add.text(0, 0, blank.letter, { fontSize: `${fontSize}px`, fontFamily: 'Fredoka', color: '#9e9e9e', fontStyle: 'bold' }).setOrigin(0.5));
      slot.setData({ index: i, blank, bg, filled: !blank.isBlank, expectedLetter: blank.letter });
      this.slots.push(slot);
      this.slotContainer.add(slot);
    });
  }
  
  spawnOrbs() {
    const { width, height } = this.cameras.main;
    const positions = this.spawner.generateSpawnPositions(this.orbData.orbs.length, width, height);
    const theme = this.game.registry.get('selectedTheme') || 'scifi';
    
    // Child-friendly bright colors
    const colors = theme === 'fantasy' 
      ? { fill: 0xce93d8, stroke: 0xab47bc, text: '#4a148c' } 
      : { fill: 0x4fc3f7, stroke: 0x29b6f6, text: '#01579b' };
    
    // Responsive orb sizing
    const orbRadius = Math.max(40, Math.min(width, height) * 0.05);
    const glowRadius = orbRadius * 1.3;
    const fontSize = Math.max(28, orbRadius * 0.7);
    
    this.orbData.orbs.forEach((info, i) => {
      const { x, y } = positions[i];
      const orb = this.add.container(x, y);
      orb.add([
        this.add.circle(0, 0, glowRadius, colors.fill, 0.3),
        this.add.circle(0, 0, orbRadius, colors.fill).setStrokeStyle(4, colors.stroke),
        this.add.text(0, 0, info.letter, { fontSize: `${fontSize}px`, fontFamily: 'Fredoka', fontStyle: 'bold', color: colors.text }).setOrigin(0.5)
      ]);
      orb.setData({ orbInfo: info, originalX: x, originalY: y, isGrabbed: false, glow: orb.list[0] });
      orb.setScale(0);
      this.tweens.add({ targets: orb, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.out', delay: i * 100 });
      this.tweens.add({ targets: orb, y: y + 8, duration: 1500 + Math.random() * 500, ease: 'Sine.inOut', yoyo: true, repeat: -1, delay: 300 + i * 100 });
      this.orbs.push(orb);
      this.orbContainer.add(orb);
    });
  }
  
  clearOrbs() { this.orbs.forEach(o => o.destroy()); this.orbs = []; }
  clearSlots() { this.slots.forEach(s => s.destroy()); this.slots = []; }
  
  onHandUpdate(data) {
    const { position, state } = data;
    this.handCursor.setPosition(position.x, position.y).setVisible(state !== 'IDLE');
    this.handCursor.setFillStyle(state === 'FIST' ? 0xff00ff : 0x00f3ff, 0.5);
    this.handCursor.setStrokeStyle(4, state === 'FIST' ? 0xff00ff : 0x00f3ff);
    this.handCursor.setScale(state === 'FIST' ? 1.2 : 1);
    if (this.grabbedOrb) this.grabbedOrb.setPosition(position.x, position.y);
    
    // Check for repeat button hover
    if (this.repeatBtn && this.repeatBtn.visible) {
      const btnRadius = this.repeatBtn.getData('radius') || 45;
      const distance = Phaser.Math.Distance.Between(
        position.x, position.y, 
        this.repeatBtn.x, this.repeatBtn.y
      );
      
      if (distance < btnRadius + 20) {
        // Highlight button when hovering
        this.repeatBtn.setScale(1.15);
        
        // Track hover time for gesture activation
        if (!this.repeatBtnHoverStart) {
          this.repeatBtnHoverStart = this.time.now;
        } else if (this.time.now - this.repeatBtnHoverStart > 800) {
          // Activate after 0.8s hover
          this.repeatWord();
          this.repeatBtnHoverStart = this.time.now + 2000; // Cooldown
        }
      } else {
        this.repeatBtn.setScale(1);
        this.repeatBtnHoverStart = 0;
      }
    }
  }
  
  onHandStateChange(newState, oldState) {
    if (this.phase !== 'action') return;
    if (newState === 'FIST' && oldState !== 'FIST') this.tryGrabOrb();
    else if (newState === 'OPEN' && oldState === 'FIST') this.tryDropOrb();
  }
  
  tryGrabOrb() {
    if (this.grabbedOrb) return;
    for (const orb of this.orbs) {
      if (Phaser.Math.Distance.Between(this.handCursor.x, this.handCursor.y, orb.x, orb.y) < 60) {
        this.grabbedOrb = orb;
        orb.setData('isGrabbed', true);
        this.tweens.killTweensOf(orb);
        orb.setScale(1.3);
        if (this.audioManager) this.audioManager.playGrabSound();
        break;
      }
    }
  }
  
  tryDropOrb() {
    if (!this.grabbedOrb) return;
    const orb = this.grabbedOrb;
    let targetSlot = null;
    
    for (const slot of this.slots) {
      if (slot.getData('filled')) continue;
      const slotWorld = this.slotContainer.getWorldTransformMatrix();
      if (Phaser.Math.Distance.Between(this.handCursor.x, this.handCursor.y, slotWorld.tx + slot.x, slotWorld.ty + slot.y) < 70) {
        targetSlot = slot;
        break;
      }
    }
    
    if (targetSlot) this.dropOrbInSlot(orb, targetSlot);
    else this.releaseOrb(orb);
  }
  
  dropOrbInSlot(orb, slot) {
    const orbInfo = orb.getData('orbInfo');
    const expected = slot.getData('expectedLetter');
    const blank = slot.getData('blank');
    
    if (orbInfo.letter === expected) {
      slot.setData('filled', true);
      blank.isFilled = true;
      slot.getData('bg').setFillStyle(0x00ff88, 0.3).setStrokeStyle(3, 0x00ff88);
      slot.add(this.add.text(0, 0, orbInfo.letter, { fontSize: '36px', fontFamily: 'Orbitron', fontStyle: 'bold', color: '#00ff88' }).setOrigin(0.5));
      this.orbs.splice(this.orbs.indexOf(orb), 1);
      orb.destroy();
      if (this.audioManager) this.audioManager.playCorrectSound();
      this.wordDisplay.setText(this.formatWordDisplay());
      this.score += 10;
      this.updateHUD();
      this.phase = 'feedback';
      this.time.delayedCall(300, () => this.checkWordComplete());
    } else {
      this.incorrectAttempts++;
      this.releaseOrb(orb);
      if (this.audioManager) this.audioManager.playWrongSound();
    }
    this.grabbedOrb = null;
    orb.setData('isGrabbed', false);
  }
  
  releaseOrb(orb) {
    const ox = orb.getData('originalX'), oy = orb.getData('originalY');
    orb.setScale(1);
    this.tweens.add({ targets: orb, x: ox, y: oy, duration: 300, ease: 'Quad.out', onComplete: () => {
      this.tweens.add({ targets: orb, y: oy + 10, duration: 1500, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
    }});
    this.grabbedOrb = null;
    orb.setData('isGrabbed', false);
  }
  
  checkWordComplete() {
    if (this.slots.every(s => s.getData('filled'))) this.handleWordComplete();
    else this.phase = 'action';
  }
  
  async handleWordComplete() {
    this.correctWords++;
    this.score += 50;
    this.updateHUD();
    this.wordDisplay.setText(`✓ ${this.currentWord}`).setTint(0x00ff88);
    this.instructionText.setText('Correct! 🎉');
    if (this.audioManager) await this.audioManager.playVictorySound();
    
    this.time.delayedCall(1500, () => {
      this.currentWordIndex++;
      if (this.currentWordIndex >= this.words.length) this.showResults();
      else { this.wordDisplay.clearTint(); this.startWord(); }
    });
  }
  
  showResults() {
    this.game.registry.set('finalScore', this.score);
    this.game.registry.set('correctWords', this.correctWords);
    this.game.registry.set('totalWords', this.words.length);
    this.game.registry.set('incorrectAttempts', this.incorrectAttempts);
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('ResultsScene'));
  }
}
