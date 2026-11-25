/**
 * ResultsScene - Game Results, Star Rating, and IB PYP Passport Stamp (Risk-Taker)
 */

class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }

  stampPassport() {
    try {
      const raw = localStorage.getItem('ib_pyp_passport');
      const data = raw ? JSON.parse(raw) : { stamps: [], completed: [] };
      const stamps = new Set(Array.isArray(data.stamps) ? data.stamps : []);
      const completed = new Set(Array.isArray(data.completed) ? data.completed : []);
      stamps.add('Risk-Taker');
      completed.add('literacy/movespelling/index.html');
      localStorage.setItem('ib_pyp_passport', JSON.stringify({ stamps: [...stamps], completed: [...completed] }));
    } catch (_) {}
  }

  create() {
    const { width, height } = this.cameras.main;

    // Keep PYP Map link visible on ResultsScene
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';

    // Stamp IB PYP Passport (Risk-Taker)
    this.stampPassport();

    const score = this.game.registry.get('finalScore') || 0;
    const correct = this.game.registry.get('correctWords') || 0;
    const total = this.game.registry.get('totalWords') || 1;
    const incorrect = this.game.registry.get('incorrectAttempts') || 0;

    const accuracy = correct / total;
    let stars = 1;
    if (accuracy >= 0.9 && incorrect < 3) stars = 3;
    else if (accuracy >= 0.7) stars = 2;

    // Title
    const title = this.add.text(width / 2, Math.max(78, height * 0.12), '🎉 Great Job! 🎉', {
      fontSize: '46px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    title.setTint(0xf2b84b, 0xe36b5a, 0xf2b84b, 0xe36b5a);

    // Stars container
    const starY = Math.max(165, height * 0.25);
    const starSpacing = 96;
    const starStartX = width / 2 - starSpacing;

    for (let i = 0; i < 3; i++) {
      const starX = starStartX + i * starSpacing;
      const earned = i < stars;

      const star = this.add.text(starX, starY, '⭐', {
        fontSize: '60px'
      }).setOrigin(0.5);

      star.setAlpha(earned ? 0 : 0.3);

      if (earned) {
        this.time.delayedCall(450 + i * 260, () => {
          star.setAlpha(1);
          this.tweens.add({
            targets: star,
            scaleX: 1.25,
            scaleY: 1.25,
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
    const statsY = starY + 95;
    this.add.text(width / 2, statsY, `Score: ${score}`, {
      fontSize: '32px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#f2b84b'
    }).setOrigin(0.5);

    this.add.text(width / 2, statsY + 46, `Words Spelled: ${correct} / ${total}`, {
      fontSize: '22px',
      fontFamily: 'Nunito, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    if (incorrect > 0) {
      this.add.text(width / 2, statsY + 80, `Tries to Fix: ${incorrect}`, {
        fontSize: '18px',
        fontFamily: 'Nunito, sans-serif',
        fontStyle: 'bold',
        color: '#fca5a5'
      }).setOrigin(0.5);
    }

    // IB PYP Passport Badge
    const badgeY = statsY + 126;
    const badgeBg = this.add.rectangle(width / 2, badgeY, Math.min(540, width - 48), 44, 0x86efac, 0.96).setStrokeStyle(3, 0x17211f);
    this.add.text(width / 2, badgeY, '🏅 IB PYP Passport Stamped: Risk-Taker!', {
      fontSize: '18px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#17211f'
    }).setOrigin(0.5);
    void badgeBg;

    // Play Again button
    const btnY = Math.min(height - 115, badgeY + 78);
    const btn = this.add.container(width / 2, btnY);

    const btnShadow = this.add.rectangle(4, 4, 250, 58, 0x17211f);
    btn.add(btnShadow);

    const btnBg = this.add.rectangle(0, 0, 250, 58, 0x2d9d78);
    btnBg.setStrokeStyle(3, 0x17211f);
    btnBg.setInteractive({ useHandCursor: true });
    btn.add(btnBg);

    const btnText = this.add.text(0, 0, 'Play Again', {
      fontSize: '24px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    btn.add(btnText);

    // Gesture hover selection
    let hoverStart = 0;
    const hoverDuration = 1500;

    this.buttonHoverHandler = (data) => {
      const { position } = data;
      const bounds = btnBg.getBounds();

      if (bounds.contains(position.x, position.y)) {
        if (hoverStart === 0) hoverStart = this.time.now;
        const progress = (this.time.now - hoverStart) / hoverDuration;
        btn.setScale(1 + progress * 0.1);
        if (progress >= 1) this.playAgain();
      } else {
        hoverStart = 0;
        btn.setScale(1);
      }
    };

    this.game.events.on('handUpdate', this.buttonHoverHandler);

    btnBg.on('pointerdown', () => this.playAgain());
    btnBg.on('pointerover', () => btn.setScale(1.05));
    btnBg.on('pointerout', () => btn.setScale(1));

    // Home button
    const homeBtn = this.add.text(width / 2, btnY + 66, '🏠 Back to Menu', {
      fontSize: '18px',
      fontFamily: 'Fredoka, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    homeBtn.on('pointerdown', () => this.goHome());
    homeBtn.on('pointerover', () => homeBtn.setScale(1.1));
    homeBtn.on('pointerout', () => homeBtn.setScale(1));

    // Hand cursor (only shown when camera tracking emits handUpdate)
    this.handCursor = this.add.circle(0, 0, 30, 0xf2b84b, 0.5);
    this.handCursor.setStrokeStyle(3, 0xf2b84b);
    this.handCursor.setVisible(false);
    this.handCursor.setDepth(100);

    this.cursorUpdateHandler = (data) => {
      this.handCursor.setPosition(data.position.x, data.position.y);
      this.handCursor.setVisible(data.state !== 'IDLE');
    };

    this.game.events.on('handUpdate', this.cursorUpdateHandler);

    // Register Phaser 3 shutdown cleanup
    this.events.once('shutdown', this.shutdown, this);

    // Victory sound
    const audioManager = this.game.registry.get('audioManager');
    if (audioManager) {
      this.time.delayedCall(700, () => audioManager.playVictorySound());
    }

    this.cameras.main.fadeIn(450);
  }

  playAgain() {
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';

    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SetupScene');
    });
  }

  goHome() {
    const mapLink = document.querySelector('.pyp-map-link');
    if (mapLink) mapLink.style.display = 'inline-flex';

    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SetupScene');
    });
  }

  shutdown() {
    console.log('[ResultsScene] Shutting down, cleaning up event listeners');

    if (this.buttonHoverHandler) {
      this.game.events.off('handUpdate', this.buttonHoverHandler);
      this.buttonHoverHandler = null;
    }

    if (this.cursorUpdateHandler) {
      this.game.events.off('handUpdate', this.cursorUpdateHandler);
      this.cursorUpdateHandler = null;
    }

    this.time.removeAllEvents();
  }
}
