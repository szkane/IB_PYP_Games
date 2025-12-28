/**
 * SetupScene - Configuration and Menu Scene
 * Handles theme selection, voice accent, difficulty, and content selection.
 */

class SetupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SetupScene' });
    
    this.currentStep = 0;
    this.steps = ['theme', 'accent', 'difficulty', 'content'];
    
    // Selection state
    this.selectedTheme = 'scifi';
    this.selectedAccent = 'US';
    this.selectedDifficulty = 'medium';
    this.selectedGrade = null;
    this.selectedUnit = null;
    
    // Hover timer for gesture selection
    this.hoverTarget = null;
    this.hoverStartTime = 0;
    this.hoverDuration = 1500; // 1.5 seconds to select
    
    // UI elements
    this.stepIndicator = null;
    this.contentGroup = null;
  }
  
  create() {
    const { width, height } = this.cameras.main;
    
    // Background is now transparent to show camera feed
    // UI particles removed to keep view clean
    
    // Title
    this.titleText = this.add.text(width / 2, 50, 'MoveSpell', {
      fontSize: '48px',
      fontFamily: 'Orbitron, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Apply gradient effect to title
    this.titleText.setTint(0x00f3ff, 0xff00ff, 0x00f3ff, 0xff00ff);
    
    // Step indicator
    this.createStepIndicator();
    
    // Content container group
    this.contentGroup = this.add.container(width / 2, height / 2);
    
    // Start with theme selection
    this.showThemeSelection();
    
    // Create hand cursor
    this.handCursor = this.add.circle(0, 0, 30, 0x00f3ff, 0.5);
    this.handCursor.setStrokeStyle(3, 0x00f3ff);
    this.handCursor.setVisible(false);
    
    // Listen for hand updates from game manager
    this.game.events.on('handUpdate', this.onHandUpdate, this);
    this.game.events.on('handStateChange', this.onHandStateChange, this);
  }
  
  createBackgroundParticles() {
    // Create subtle floating particles
    const particles = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: this.cameras.main.width },
      y: { min: 0, max: this.cameras.main.height },
      speed: { min: 10, max: 30 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 4000,
      frequency: 200
    });
  }
  
  createStepIndicator() {
    const { width } = this.cameras.main;
    const stepWidth = 140;
    const startX = width / 2 - (this.steps.length - 1) * stepWidth / 2;
    
    this.stepIndicators = [];
    this.stepLines = [];
    
    // Child-friendly bright colors
    const activeColor = 0xff9800;  // Orange
    const completedColor = 0x66bb6a;  // Green
    const pendingColor = 0x4fc3f7;  // Light blue
    const bgColor = 0xffffff;  // White background
    
    this.steps.forEach((step, index) => {
      const x = startX + index * stepWidth;
      const y = 100;
      
      // Step circle with white glow background
      const glow = this.add.circle(x, y, 24, bgColor, 0.3);
      const circle = this.add.circle(x, y, 18, index === 0 ? activeColor : pendingColor);
      circle.setStrokeStyle(3, bgColor);
      
      // Step number
      const number = this.add.text(x, y, (index + 1).toString(), {
        fontSize: '18px',
        fontFamily: 'Fredoka, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      // Step label
      const labels = ['🎨 Theme', '🔊 Voice', '⭐ Level', '📚 Words'];
      const label = this.add.text(x, y + 35, labels[index], {
        fontSize: '14px',
        fontFamily: 'Fredoka, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Connecting line (except for last)
      if (index < this.steps.length - 1) {
        const line = this.add.rectangle(x + stepWidth / 2, y, stepWidth - 50, 4, pendingColor, 0.5);
        line.setOrigin(0.5);
        this.stepLines.push(line);
      }
      
      this.stepIndicators.push({ circle, number, label, glow });
    });
  }
  
  updateStepIndicator(step) {
    const activeColor = 0xff9800;  // Orange
    const completedColor = 0x66bb6a;  // Green
    const pendingColor = 0x4fc3f7;  // Light blue
    
    this.stepIndicators.forEach((indicator, index) => {
      if (index < step) {
        indicator.circle.setFillStyle(completedColor);
        indicator.glow.setFillStyle(completedColor, 0.4);
      } else if (index === step) {
        indicator.circle.setFillStyle(activeColor);
        indicator.glow.setFillStyle(activeColor, 0.4);
        // Pulse animation for current step
        this.tweens.add({
          targets: indicator.glow,
          scaleX: 1.2,
          scaleY: 1.2,
          alpha: 0.2,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
      } else {
        indicator.circle.setFillStyle(pendingColor);
        indicator.glow.setFillStyle(0xffffff, 0.2);
      }
    });
    
    // Update connecting lines
    this.stepLines.forEach((line, index) => {
      if (index < step) {
        line.setFillStyle(completedColor, 0.8);
      } else {
        line.setFillStyle(pendingColor, 0.3);
      }
    });
  }
  
  clearContent() {
    this.contentGroup.removeAll(true);
    this.hoverTarget = null;
    this.hoverStartTime = 0;
  }
  
  /**
   * Step 1: Theme Selection
   */
  showThemeSelection() {
    this.clearContent();
    this.currentStep = 0;
    this.updateStepIndicator(0);
    
    const { width, height } = this.cameras.main;
    
    // Instruction
    const instruction = this.add.text(0, -180, 'Choose Your Theme', {
      fontSize: '32px',
      fontFamily: 'Orbitron, sans-serif'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const subtext = this.add.text(0, -140, 'Hover over a portal for 1.5 seconds to select', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#8899aa'
    }).setOrigin(0.5);
    this.contentGroup.add(subtext);
    
    // Sci-Fi Portal (Left)
    const scifiPortal = this.createPortal(-200, 30, '🤖', 'Sci-Fi', 'Cyberpunk Blue', 'scifi');
    this.contentGroup.add(scifiPortal);
    
    // Fantasy Portal (Right)
    const fantasyPortal = this.createPortal(200, 30, '🧚‍♀️', 'Fantasy', 'Magic Forest', 'fantasy');
    this.contentGroup.add(fantasyPortal);
  }
  
  createPortal(x, y, icon, title, desc, value) {
    const container = this.add.container(x, y);
    
    // Background
    const bg = this.add.rectangle(0, 0, 250, 300, 0x141e32, 0.8);
    bg.setStrokeStyle(3, 0x00f3ff, 0.3);
    bg.setInteractive();
    bg.setData('value', value);
    bg.setData('type', 'theme');
    container.add(bg);
    
    // Icon
    const iconText = this.add.text(0, -60, icon, {
      fontSize: '64px'
    }).setOrigin(0.5);
    container.add(iconText);
    
    // Title
    const titleText = this.add.text(0, 30, title, {
      fontSize: '24px',
      fontFamily: 'Orbitron, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(titleText);
    
    // Description
    const descText = this.add.text(0, 70, desc, {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#8899aa'
    }).setOrigin(0.5);
    container.add(descText);
    
    // Progress ring (hidden by default)
    const progressRing = this.add.graphics();
    progressRing.setVisible(false);
    progressRing.setData('progress', 0);
    container.add(progressRing);
    container.setData('progressRing', progressRing);
    container.setData('bg', bg);
    
    return container;
  }
  
  /**
   * Step 2: Accent Selection
   */
  showAccentSelection() {
    this.clearContent();
    this.currentStep = 1;
    this.updateStepIndicator(1);
    
    // Instruction
    const instruction = this.add.text(0, -180, 'Choose Voice Accent', {
      fontSize: '32px',
      fontFamily: 'Orbitron, sans-serif'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const subtext = this.add.text(0, -140, 'Grab a badge to hear the voice', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#8899aa'
    }).setOrigin(0.5);
    this.contentGroup.add(subtext);
    
    // US Badge
    const usBadge = this.createBadge(-150, 30, '🇺🇸', 'US English', 'US');
    this.contentGroup.add(usBadge);
    
    // UK Badge
    const ukBadge = this.createBadge(150, 30, '🇬🇧', 'UK English', 'UK');
    this.contentGroup.add(ukBadge);
  }
  
  createBadge(x, y, flag, label, value) {
    const container = this.add.container(x, y);
    
    // Background circle
    const bg = this.add.circle(0, 0, 80, 0x141e32, 0.8);
    bg.setStrokeStyle(3, 0x00f3ff, 0.5);
    bg.setInteractive();
    bg.setData('value', value);
    bg.setData('type', 'accent');
    container.add(bg);
    
    // Flag
    const flagText = this.add.text(0, -15, flag, {
      fontSize: '48px'
    }).setOrigin(0.5);
    container.add(flagText);
    
    // Label
    const labelText = this.add.text(0, 45, label, {
      fontSize: '14px',
      fontFamily: 'Orbitron, sans-serif'
    }).setOrigin(0.5);
    container.add(labelText);
    
    container.setData('bg', bg);
    
    return container;
  }
  
  /**
   * Step 3: Difficulty Selection
   */
  showDifficultySelection() {
    this.clearContent();
    this.currentStep = 2;
    this.updateStepIndicator(2);
    
    // Instruction with child-friendly text
    const instruction = this.add.text(0, -180, 'How Hard Do You Want It? 💪', {
      fontSize: '28px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const subtext = this.add.text(0, -140, 'Pick one!', {
      fontSize: '16px',
      fontFamily: 'Fredoka, sans-serif',
      color: '#aabbcc'
    }).setOrigin(0.5);
    this.contentGroup.add(subtext);
    
    // Easy - Green, Turtle emoji, 1 star
    const easy = this.createDifficultyCard(-220, 30, {
      emoji: '🐢',
      label: 'Easy',
      stars: 1,
      hint: 'Just 1 letter missing!',
      example: 'C _ T',
      color: 0x66bb6a,
      value: 'easy'
    });
    this.contentGroup.add(easy);
    
    // Normal - Orange, Rabbit emoji, 2 stars
    const normal = this.createDifficultyCard(0, 30, {
      emoji: '🐰',
      label: 'Normal',
      stars: 2,
      hint: 'Half the letters gone!',
      example: '_ A _',
      color: 0xff9800,
      value: 'medium'
    });
    this.contentGroup.add(normal);
    
    // Hard - Red, Lion emoji, 3 stars
    const hard = this.createDifficultyCard(220, 30, {
      emoji: '🦁',
      label: 'Hard',
      stars: 3,
      hint: 'All letters hidden!',
      example: '_ _ _',
      color: 0xef5350,
      value: 'hard'
    });
    this.contentGroup.add(hard);
  }
  
  createDifficultyCard(x, y, config) {
    const container = this.add.container(x, y);
    const { emoji, label, stars, hint, example, color, value } = config;
    
    // Card background with rounded corners effect
    const cardWidth = 180;
    const cardHeight = 220;
    
    // Glow effect
    const glow = this.add.rectangle(0, 0, cardWidth + 10, cardHeight + 10, color, 0.2);
    container.add(glow);
    
    // Main card
    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1a2744, 0.95);
    bg.setStrokeStyle(4, color);
    bg.setInteractive();
    bg.setData('value', value);
    bg.setData('type', 'difficulty');
    container.add(bg);
    
    // Big emoji at top
    const emojiText = this.add.text(0, -60, emoji, {
      fontSize: '56px'
    }).setOrigin(0.5);
    container.add(emojiText);
    
    // Difficulty name
    const labelText = this.add.text(0, 5, label, {
      fontSize: '24px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(labelText);
    
    // Stars row
    const starY = 40;
    const starSpacing = 25;
    const starsStartX = -((stars - 1) * starSpacing) / 2;
    for (let i = 0; i < stars; i++) {
      const star = this.add.text(starsStartX + i * starSpacing, starY, '⭐', {
        fontSize: '18px'
      }).setOrigin(0.5);
      container.add(star);
    }
    
    // Example text
    const exampleText = this.add.text(0, 75, example, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#aabbcc',
      letterSpacing: 6
    }).setOrigin(0.5);
    container.add(exampleText);
    
    container.setData('bg', bg);
    container.setData('glow', glow);
    
    return container;
  }
  
  /**
   * Step 4: Content Selection
   */
  showContentSelection() {
    this.clearContent();
    this.currentStep = 3;
    this.updateStepIndicator(3);
    
    if (!this.selectedGrade) {
      this.showGradeSelection();
    } else {
      this.showUnitSelection();
    }
  }
  
  showGradeSelection() {
    // Instruction
    const instruction = this.add.text(0, -180, 'Choose Grade', {
      fontSize: '32px',
      fontFamily: 'Orbitron, sans-serif'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    // Get grades from word data
    const wordData = this.game.registry.get('wordData');
    if (!wordData || !wordData.curriculum) {
      console.error('Word data not loaded');
      return;
    }
    
    const grades = wordData.curriculum;
    const spacing = 200;
    const startX = -(grades.length - 1) * spacing / 2;
    
    grades.forEach((grade, index) => {
      const card = this.createContentCard(
        startX + index * spacing,
        50,
        grade.label,
        `${grade.units.length} Units`,
        { type: 'grade', value: grade.grade, data: grade }
      );
      this.contentGroup.add(card);
    });
  }
  
  showUnitSelection() {
    // Back button
    const backBtn = this.add.text(-350, -180, '← Back', {
      fontSize: '20px',
      fontFamily: 'Orbitron, sans-serif',
      color: '#00f3ff'
    }).setOrigin(0, 0.5);
    backBtn.setInteractive();
    backBtn.on('pointerdown', () => {
      this.selectedGrade = null;
      this.showContentSelection();
    });
    this.contentGroup.add(backBtn);
    
    // Instruction
    const instruction = this.add.text(0, -180, `Grade ${this.selectedGrade.grade} - Choose Unit`, {
      fontSize: '28px',
      fontFamily: 'Orbitron, sans-serif'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const units = this.selectedGrade.units;
    const allUnitsOption = { unit: 'all', label: '⭐ All Units', words: units.flatMap(u => u.words) };
    const allOptions = [allUnitsOption, ...units];
    
    const cols = 3;
    const spacingX = 220;
    const spacingY = 150; // Increased from 120 for better separation
    
    // Calculate total rows for vertical centering
    const totalRows = Math.ceil(allOptions.length / cols);
    const startY = -((totalRows - 1) * spacingY) / 2 + 100; // Center cards vertically with more space from title
    
    allOptions.forEach((unit, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = (col - (cols - 1) / 2) * spacingX;
      const y = startY + row * spacingY;
      
      const wordCount = unit.words ? unit.words.length : 0;
      const card = this.createContentCard(
        x, y,
        unit.label,
        `${wordCount} words`,
        { type: 'unit', value: unit.unit, data: unit }
      );
      this.contentGroup.add(card);
    });
  }
  
  createContentCard(x, y, title, subtitle, selectData) {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 200, 110, 0x141e32, 0.8);
    bg.setStrokeStyle(2, 0x00f3ff, 0.3);
    bg.setInteractive();
    bg.setData('selectType', selectData.type);
    bg.setData('value', selectData.value);
    bg.setData('data', selectData.data);
    bg.setData('type', 'content');
    container.add(bg);
    
    const titleText = this.add.text(0, -15, title, {
      fontSize: '16px',
      fontFamily: 'Orbitron, sans-serif',
      fontStyle: 'bold',
      wordWrap: { width: 160 },
      align: 'center'
    }).setOrigin(0.5);
    container.add(titleText);
    
    const subtitleText = this.add.text(0, 20, subtitle, {
      fontSize: '12px',
      fontFamily: 'sans-serif',
      color: '#8899aa'
    }).setOrigin(0.5);
    container.add(subtitleText);
    
    container.setData('bg', bg);
    
    return container;
  }
  
  /**
   * Handle hand position updates
   */
  onHandUpdate(data) {
    const { position, state } = data;
    
    // Update cursor position
    this.handCursor.setPosition(position.x, position.y);
    this.handCursor.setVisible(state !== 'IDLE');
    
    // Update cursor appearance based on state
    if (state === 'FIST') {
      this.handCursor.setFillStyle(0xff00ff, 0.5);
      this.handCursor.setStrokeStyle(3, 0xff00ff);
    } else {
      this.handCursor.setFillStyle(0x00f3ff, 0.5);
      this.handCursor.setStrokeStyle(3, 0x00f3ff);
    }
    
    // Check for hover interactions
    this.checkHoverInteraction(position);
  }
  
  checkHoverInteraction(position) {
    // Get all interactive elements in content group
    let foundTarget = null;
    
    this.contentGroup.each((child) => {
      const bg = child.getData ? child.getData('bg') : null;
      if (bg && bg.input) {
        const bounds = bg.getBounds();
        if (bounds.contains(position.x, position.y)) {
          foundTarget = bg;
          
          // Highlight
          bg.setStrokeStyle(3, 0x00f3ff, 1);
        } else {
          // Remove highlight
          bg.setStrokeStyle(3, 0x00f3ff, 0.3);
        }
      }
    });
    
    // Handle hover timing
    if (foundTarget && foundTarget !== this.hoverTarget) {
      this.hoverTarget = foundTarget;
      this.hoverStartTime = this.time.now;
    } else if (!foundTarget) {
      this.hoverTarget = null;
      this.hoverStartTime = 0;
    }
    
    // Check if hover duration reached
    if (this.hoverTarget && this.time.now - this.hoverStartTime >= this.hoverDuration) {
      this.selectTarget(this.hoverTarget);
      this.hoverTarget = null;
      this.hoverStartTime = 0;
    }
  }
  
  /**
   * Handle hand state changes (for grab interactions)
   */
  onHandStateChange(newState, oldState) {
    if (newState === 'FIST' && this.hoverTarget) {
      // Instant selection on grab
      this.selectTarget(this.hoverTarget);
    }
  }
  
  /**
   * Handle selection of a target
   */
  selectTarget(target) {
    const type = target.getData('type');
    const value = target.getData('value');
    
    // Play selection sound
    const audioManager = this.game.registry.get('audioManager');
    if (audioManager) {
      audioManager.playGrabSound();
    }
    
    switch (type) {
      case 'theme':
        this.selectedTheme = value;
        this.applyTheme(value);
        this.time.delayedCall(500, () => this.showAccentSelection());
        break;
        
      case 'accent':
        this.selectedAccent = value;
        if (audioManager) {
          audioManager.setAccent(value);
          audioManager.playTestSound();
        }
        this.time.delayedCall(1000, () => this.showDifficultySelection());
        break;
        
      case 'difficulty':
        this.selectedDifficulty = value;
        this.time.delayedCall(500, () => this.showContentSelection());
        break;
        
      case 'content':
        const selectType = target.getData('selectType');
        const data = target.getData('data');
        
        if (selectType === 'grade') {
          this.selectedGrade = data;
          this.time.delayedCall(300, () => this.showContentSelection()); // This calls clearContent() first
        } else if (selectType === 'unit') {
          this.selectedUnit = data;
          this.startGame();
        }
        break;
    }
  }
  
  applyTheme(theme) {
    // Update body class for CSS theme
    document.body.className = theme === 'fantasy' ? 'theme-fantasy' : '';
    
    // Store in registry
    this.game.registry.set('theme', theme);
  }
  
  startGame() {
    // Store selections in registry
    this.game.registry.set('selectedTheme', this.selectedTheme);
    this.game.registry.set('selectedAccent', this.selectedAccent);
    this.game.registry.set('selectedDifficulty', this.selectedDifficulty);
    this.game.registry.set('selectedWords', this.selectedUnit.words);
    
    // Transition to play scene
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('PlayScene');
    });
  }
  
  update() {
    // Update hover progress visualization
    if (this.hoverTarget && this.hoverStartTime > 0) {
      const progress = Math.min((this.time.now - this.hoverStartTime) / this.hoverDuration, 1);
      
      // Visual feedback - scale up slightly
      this.hoverTarget.setScale(1 + progress * 0.1);
      
      // Could add progress ring here
    }
  }
}
