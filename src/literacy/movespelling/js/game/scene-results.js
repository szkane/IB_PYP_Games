/**
 * ResultsScene - Game Results and Star Rating
 */

class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }
  
  create() {
    const { width, height } = this.cameras.main;
    
    // Hide PYP Map link in results scene
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'none';
    
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
    
    // Background is transparent to show camera feed
    
    // Title
    const title = this.add.text(width / 2, 100, '🎉 Great Job! 🎉', {
      fontSize: '48px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    title.setTint(0xf2b84b, 0xe36b5a, 0xf2b84b, 0xe36b5a);
    
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
            repeat: -1,
            repeatDelay: 2000,
            ease: 'Quad.out'
          });
        });
      }
    }
    
    // Stats
    this.add.text(width / 2, 320, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#f2b84b'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, 380, `Words: ${correct}/${total}`, {
      fontSize: '24px',
      fontFamily: 'Nunito, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    if (incorrect > 0) {
      this.add.text(width / 2, 420, `Mistakes: ${incorrect}`, {
        fontSize: '18px',
        fontFamily: 'Nunito, sans-serif',
        fontStyle: 'bold',
        color: '#e36b5a'
      }).setOrigin(0.5);
    }
    
    // Play Again button
    const btnY = 520;
    const btn = this.add.container(width / 2, btnY);
    
    // Solid shadow (neo-brutalist)
    const btnShadow = this.add.rectangle(4, 4, 250, 60, 0x17211f);
    btn.add(btnShadow);
    
    // Main button background
    const btnBg = this.add.rectangle(0, 0, 250, 60, 0x2d9d78);
    btnBg.setStrokeStyle(3, 0x17211f);
    btnBg.setInteractive();
    btn.add(btnBg);
    
    const btnText = this.add.text(0, 0, 'Play Again', {
      fontSize: '24px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    btn.add(btnText);
    
    // Hover for gesture selection - STORE REFERENCE
    let hoverStart = 0;
    const hoverDuration = 1500;
    
    // Store the handler function reference for cleanup
    this.buttonHoverHandler = (data) => {
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
    };
    
    this.game.events.on('handUpdate', this.buttonHoverHandler);
    
    // Click also works
    btnBg.on('pointerdown', () => this.playAgain());
    btnBg.on('pointerover', () => btn.setScale(1.05));
    btnBg.on('pointerout', () => btn.setScale(1));
    
    // Home button
    const homeBtn = this.add.text(width / 2, btnY + 80, '🏠 Back to Menu', {
      fontSize: '18px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive();
    
    homeBtn.on('pointerdown', () => this.goHome());
    homeBtn.on('pointerover', () => homeBtn.setScale(1.1));
    homeBtn.on('pointerout', () => homeBtn.setScale(1));
    
    // Hand cursor - STORE REFERENCE (orange/gold instead of cyan)
    this.handCursor = this.add.circle(0, 0, 30, 0xf2b84b, 0.5);
    this.handCursor.setStrokeStyle(3, 0xf2b84b);
    this.handCursor.setVisible(false);
    this.handCursor.setDepth(100);
    
    // Store the handler function reference for cleanup
    this.cursorUpdateHandler = (data) => {
      this.handCursor.setPosition(data.position.x, data.position.y);
      this.handCursor.setVisible(data.state !== 'IDLE');
    };
    
    this.game.events.on('handUpdate', this.cursorUpdateHandler);
    
    // Victory sound
    const audioManager = this.game.registry.get('audioManager');
    if (audioManager) {
      this.time.delayedCall(1000, () => audioManager.playVictorySound());
    }
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }
  
  playAgain() {
    // Show PYP Map link on menu load
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';

    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SetupScene');
    });
  }
  
  goHome() {
    // Show PYP Map link on menu load
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';

    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SetupScene');
    });
  }
  
  /**
   * Cleanup when scene shuts down
   */
  shutdown() {
    console.log('[ResultsScene] Shutting down, cleaning up event listeners');
    
    // Remove BOTH event listeners properly using their stored references
    if (this.buttonHoverHandler) {
      this.game.events.off('handUpdate', this.buttonHoverHandler);
      this.buttonHoverHandler = null;
    }
    
    if (this.cursorUpdateHandler) {
      this.game.events.off('handUpdate', this.cursorUpdateHandler);
      this.cursorUpdateHandler = null;
    }
    
    // Clear all delayed callbacks
    this.time.removeAllEvents();
  }
}
