// /src/app/neon-rift/NeonRiftScene.ts
/**
 * Neon Rift Runners - Main Game Scene
 * Auto-runner with dynamic reality-glitching mechanics
 */
import * as Phaser from 'phaser';
import { BaseScene } from '../phaser-template/core/BaseScene';
import { useGameStore } from './gameStore';
import type { RiftType } from './gameStore';

interface Player {
  sprite: Phaser.GameObjects.Rectangle;
  body: MatterJS.BodyType;
  trail: Phaser.GameObjects.Particles.ParticleEmitter;
  glow: Phaser.GameObjects.Graphics;
  isGrounded: boolean;
  isDashing: boolean;
  jumpStartTime: number;
  velocity: { x: number; y: number };
}

interface Obstacle {
  sprite: Phaser.GameObjects.Graphics;
  body: MatterJS.BodyType;
  type: 'drone' | 'laser' | 'spike';
  grazeRadius: number;
}

export default class NeonRiftScene extends BaseScene {
  private player!: Player;
  private obstacles: Obstacle[] = [];
  private collectibles: Phaser.GameObjects.Graphics[] = [];
  private platforms: Phaser.GameObjects.Rectangle[] = [];
  
  // Rift state
  private gravityFlipped = false;
  private scrollReversed = false;
  private platformsPhased = false;
  
  // Physics
  private baseSpeed = 600;
  private currentSpeed = 600;
  private jumpForce = 18;
  private dashForce = 1200;
  private gravityScale = 1.5;
  
  // Timing
  private sessionTime = 0;
  private lastObstacleSpawn = 0;
  private lastCollectibleSpawn = 0;
  private jumpHoldTime = 0;
  private maxJumpHoldTime = 250;
  
  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private jumpPressed = false;
  private dashCooldown = 0;
  
  // Visual effects
  private glitchOverlay?: Phaser.GameObjects.Graphics;
  private chromaticStrength = 0;
  
  // Camera shake
  private shakeIntensity = 0;
  
  constructor(opts?: any) {
    super('NeonRiftScene');
    console.log('NeonRiftScene constructor called with options:', opts);
  }
  
  create(): void {
    const { width, height } = this.scale;
    
    // Set void black background
    this.cameras.main.setBackgroundColor('#050505');
    
    console.log('Neon Rift Scene created! Width:', width, 'Height:', height);
    
    // Setup physics
    this.matter.world.setBounds(0, 0, width, height);
    (this.matter.world as any).engine.gravity.y = this.gravityScale;
    
    // Create player
    this.createPlayer();
    
    // Create initial platforms
    this.createPlatforms();
    
    // Setup input
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Pointer input for mobile
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    
    // Create glitch overlay
    this.glitchOverlay = this.add.graphics();
    this.glitchOverlay.setDepth(1000);
    
    // Start game
    useGameStore.getState().setPlaying(true);
    
    // Cleanup on shutdown
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
  }
  
