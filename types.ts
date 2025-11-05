
export interface Vector2D {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  position: Vector2D;
  size: number;
  rotation: number;
}

export interface Tank extends GameObject {
  health: number;
  turretRotation: number;
  isPlayer: boolean;
  lastShotTime: number;
  shield?: number; // Shield health
  lastHitTime?: number;
  isBoss?: boolean;
}

export interface Projectile extends GameObject {
  velocity: Vector2D;
  ownerId: string;
  damage: number;
}

export interface Obstacle extends GameObject {
    type: 'rock';
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  lifespan: number;
  initialLifespan: number;
  color: string;
}

export type PowerUpType = 'health' | 'shield' | 'rapidFire' | 'multiShot';

export interface PowerUp extends GameObject {
    type: PowerUpType;
}

export type GameState = 'menu' | 'playing' | 'gameOver';