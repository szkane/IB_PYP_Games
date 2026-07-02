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
    this.currentUnitPage = 0;
    
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
    
    // Show PYP Map link on menu homepage
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';
    
    // 重置所有状态（防止场景重用时状态混乱）
    this.currentStep = 0;
    this.selectedTheme = 'scifi';
    this.selectedAccent = 'US';
    this.selectedDifficulty = 'medium';
    this.selectedGrade = null;
    this.selectedUnit = null;
    this.currentUnitPage = 0;
    this.hoverTarget = null;
    this.hoverStartTime = 0;
    this.isProcessing = false; // 防止重复触发
    
    // Background is now transparent to show camera feed
    // UI particles removed to keep view clean
    
    // Title
    this.titleText = this.add.text(width / 2, 50, 'MoveSpell', {
      fontSize: '48px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Apply gradient effect to title using project colors (gold to coral)
    this.titleText.setTint(0xf2b84b, 0xe36b5a, 0xf2b84b, 0xe36b5a);
    
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
    
    // Child-friendly project-aligned colors
    const activeColor = 0xf2b84b;     // Gold
    const completedColor = 0x2d9d78;  // Green
    const pendingColor = 0x4a7cdd;    // Blue
    const bgColor = 0xffffff;         // White background
    
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
    const activeColor = 0xf2b84b;     // Gold
    const completedColor = 0x2d9d78;  // Green
    const pendingColor = 0x4a7cdd;    // Blue
    
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
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const subtext = this.add.text(0, -140, 'Hover over a portal for 1.5 seconds to select', {
      fontSize: '16px',
      fontFamily: 'Nunito, sans-serif',
      color: '#aabbcc'
    }).setOrigin(0.5);
    this.contentGroup.add(subtext);
    
    // Ocean Adventure Portal (Left)
    const scifiPortal = this.createPortal(-200, 30, '🌊', 'Ocean Adventure', 'Bright Blues & Oranges', 'scifi');
    this.contentGroup.add(scifiPortal);
    
    // Magic Forest Portal (Right)
    const fantasyPortal = this.createPortal(200, 30, '🌲', 'Magic Forest', 'Warm Purples & Greens', 'fantasy');
    this.contentGroup.add(fantasyPortal);
  }
  
  createPortal(x, y, icon, title, desc, value) {
    const container = this.add.container(x, y);
    
    // Background (dark navy fill, thick black border)
    const bg = this.add.rectangle(0, 0, 250, 300, 0x1a2238, 0.95);
    bg.setStrokeStyle(3, 0x17211f, 1);
    bg.setInteractive();
    bg.setData('value', value);
    bg.setData('type', 'theme');
    bg.setData('defaultStroke', 0x17211f);
    container.add(bg);
    
    // Icon
    const iconText = this.add.text(0, -60, icon, {
      fontSize: '64px'
    }).setOrigin(0.5);
    container.add(iconText);
    
    // Title
    const titleText = this.add.text(0, 30, title, {
      fontSize: '24px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(titleText);
    
    // Description
    const descText = this.add.text(0, 70, desc, {
      fontSize: '14px',
      fontFamily: 'Nunito, sans-serif',
      color: '#aabbcc'
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
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const subtext = this.add.text(0, -140, 'Grab a badge to hear the voice', {
      fontSize: '16px',
      fontFamily: 'Nunito, sans-serif',
      color: '#aabbcc'
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
    
    // Background circle (dark navy, thick dark line)
    const bg = this.add.circle(0, 0, 80, 0x1a2238, 0.95);
    bg.setStrokeStyle(3, 0x17211f, 1);
    bg.setInteractive();
    bg.setData('value', value);
    bg.setData('type', 'accent');
    bg.setData('defaultStroke', 0x17211f);
    container.add(bg);
    
    // Flag
    const flagText = this.add.text(0, -15, flag, {
      fontSize: '48px'
    }).setOrigin(0.5);
    container.add(flagText);
    
    // Label
    const labelText = this.add.text(0, 45, label, {
      fontSize: '14px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
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
      color: 0x2d9d78,
      value: 'easy'
    });
    this.contentGroup.add(easy);
    
    // Normal - Yellow/Gold, Rabbit emoji, 2 stars
    const normal = this.createDifficultyCard(0, 30, {
      emoji: '🐰',
      label: 'Normal',
      stars: 2,
      hint: 'Half the letters gone!',
      example: '_ A _',
      color: 0xf2b84b,
      value: 'medium'
    });
    this.contentGroup.add(normal);
    
    // Hard - Coral/Red, Lion emoji, 3 stars
    const hard = this.createDifficultyCard(220, 30, {
      emoji: '🦁',
      label: 'Hard',
      stars: 3,
      hint: 'All letters hidden!',
      example: '_ _ _',
      color: 0xe36b5a,
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
    
    // Solid shadow effect (neo-brutalist)
    const shadow = this.add.rectangle(5, 5, cardWidth, cardHeight, 0x17211f, 1);
    container.add(shadow);
    
    // Main card (warm cream, colored border)
    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0xfffaf0, 0.95);
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
      color: '#17211f'
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
      color: '#63706d',
      letterSpacing: 6
    }).setOrigin(0.5);
    container.add(exampleText);
    
    container.setData('bg', bg);
    container.setData('shadow', shadow);
    
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
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    // Get grades from word data
    const wordData = this.game.registry.get('wordData');
    if (!wordData || !wordData.curriculum) {
      console.error('Word data not loaded');
      return;
    }
    
    const grades = wordData.curriculum;
    const { width, height } = this.cameras.main;
    const cardWidth = Math.max(220, Math.min(width * 0.22, 280));
    
    const spacing = cardWidth + Math.max(20, width * 0.04);
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
    const { width, height } = this.cameras.main;
    const cardWidth = Math.max(220, Math.min(width * 0.22, 280));
    const cardHeight = Math.max(120, Math.min(height * 0.14, 140));

    // Back button
    const backBtn = this.add.text(-width * 0.35, -180, '← Back', {
      fontSize: '20px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
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
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.contentGroup.add(instruction);
    
    const units = this.selectedGrade.units;
    const allUnitsOption = { unit: 'all', label: '⭐ All Units', words: units.flatMap(u => u.words) };
    const allOptions = [allUnitsOption, ...units];
    
    // Pagination config
    const itemsPerPage = 6;
    const pagesCount = Math.ceil(allOptions.length / itemsPerPage);
    
    if (this.currentUnitPage >= pagesCount) this.currentUnitPage = pagesCount - 1;
    if (this.currentUnitPage < 0) this.currentUnitPage = 0;
    
    const pageItems = allOptions.slice(this.currentUnitPage * itemsPerPage, (this.currentUnitPage + 1) * itemsPerPage);
    
    const cols = 3;
    const spacingX = cardWidth + Math.max(20, width * 0.03);
    const spacingY = cardHeight + Math.max(15, height * 0.04);
    const startY = -80; // Higher up to make space for pagination controls
    
    pageItems.forEach((unit, index) => {
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
    
    // Render pagination controls if multiple pages exist
    if (pagesCount > 1) {
      const paginationY = startY + 1.9 * spacingY;
      
      // Page indicator text
      const pageText = this.add.text(0, paginationY, `Page ${this.currentUnitPage + 1} of ${pagesCount}`, {
        fontSize: '20px',
        fontFamily: 'Fredoka, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.contentGroup.add(pageText);
      
      // Prev button card
      if (this.currentUnitPage > 0) {
        const prevCard = this.createContentCard(
          -spacingX, paginationY,
          '◀ Previous',
          '',
          { type: 'page', value: 'prev', data: null }
        );
        this.contentGroup.add(prevCard);
      }
      
      // Next button card
      if (this.currentUnitPage < pagesCount - 1) {
        const nextCard = this.createContentCard(
          spacingX, paginationY,
          'Next ▶',
          '',
          { type: 'page', value: 'next', data: null }
        );
        this.contentGroup.add(nextCard);
      }
    }
  }
  
  createContentCard(x, y, title, subtitle, selectData) {
    const { width, height } = this.cameras.main;
    const cardWidth = Math.max(220, Math.min(width * 0.22, 280));
    const cardHeight = Math.max(120, Math.min(height * 0.14, 140));
    
    const container = this.add.container(x, y);
    
    // Neo-brutalist solid shadow
    const shadow = this.add.rectangle(4, 4, cardWidth, cardHeight, 0x17211f, 1);
    container.add(shadow);
    
    // Determine card stroke color (gold for page controls, dark black for unit/grade cards)
    const defaultStroke = selectData.type === 'page' ? 0xf2b84b : 0x17211f;
    
    // Main card background (dark navy fill, thick dark border)
    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1a2238, 0.95);
    bg.setStrokeStyle(3, defaultStroke, 1);
    bg.setInteractive();
    bg.setData('selectType', selectData.type);
    bg.setData('value', selectData.value);
    bg.setData('data', selectData.data);
    bg.setData('type', 'content');
    bg.setData('defaultStroke', defaultStroke);
    container.add(bg);
    
    const hasSubtitle = subtitle && subtitle.length > 0;
    const titleY = hasSubtitle ? -cardHeight * 0.12 : 0;
    const titleFontSize = Math.max(18, Math.round(cardWidth * 0.08));
    const subtitleFontSize = Math.max(13, Math.round(cardWidth * 0.055));
    
    const titleText = this.add.text(0, titleY, title, {
      fontSize: `${titleFontSize}px`,
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      wordWrap: { width: cardWidth - 20 },
      align: 'center'
    }).setOrigin(0.5);
    container.add(titleText);
    
    if (hasSubtitle) {
      const subtitleText = this.add.text(0, cardHeight * 0.2, subtitle, {
        fontSize: `${subtitleFontSize}px`,
        fontFamily: 'Nunito, sans-serif',
        color: '#aabbcc'
      }).setOrigin(0.5);
      container.add(subtitleText);
    }
    
    container.setData('bg', bg);
    container.setData('shadow', shadow);
    
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
    
    // Update cursor appearance based on state (gold/green project palette)
    if (state === 'FIST') {
      this.handCursor.setFillStyle(0x2d9d78, 0.5);
      this.handCursor.setStrokeStyle(3, 0x2d9d78);
    } else {
      this.handCursor.setFillStyle(0xf2b84b, 0.5);
      this.handCursor.setStrokeStyle(3, 0xf2b84b);
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
        const defaultStroke = bg.getData('defaultStroke') || 0x17211f;
        if (bounds.contains(position.x, position.y)) {
          foundTarget = bg;
          
          // Highlight with gold, line thickness 4
          bg.setStrokeStyle(4, 0xf2b84b, 1);
        } else {
          // Remove highlight and reset to default stroke and thickness 3
          bg.setStrokeStyle(3, defaultStroke, 1);
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
    // 防止重复触发
    if (this.isProcessing) {
      console.log('[SetupScene] Already processing, ignoring duplicate selection');
      return;
    }
    this.isProcessing = true;
    
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
        this.time.delayedCall(500, () => {
          this.isProcessing = false;
          this.showAccentSelection();
        });
        break;
        
      case 'accent':
        this.selectedAccent = value;
        if (audioManager) {
          audioManager.setAccent(value);
          audioManager.playTestSound();
        }
        this.time.delayedCall(1000, () => {
          this.isProcessing = false;
          this.showDifficultySelection();
        });
        break;
        
      case 'difficulty':
        this.selectedDifficulty = value;
        this.time.delayedCall(500, () => {
          this.isProcessing = false;
          this.showContentSelection();
        });
        break;
        
      case 'content':
        const selectType = target.getData('selectType');
        const data = target.getData('data');
        
        if (selectType === 'grade') {
          this.selectedGrade = data;
          this.currentUnitPage = 0; // Reset page on grade selection
          this.time.delayedCall(300, () => {
            this.isProcessing = false;
            this.showContentSelection(); // This calls clearContent() first
          });
        } else if (selectType === 'unit') {
          this.selectedUnit = data;
          this.startGame();
          // isProcessing 会在场景切换时自动重置
        } else if (selectType === 'page') {
          if (value === 'prev') {
            this.currentUnitPage = Math.max(0, this.currentUnitPage - 1);
          } else if (value === 'next') {
            this.currentUnitPage++;
          }
          this.time.delayedCall(150, () => {
            this.isProcessing = false;
            this.showContentSelection();
          });
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
    // Hide PYP Map link inside the active game
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'none';

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
  
  /**
   * Cleanup when scene shuts down
   */
  shutdown() {
    console.log('[SetupScene] Shutting down, cleaning up event listeners');
    
    // 移除事件监听器
    this.game.events.off('handUpdate', this.onHandUpdate, this);
    this.game.events.off('handStateChange', this.onHandStateChange, this);
    
    // 清除所有延迟回调
    this.time.removeAllEvents();
    
    // 重置状态
    this.isProcessing = false;
    this.hoverTarget = null;
    this.hoverStartTime = 0;
  }
}
