/**
 * ResultsScene - Game Results and Star Rating
 */

class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }
  
  create() {
    const { width, height } = this.cameras.main;
    
    // Get results
    const score = this.game.registry.get('finalScore') || 0;
    const correct = this.game.registry.get('correctWords') || 0;
    const total = this.game.registry.get('totalWords') || 1;
    const incorrect = this.game.registry.get('incorrectAttempts') || 0;
    
    // Calculate stars (1-3)
    const accuracy = correct / total;
    let stars = 1;
    if (accuracy >= 0.9 && incorrect < 3) stars = 3;
    else if (accuracy >= 0.7) stars = 2;
    
    // Theme
    const theme = this.game.registry.get('selectedTheme') || 'scifi';
    const primaryColor = theme === 'fantasy' ? '#ff66cc' : '#00f3ff';
    
    // Background is transparent to show camera feed
    
    // Title
    const title = this.add.text(width / 2, 100, '🎉 Great Job! 🎉', {
      fontSize: '48px',
      fontFamily: 'Orbitron, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    title.setTint(0x00f3ff, 0xff00ff, 0x00f3ff, 0xff00ff);
    
    // Stars container
    const starY = 200;
    const starSpacing = 100;
    const starStartX = width / 2 - starSpacing;
    
    for (let i = 0; i < 3; i++) {
      const starX = starStartX + i * starSpacing;
      const earned = i < stars;
      
      const star = this.add.text(starX, starY, '⭐', {
        fontSize: '64px'
      }).setOrigin(0.5);
      
      star.setAlpha(earned ? 0 : 0.3);
      
      if (earned) {
        this.time.delayedCall(500 + i * 300, () => {
          star.setAlpha(1);
          this.tweens.add({
            targets: star,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Quad.out'
          });
        });
      }
    }
    
    // Stats
    this.add.text(width / 2, 320, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Orbitron, sans-serif',
      color: '#00ff88'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, 380, `Words: ${correct}/${total}`, {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      color: '#8899aa'
    }).setOrigin(0.5);
    
    if (incorrect > 0) {
      this.add.text(width / 2, 420, `Mistakes: ${incorrect}`, {
        fontSize: '18px',
        fontFamily: 'sans-serif',
        color: '#ff6666'
      }).setOrigin(0.5);
    }
    
    // Play Again button
    const btnY = 520;
    const btn = this.add.container(width / 2, btnY);
    
    const btnBg = this.add.rectangle(0, 0, 250, 60, 0x00f3ff);
    btnBg.setInteractive();
    btn.add(btnBg);
    
    const btnText = this.add.text(0, 0, 'Play Again', {
      fontSize: '24px',
      fontFamily: 'Orbitron, sans-serif',
      fontStyle: 'bold',
      color: '#0b0f19'
    }).setOrigin(0.5);
    btn.add(btnText);
    
    // Hover for gesture selection
    let hoverStart = 0;
    const hoverDuration = 1500;
    
    this.game.events.on('handUpdate', (data) => {
      const { position } = data;
      const bounds = btnBg.getBounds();
      
      if (bounds.contains(position.x, position.y)) {
        if (hoverStart === 0) hoverStart = this.time.now;
        
        const progress = (this.time.now - hoverStart) / hoverDuration;
        btn.setScale(1 + progress * 0.1);
        
        if (progress >= 1) {
          this.playAgain();
        }
      } else {
        hoverStart = 0;
        btn.setScale(1);
      }
    });
    
    // Click also works
    btnBg.on('pointerdown', () => this.playAgain());
    btnBg.on('pointerover', () => btn.setScale(1.05));
    btnBg.on('pointerout', () => btn.setScale(1));
    
    // Home button
    const homeBtn = this.add.text(width / 2, btnY + 80, '🏠 Back to Menu', {
      fontSize: '18px',
      fontFamily: 'sans-serif',
      color: primaryColor
    }).setOrigin(0.5).setInteractive();
    
    homeBtn.on('pointerdown', () => this.goHome());
    homeBtn.on('pointerover', () => homeBtn.setScale(1.1));
    homeBtn.on('pointerout', () => homeBtn.setScale(1));
    
    // Hand cursor
    this.handCursor = this.add.circle(0, 0, 30, 0x00f3ff, 0.5);
    this.handCursor.setStrokeStyle(3, 0x00f3ff);
    this.handCursor.setVisible(false);
    this.handCursor.setDepth(100);
    
    this.game.events.on('handUpdate', (data) => {
      this.handCursor.setPosition(data.position.x, data.position.y);
      this.handCursor.setVisible(data.state !== 'IDLE');
    });
    
    // Victory sound
    const audioManager = this.game.registry.get('audioManager');
    if (audioManager) {
      this.time.delayedCall(1000, () => audioManager.playVictorySound());
    }
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  playAgain() {
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SetupScene');
    });
  }
  
  goHome() {
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SetupScene');
    });
  }
}