  private createPlayer(): void {
    const { width, height } = this.scale;
    const startX = width * 0.25;
    const startY = height * 0.7;
    
    // Create player sprite (rectangle with neon glow)
    const playerSprite = this.add.rectangle(startX, startY, 30, 40, 0x00FFFF);
    playerSprite.setStrokeStyle(2, 0x00FFFF);
    playerSprite.setDepth(100);
    
    console.log('Player created at:', startX, startY);
    
    // Add physics body (70% hitbox as per spec)
    const body = this.matter.add.rectangle(startX, startY, 21, 28, {
      friction: 0.001,
      frictionAir: 0.01,
      restitution: 0,
    });
    playerSprite.setExistingBody(body);
    (playerSprite as any).setFixedRotation();
    
    // Create simple particle texture if not exists (MUST be before creating particles)
    if (!this.textures.exists('particle')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('particle', 8, 8);
      graphics.destroy();
    }
    
    // Create glow effect
    const glow = this.add.graphics();
    glow.setDepth(playerSprite.depth - 1);
    
    // Create trail particle emitter
    const particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      lifespan: 300,
      tint: 0x00FFFF,
      frequency: 30,
    });
    
    const trail = particles.createEmitter({
      follow: playerSprite,
      quantity: 1,
    });
    
    this.player = {
      sprite: playerSprite,
      body: body,
      trail: trail,
      glow: glow,
      isGrounded: false,
      isDashing: false,
      jumpStartTime: 0,
      velocity: { x: 0, y: 0 },
    };
  }
  
  private createPlatforms(): void {
    const { width, height } = this.scale;
    const floorY = height - 50;
    
    // Create floor (HIGHLY VISIBLE FOR DEBUG)
    const floor = this.add.rectangle(width / 2, floorY, width * 2, 100, 0x00FFFF, 0.8);
    floor.setStrokeStyle(5, 0x00FFFF);
    floor.setDepth(1);
    console.log('Floor created at y:', floorY, 'width:', width);
    const floorBody = this.matter.add.rectangle(width / 2, floorY, width * 2, 100, {
      isStatic: true,
      friction: 0.8,
    });
    floor.setExistingBody(floorBody);
    
    // Create ceiling (HIGHLY VISIBLE FOR DEBUG)
    const ceiling = this.add.rectangle(width / 2, 50, width * 2, 100, 0x00FFFF, 0.8);
    ceiling.setStrokeStyle(5, 0x00FFFF);
    ceiling.setDepth(1);
    console.log('Ceiling created at y: 50, width:', width);
    const ceilingBody = this.matter.add.rectangle(width / 2, 50, width * 2, 100, {
      isStatic: true,
    });
    ceiling.setExistingBody(ceilingBody);
    
    this.platforms.push(floor, ceiling);
    
    // DEBUG: Add a bright test rectangle in the center
    const testRect = this.add.rectangle(width / 2, height / 2, 100, 100, 0xFF0000, 1);
    testRect.setStrokeStyle(5, 0xFFFF00);
    testRect.setDepth(500);
    console.log('DEBUG TEST RECTANGLE created at center:', width/2, height/2);
  }
  
  private handlePointerDown(): void {
    this.jumpPressed = true;
    this.player.jumpStartTime = this.time.now;
  }
  
  private handlePointerUp(): void {
    this.jumpPressed = false;
  }
  
  update(time: number, delta: number): void {
    const store = useGameStore.getState();
    
    if (!store.isPlaying || store.isPaused || store.gameOver) return;
    
    this.sessionTime += delta;
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    
    // Update speed based on difficulty curve
    const t = this.sessionTime / 1000;
    this.currentSpeed = this.baseSpeed * (1 + Math.log10(1 + t / 30));
    
    // Update player
    this.updatePlayer(delta);
    
    // Spawn obstacles
    if (time - this.lastObstacleSpawn > 1500) {
      this.spawnObstacle();
      this.lastObstacleSpawn = time;
    }
    
    // Spawn collectibles
    if (time - this.lastCollectibleSpawn > 800) {
      this.spawnCollectible();
      this.lastCollectibleSpawn = time;
    }
    
    // Update obstacles
    this.updateObstacles();
    
    // Update collectibles
    this.updateCollectibles();
    
    // Update score
    store.setDistance(this.sessionTime / 100);
    store.setScore(Math.floor(this.sessionTime / 10));
    
    // Update glow based on combo
    this.updatePlayerGlow();
    
    // Update chromatic aberration
    this.updateChromaticAberration();
  }
  
  private updatePlayer(delta: number): void {
    const body = this.player.body as MatterJS.BodyType;
    const velocity = body.velocity;
    
    // Check if grounded
    const contacts = (body as any).contacts || [];
    this.player.isGrounded = contacts.length > 0;
    
    // Handle jump
    const jumpKey = this.cursors?.up?.isDown || this.spaceKey?.isDown || this.jumpPressed;
    
    if (jumpKey && this.player.isGrounded && !this.player.isDashing) {
      const jumpDir = this.gravityFlipped ? 1 : -1;
      this.matter.body.setVelocity(body, { x: velocity.x, y: this.jumpForce * jumpDir });
      this.player.jumpStartTime = this.time.now;
      this.jumpHoldTime = 0;
    }
    
    // Variable jump height
    if (jumpKey && !this.player.isGrounded && this.jumpHoldTime < this.maxJumpHoldTime) {
      this.jumpHoldTime += delta;
      const jumpDir = this.gravityFlipped ? 1 : -1;
      const additionalForce = 0.3 * jumpDir;
      this.matter.body.applyForce(body, body.position, { x: 0, y: additionalForce });
    }
    
    // Handle dash
    const dashKey = this.cursors?.right?.isDown;
    if (dashKey && this.dashCooldown === 0 && !this.player.isDashing) {
      this.startDash();
    }
    
    // Update dash
    if (this.player.isDashing) {
      const dashDir = this.scrollReversed ? -1 : 1;
      this.matter.body.setVelocity(body, { x: this.dashForce * dashDir * 0.1, y: 0 });
    }
    
    // Update sprite position
    this.player.sprite.setPosition(body.position.x, body.position.y);
    
    // Screen wrap (respawn if too far)
    if (body.position.y > this.scale.height + 100 || body.position.y < -100) {
      this.gameOver();
    }
  }
  
  private startDash(): void {
    this.player.isDashing = true;
    this.dashCooldown = 3000; // 3s cooldown
    this.player.sprite.setAlpha(0.5);
    
    // End dash after 250ms
    this.time.delayedCall(250, () => {
      this.player.isDashing = false;
      this.player.sprite.setAlpha(1);
    });
  }
  
  private spawnObstacle(): void {
    const { width, height } = this.scale;
    const types: Array<'drone' | 'laser' | 'spike'> = ['drone', 'laser', 'spike'];
    const type = Phaser.Utils.Array.GetRandom(types);
    
    const x = width + 50;
    const y = Phaser.Math.Between(height * 0.3, height * 0.8);
    
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xFF00FF);
    graphics.fillStyle(0xFF00FF, 0.5);
    
    let size = 30;
    if (type === 'drone') {
      graphics.fillRect(-15, -15, 30, 30);
      graphics.strokeRect(-15, -15, 30, 30);
    } else if (type === 'laser') {
      size = 10;
      graphics.fillRect(-5, -30, 10, 60);
      graphics.strokeRect(-5, -30, 10, 60);
    } else {
      graphics.fillTriangle(-15, 15, 0, -15, 15, 15);
      graphics.strokeTriangle(-15, 15, 0, -15, 15, 15);
    }
    
    graphics.setPosition(x, y);
    
    const body = this.matter.add.rectangle(x, y, size, size, {
      isStatic: true,
      isSensor: true,
    });
    
    this.obstacles.push({
      sprite: graphics,
      body: body,
      type: type,
      grazeRadius: size * 1.2,
    });
  }
  
  private updateObstacles(): void {
    const scrollDir = this.scrollReversed ? 1 : -1;
    const speed = this.currentSpeed * scrollDir;
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const newX = obs.sprite.x + (speed * this.game.loop.delta) / 1000;
      obs.sprite.setPosition(newX, obs.sprite.y);
      this.matter.body.setPosition(obs.body, { x: newX, y: obs.sprite.y });
      
      // Check collision with player
      const dist = Phaser.Math.Distance.Between(
        obs.sprite.x,
        obs.sprite.y,
        this.player.sprite.x,
        this.player.sprite.y
      );
      
      if (dist < 25 && !this.player.isDashing) {
        this.gameOver();
      } else if (dist < obs.grazeRadius && dist > 25) {
        // Near miss!
        this.handleNearMiss();
      }
      
      // Remove if off screen
      if (newX < -100 || newX > this.scale.width + 100) {
        obs.sprite.destroy();
        this.matter.world.remove(obs.body);
        this.obstacles.splice(i, 1);
      }
    }
  }
  
  private spawnCollectible(): void {
    const { width, height } = this.scale;
    const x = width + 50;
    const y = Phaser.Math.Between(height * 0.3, height * 0.8);
    
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xCCFF00);
    graphics.fillStyle(0xCCFF00, 0.8);
    graphics.fillCircle(0, 0, 8);
    graphics.strokeCircle(0, 0, 8);
    graphics.setPosition(x, y);
    
    this.collectibles.push(graphics);
  }
  
  private updateCollectibles(): void {
    const scrollDir = this.scrollReversed ? 1 : -1;
    const speed = this.currentSpeed * scrollDir;
    
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      const newX = col.x + (speed * this.game.loop.delta) / 1000;
      col.setPosition(newX, col.y);
      
      // Check collision with player
      const dist = Phaser.Math.Distance.Between(
        col.x,
        col.y,
        this.player.sprite.x,
        this.player.sprite.y
      );
      
      if (dist < 30) {
        useGameStore.getState().incrementCombo();
        useGameStore.getState().addScore(100);
        col.destroy();
        this.collectibles.splice(i, 1);
      }
      
      // Remove if off screen
      if (newX < -100 || newX > this.scale.width + 100) {
        col.destroy();
        this.collectibles.splice(i, 1);
      }
    }
  }
  
  private handleNearMiss(): void {
    // Trigger near-miss effects (called once per obstacle)
    useGameStore.getState().addScore(50);
    this.shakeIntensity = 2;
    
    // Subtle time dilation effect
    this.time.delayedCall(20, () => {
      this.shakeIntensity = 0;
    });
  }
  
  private updatePlayerGlow(): void {
    const combo = useGameStore.getState().combo;
    const glowSize = 2 + Math.min(combo * 0.2, 10);
    
    this.player.glow.clear();
    this.player.glow.lineStyle(glowSize, 0x00FFFF, 0.6);
    this.player.glow.strokeRect(
      this.player.sprite.x - 15 - glowSize,
      this.player.sprite.y - 20 - glowSize,
      30 + glowSize * 2,
      40 + glowSize * 2
    );
  }
  
  private updateChromaticAberration(): void {
    // Update chromatic aberration based on rift state
    const target = useGameStore.getState().riftWarning ? 1.0 : 0.0;
    this.chromaticStrength += (target - this.chromaticStrength) * 0.1;
    
    if (this.chromaticStrength > 0.01) {
      this.glitchOverlay?.clear();
      this.glitchOverlay?.fillStyle(0xFF00FF, this.chromaticStrength * 0.1);
      this.glitchOverlay?.fillRect(0, 0, this.scale.width, this.scale.height);
    }
  }
  
  public applyRift(riftType: RiftType): void {
    switch (riftType) {
      case 'GRAVITY_FLIP':
        this.gravityFlipped = !this.gravityFlipped;
        const gravity = this.gravityFlipped ? -this.gravityScale : this.gravityScale;
        (this.matter.world as any).engine.gravity.y = gravity;
        
        // Camera flip animation
        this.cameras.main.setRotation(this.gravityFlipped ? Math.PI : 0);
        break;
        
      case 'REVERSE_SCROLL':
        this.scrollReversed = !this.scrollReversed;
        break;
        
      case 'PHASE_SHIFT':
        this.platformsPhased = !this.platformsPhased;
        // Toggle platform alpha to show phasing
        this.platforms.forEach((p: Phaser.GameObjects.Rectangle) => {
          p.setAlpha(this.platformsPhased ? 0.2 : 0.3);
        });
        break;
    }
  }
  
  public resetRift(): void {
    this.gravityFlipped = false;
    this.scrollReversed = false;
    this.platformsPhased = false;
    
    (this.matter.world as any).engine.gravity.y = this.gravityScale;
    this.cameras.main.setRotation(0);
    this.platforms.forEach((p: Phaser.GameObjects.Rectangle) => p.setAlpha(0.3));
  }
  
  private gameOver(): void {
    useGameStore.getState().setGameOver(true);
    useGameStore.getState().setPlaying(false);
  }
  
  public restart(): void {
    useGameStore.getState().reset();
    this.scene.restart();
  }
  
  private cleanup(): void {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.obstacles.forEach((obs: Obstacle) => {
      obs.sprite.destroy();
      this.matter.world.remove(obs.body);
    });
    this.collectibles.forEach((col: Phaser.GameObjects.Graphics) => col.destroy());
    this.platforms = [];
    this.obstacles = [];
    this.collectibles = [];
  }
}
