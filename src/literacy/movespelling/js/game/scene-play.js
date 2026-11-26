/**
 * PlayScene - Main Game Loop
 * Handles core spelling gameplay with both Hand-Gesture Grab & Drop
 * and Touch / Mouse Phaser Drag-and-Drop, dynamic slot sizing for long words,
 * and proper Phaser 3 shutdown listener cleanup.
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
    this.slotWidth = 90;
    this.phase = 'idle';
    this.grabbedOrb = null;
    this.spawner = new Spawner();
  }

  create() {
    const { width, height } = this.cameras.main;

    // Reset round state cleanly on scene restart
    this.currentWordIndex = 0;
    this.score = 0;
    this.correctWords = 0;
    this.incorrectAttempts = 0;
    this.currentWord = null;
    this.orbData = null;
    this.orbs = [];
    this.slots = [];
    this.phase = 'idle';
    this.grabbedOrb = null;
    this.menuBtnHoverStart = 0;
    this.repeatBtnHoverStart = 0;

    // Hide PYP Map link inside the active game
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'none';

    this.words = this.game.registry.get('selectedWords') || ['CAT', 'DOG'];
    this.difficulty = this.game.registry.get('selectedDifficulty') || 'medium';
    this.audioManager = this.game.registry.get('audioManager');
    this.playMode = this.game.registry.get('playMode') || 'touch';
    this.words = Phaser.Utils.Array.Shuffle([...this.words]);

    this.createHUD();
    this.slotContainer = this.add.container(width / 2, height * 0.72);
    this.orbContainer = this.add.container(0, 0);

    // Single clean hand cursor (only shown when camera tracking emits handUpdate)
    const cursorSize = Math.max(35, Math.min(width, height) * 0.04);
    this.handCursor = this.add.circle(0, 0, cursorSize, 0xf2b84b, 0.5);
    this.handCursor.setStrokeStyle(4, 0xf2b84b);
    this.handCursor.setVisible(false);
    this.handCursor.setDepth(100);

    // Touch / Mouse drag-and-drop handlers
    this.onDragStart = (pointer, orb) => {
      if (this.phase !== 'action' || !orb || !orb.active) return;
      this.grabbedOrb = orb;
      orb.setData('isGrabbed', true);
      this.tweens.killTweensOf(orb);
      this.orbContainer.bringToTop(orb);
      orb.setScale(1.22);
      if (this.audioManager) this.audioManager.playGrabSound();
    };

    this.onDrag = (pointer, orb, dragX, dragY) => {
      if (this.grabbedOrb !== orb || !orb.active) return;
      orb.setPosition(dragX, dragY);
    };

    this.onDragEnd = (pointer, orb) => {
      if (!orb || !orb.active) return;
      if (this.grabbedOrb !== orb) return;
      this.tryDropOrbAt(orb, orb.x, orb.y);
    };

    this.input.on('dragstart', this.onDragStart);
    this.input.on('drag', this.onDrag);
    this.input.on('dragend', this.onDragEnd);

    this.game.events.on('handUpdate', this.onHandUpdate, this);
    this.game.events.on('handStateChange', this.onHandStateChange, this);
    this.events.once('shutdown', this.shutdown, this);

    this.time.delayedCall(500, () => this.startWord());
  }

  createHUD() {
    const { width, height } = this.cameras.main;
    const fontSize = Math.max(20, Math.min(width, height) * 0.028);
    const primaryColor = '#ffffff';
    const accentColor = '#66ff66';

    // Back to Menu button (neo-brutalist styled)
    this.menuBtn = this.add.container(80, 45);
    const menuBg = this.add.rectangle(0, 0, 110, 44, 0xe36b5a, 0.95).setStrokeStyle(3, 0x17211f);
    menuBg.setInteractive({ useHandCursor: true });
    menuBg.on('pointerdown', () => this.goBackToMenu());

    menuBg.on('pointerover', () => {
      menuBg.setScale(1.05);
      menuBg.setStrokeStyle(3, 0xf2b84b);
    });
    menuBg.on('pointerout', () => {
      menuBg.setScale(1);
      menuBg.setStrokeStyle(3, 0x17211f);
    });

    const menuText = this.add.text(0, 0, '← Menu', {
      fontSize: '16px',
      fontFamily: 'Fredoka, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.menuBtn.add([menuBg, menuText]);
    this.menuBtn.setData('bg', menuBg);

    this.wordCounterText = this.add.text(30, 82, '', {
      fontSize: `${fontSize}px`,
      fontFamily: 'Fredoka, sans-serif',
      color: primaryColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    this.scoreText = this.add.text(width - 30, 30, 'Score: 0', {
      fontSize: `${fontSize}px`,
      fontFamily: 'Fredoka, sans-serif',
      color: accentColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0);

    const wordFontSize = Math.max(40, Math.min(width, height) * 0.075);
    this.wordDisplay = this.add.text(width / 2, height * 0.15, '', {
      fontSize: `${wordFontSize}px`,
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#f2b84b',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);

    this.instructionText = this.add.text(width / 2, height * 0.24, '', {
      fontSize: `${fontSize + 2}px`,
      fontFamily: 'Nunito, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    const btnSize = Math.max(38, Math.min(width, height) * 0.048);
    this.repeatBtn = this.add.container(width - 90, height * 0.14);
    const repeatBg = this.add.circle(0, 0, btnSize, 0xf2b84b, 0.95).setStrokeStyle(3, 0x17211f);
    repeatBg.setInteractive({ useHandCursor: true });
    repeatBg.on('pointerdown', () => this.repeatWord());
    this.repeatBtn.add([repeatBg, this.add.text(0, 0, '🔊', { fontSize: `${Math.round(btnSize * 0.9)}px` }).setOrigin(0.5)]);
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
    this.instructionText.setText('Listen carefully to the word...');

    if (this.audioManager) await this.audioManager.speakWord(this.currentWord);

    if (!this.scene || !this.scene.isActive()) return;

    this.time.delayedCall(450, () => {
      if (!this.scene || !this.scene.isActive()) return;
      this.phase = 'spawn';
      this.wordDisplay.setText(this.formatWordDisplay());
      this.createSlots();
      this.instructionText.setText(
        this.playMode === 'touch'
          ? 'Drag and drop the letters into the matching slots!'
          : 'Grab letters (or drag with mouse/touch) into the slots!'
      );
      this.repeatBtn.setVisible(true);
      this.time.delayedCall(250, () => {
        if (!this.scene || !this.scene.isActive()) return;
        this.spawnOrbs();
        this.phase = 'action';
      });
    });
  }

  formatWordDisplay() {
    return this.orbData.blanks.map(b => b.isBlank && !b.isFilled ? '_' : b.letter).join(' ');
  }

  async repeatWord() {
    if (this.audioManager) await this.audioManager.speakWord(this.currentWord);
  }

  createSlots() {
    const { width, height } = this.cameras.main;
    const letters = this.orbData.blanks;
    const count = Math.max(1, letters.length);

    // Dynamic slot sizing so even 12-14 letter words never overflow viewport width
    const maxRowWidth = Math.max(280, width - 64);
    const gap = count > 9 ? 8 : Math.max(10, Math.min(18, Math.round(width * 0.014)));
    const maxSwForWord = Math.floor((maxRowWidth - (count - 1) * gap) / count);
    const sw = Math.max(38, Math.min(110, Math.round(Math.min(width, height) * 0.12), maxSwForWord));
    const sh = Math.min(122, Math.round(sw * 1.12));
    this.slotWidth = sw;

    const totalWidth = count * sw + (count - 1) * gap;
    const startX = -totalWidth / 2 + sw / 2;

    const theme = this.game.registry.get('selectedTheme') || 'scifi';
    const slotColor = theme === 'fantasy' ? 0xab47bc : 0x4fc3f7;
    const fontSize = Math.max(22, Math.min(48, Math.round(sw * 0.55)));

    letters.forEach((blank, i) => {
      const slot = this.add.container(startX + i * (sw + gap), 0);
      const bg = this.add.rectangle(0, 0, sw, sh, slotColor, 0.18).setStrokeStyle(4, blank.isBlank ? slotColor : 0xbdbdbd);
      bg.setData('borderRadius', 15);
      slot.add(bg);
      if (!blank.isBlank) {
        slot.add(this.add.text(0, 0, blank.letter, {
          fontSize: `${fontSize}px`,
          fontFamily: 'Fredoka, sans-serif',
          color: '#e2e8f0',
          fontStyle: 'bold'
        }).setOrigin(0.5));
      }
      slot.setData({ index: i, blank, bg, filled: !blank.isBlank, expectedLetter: blank.letter, fontSize });
      this.slots.push(slot);
      this.slotContainer.add(slot);
    });
  }

  spawnOrbs() {
    const { width, height } = this.cameras.main;
    const positions = this.spawner.generateSpawnPositions(this.orbData.orbs.length, width, height);
    const theme = this.game.registry.get('selectedTheme') || 'scifi';

    const colors = theme === 'fantasy'
      ? { fill: 0xe2f3ee, stroke: 0x2d9d78, text: '#17211f' }
      : { fill: 0xe8f4fc, stroke: 0x4a7cdd, text: '#17211f' };

    const orbRadius = Math.max(36, Math.min(54, Math.round(Math.min(width, height) * 0.052)));
    const glowRadius = orbRadius * 1.28;
    const fontSize = Math.max(26, Math.round(orbRadius * 0.72));

    this.orbData.orbs.forEach((info, i) => {
      const { x, y } = positions[i];
      const orb = this.add.container(x, y);
      orb.add([
        this.add.circle(0, 0, glowRadius, colors.fill, 0.3),
        this.add.circle(0, 0, orbRadius, colors.fill).setStrokeStyle(4, colors.stroke),
        this.add.text(0, 0, info.letter, {
          fontSize: `${fontSize}px`,
          fontFamily: 'Fredoka, sans-serif',
          fontStyle: 'bold',
          color: colors.text
        }).setOrigin(0.5)
      ]);
      orb.setSize(orbRadius * 2.2, orbRadius * 2.2);
      orb.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(orb);

      orb.setData({ orbInfo: info, originalX: x, originalY: y, isGrabbed: false, glow: orb.list[0] });
      orb.setScale(0);
      this.tweens.add({ targets: orb, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.out', delay: i * 80 });
      this.tweens.add({ targets: orb, y: y + 8, duration: 1500 + Math.random() * 500, ease: 'Sine.inOut', yoyo: true, repeat: -1, delay: 280 + i * 80 });
      this.orbs.push(orb);
      this.orbContainer.add(orb);
    });
  }

  clearOrbs() {
    this.orbs.forEach(o => o.destroy());
    this.orbs = [];
  }

  clearSlots() {
    this.slots.forEach(s => s.destroy());
    this.slots = [];
  }

  onHandUpdate(data) {
    const { position, state, detected } = data;
    const isVisible = state !== 'IDLE' && detected !== false;
    this.handCursor.setPosition(position.x, position.y).setVisible(isVisible);
    if (!isVisible) {
      this.menuBtnHoverStart = 0;
      this.repeatBtnHoverStart = 0;
      return;
    }
    this.handCursor.setFillStyle(state === 'FIST' ? 0x2d9d78 : 0xf2b84b, 0.5);
    this.handCursor.setStrokeStyle(4, state === 'FIST' ? 0x2d9d78 : 0xf2b84b);
    this.handCursor.setScale(state === 'FIST' ? 1.2 : 1);
    if (this.grabbedOrb) this.grabbedOrb.setPosition(position.x, position.y);

    if (this.menuBtn && this.menuBtn.visible) {
      const menuBg = this.menuBtn.getData('bg');
      const bounds = menuBg.getBounds();
      if (bounds.contains(position.x, position.y)) {
        menuBg.setScale(1.05);
        menuBg.setStrokeStyle(3, 0xf2b84b);
        if (!this.menuBtnHoverStart) {
          this.menuBtnHoverStart = this.time.now;
        } else if (this.time.now - this.menuBtnHoverStart > 1200) {
          this.goBackToMenu();
        }
      } else {
        menuBg.setScale(1);
        menuBg.setStrokeStyle(3, 0x17211f);
        this.menuBtnHoverStart = 0;
      }
    }

    if (this.repeatBtn && this.repeatBtn.visible) {
      const btnRadius = this.repeatBtn.getData('radius') || 45;
      const distance = Phaser.Math.Distance.Between(
        position.x, position.y,
        this.repeatBtn.x, this.repeatBtn.y
      );

      if (distance < btnRadius + 20) {
        this.repeatBtn.setScale(1.15);
        if (!this.repeatBtnHoverStart) {
          this.repeatBtnHoverStart = this.time.now;
        } else if (this.time.now - this.repeatBtnHoverStart > 800) {
          this.repeatWord();
          this.repeatBtnHoverStart = this.time.now + 2000;
        }
      } else {
        this.repeatBtn.setScale(1);
        this.repeatBtnHoverStart = 0;
      }
    }
  }

  goBackToMenu() {
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';
    this.scene.start('SetupScene');
  }

  onHandStateChange(newState, oldState) {
    if (this.phase !== 'action') return;
    if (newState === 'FIST' && oldState !== 'FIST') this.tryGrabOrb();
    else if ((newState === 'OPEN' || newState === 'IDLE') && oldState === 'FIST') this.tryDropOrb();
  }

  tryGrabOrb() {
    if (this.grabbedOrb) return;
    for (const orb of this.orbs) {
      if (Phaser.Math.Distance.Between(this.handCursor.x, this.handCursor.y, orb.x, orb.y) < 65) {
        this.grabbedOrb = orb;
        orb.setData('isGrabbed', true);
        this.tweens.killTweensOf(orb);
        this.orbContainer.bringToTop(orb);
        orb.setScale(1.25);
        if (this.audioManager) this.audioManager.playGrabSound();
        break;
      }
    }
  }

  tryDropOrb() {
    if (!this.grabbedOrb) return;
    this.tryDropOrbAt(this.grabbedOrb, this.handCursor.x, this.handCursor.y);
  }

  tryDropOrbAt(orb, px, py) {
    let targetSlot = null;
    let bestDist = Math.max(72, this.slotWidth * 0.9);
    const slotWorld = this.slotContainer.getWorldTransformMatrix();

    for (const slot of this.slots) {
      if (slot.getData('filled')) continue;
      const dist = Phaser.Math.Distance.Between(px, py, slotWorld.tx + slot.x, slotWorld.ty + slot.y);
      if (dist < bestDist) {
        bestDist = dist;
        targetSlot = slot;
      }
    }

    if (targetSlot) this.dropOrbInSlot(orb, targetSlot);
    else this.releaseOrb(orb);
  }

  dropOrbInSlot(orb, slot) {
    const orbInfo = orb.getData('orbInfo');
    const expected = slot.getData('expectedLetter');
    const blank = slot.getData('blank');
    const fontSize = slot.getData('fontSize') || 36;

    if (orbInfo.letter === expected) {
      slot.setData('filled', true);
      blank.isFilled = true;
      slot.getData('bg').setFillStyle(0x00ff88, 0.3).setStrokeStyle(3, 0x00ff88);
      slot.add(this.add.text(0, 0, orbInfo.letter, {
        fontSize: `${fontSize}px`,
        fontFamily: 'Fredoka, sans-serif',
        fontStyle: 'bold',
        color: '#00ff88'
      }).setOrigin(0.5));

      const idx = this.orbs.indexOf(orb);
      if (idx !== -1) this.orbs.splice(idx, 1);
      orb.destroy();

      if (this.audioManager) this.audioManager.playCorrectSound();
      this.wordDisplay.setText(this.formatWordDisplay());
      this.score += 10;
      this.updateHUD();
      this.phase = 'feedback';
      this.time.delayedCall(260, () => this.checkWordComplete());
    } else {
      this.incorrectAttempts++;
      this.releaseOrb(orb);
      if (this.audioManager) this.audioManager.playWrongSound();
    }
    this.grabbedOrb = null;
    if (orb && orb.active) orb.setData('isGrabbed', false);
  }

  releaseOrb(orb) {
    if (!orb || !orb.active) return;
    const ox = orb.getData('originalX');
    const oy = orb.getData('originalY');
    orb.setScale(1);
    this.tweens.add({
      targets: orb,
      x: ox,
      y: oy,
      duration: 280,
      ease: 'Quad.out',
      onComplete: () => {
        if (orb && orb.active) {
          this.tweens.add({ targets: orb, y: oy + 10, duration: 1500, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
        }
      }
    });
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

    if (!this.scene || !this.scene.isActive()) return;

    this.time.delayedCall(1200, () => {
      if (!this.scene || !this.scene.isActive()) return;
      this.currentWordIndex++;
      if (this.currentWordIndex >= this.words.length) this.showResults();
      else {
        this.wordDisplay.clearTint();
        this.startWord();
      }
    });
  }

  showResults() {
    this.game.registry.set('finalScore', this.score);
    this.game.registry.set('correctWords', this.correctWords);
    this.game.registry.set('totalWords', this.words.length);
    this.game.registry.set('incorrectAttempts', this.incorrectAttempts);
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('ResultsScene'));
  }

  /**
   * Cleanup when scene shuts down
   */
  shutdown() {
    console.log('[PlayScene] Shutting down, cleaning up event listeners');

    this.game.events.off('handUpdate', this.onHandUpdate, this);
    this.game.events.off('handStateChange', this.onHandStateChange, this);

    if (this.onDragStart) this.input.off('dragstart', this.onDragStart);
    if (this.onDrag) this.input.off('drag', this.onDrag);
    if (this.onDragEnd) this.input.off('dragend', this.onDragEnd);

    this.time.removeAllEvents();
    this.grabbedOrb = null;
    this.phase = 'idle';
  }
}
