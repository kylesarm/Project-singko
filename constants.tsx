import React from 'react';
import { PowerUpType } from './types';

export const PLAYER_SIZE = 40;
export const ENEMY_SIZE = 40;
export const OBSTACLE_SIZE_MIN = 30;
export const OBSTACLE_SIZE_MAX = 80;

export const PLAYER_SPEED = 2.5;
export const PLAYER_TURN_SPEED = 0.05;
export const ENEMY_SPEED = 1.2; // Slightly slower to give player a chance
export const ENEMY_TURN_SPEED = 0.03;

export const PROJECTILE_SIZE = 8;
export const PROJECTILE_SPEED = 6;
export const PLAYER_FIRE_RATE = 400; // ms between shots
export const ENEMY_FIRE_RATE = 1800; // Slower fire rate for fairness
export const PROJECTILE_DAMAGE = 10;
export const PROJECTILE_LIFESPAN = 2000; // ms

export const PLAYER_MAX_HEALTH = 100;
export const ENEMY_MAX_HEALTH = 30;
export const SHIELD_HEALTH = 50;

export const WAVE_START_DELAY = 3000; // 3 seconds
export const ENEMY_SPAWN_PER_WAVE = 2;
export const ENEMY_AIM_INACCURACY = 0.1; // radians

export const POWERUP_SIZE = 25;
export const POWERUP_SPAWN_CHANCE = 0.3; // 30% chance on enemy kill
export const RAPID_FIRE_DURATION = 5000; // 5 seconds
export const RAPID_FIRE_MULTIPLIER = 0.4; // 40% of normal fire rate
export const MULTI_SHOT_DURATION = 8000; // 8 seconds
export const MULTI_SHOT_COUNT = 5;
export const MULTI_SHOT_SPREAD_ANGLE = Math.PI / 8; // 22.5 degrees total spread

// Boss Constants
export const FIRST_BOSS_WAVE_NUMBER = 6;
export const BOSS_SIZE = 80;
export const BOSS_MAX_HEALTH = 1000;
export const BOSS_SPEED = 0.8;
export const BOSS_TURN_SPEED = 0.015;
export const BOSS_FIRE_RATE = 2500;
export const BOSS_SPREAD_SHOT_COUNT = 8;
export const BOSS_SPREAD_ANGLE = Math.PI / 2; // 90 degree spread
export const BOSS_POWERUP_SPAWN_INTERVAL = 15000; // 15 seconds

// Second Boss Constants
export const SECOND_BOSS_WAVE_NUMBER = 12;
export const SECOND_BOSS_SIZE = 75;
export const SECOND_BOSS_MAX_HEALTH = 1500;
export const SECOND_BOSS_SPEED = 0.6; // Slower as requested
export const SECOND_BOSS_TURN_SPEED = 0.02;
export const SECOND_BOSS_FIRE_RATE = 250; // Rapid fire as requested

export const TANK_COLORS = {
    playerBody: '#c0c0c0',
    playerTurret: '#a0a0a0',
    enemyBody: '#5a5a5a',
    enemyTurret: '#4a4a4a',
    bossBody: '#4a044e',
    bossTurret: '#250227',
    secondBossBody: '#6d28d9',
    secondBossTurret: '#4c1d95',
    dead: '#2a2a2a',
};

export const HealthBar = ({ health, maxHealth, size, isPlayer, shield }: { health: number, maxHealth: number, size: number, isPlayer: boolean, shield?: number }) => {
    const healthPercentage = (health / maxHealth) * 100;
    const color = isPlayer ? 'bg-green-500' : 'bg-red-500';

    return (
        <div style={{ width: size * 1.2, top: -20 }} className="absolute">
            <div className="w-full bg-gray-900 bg-opacity-70 rounded-full h-2 border border-black">
                <div
                    className={`${color} h-full rounded-full`}
                    style={{ width: `${healthPercentage}%` }}
                ></div>
            </div>
            {shield && shield > 0 && (
                 <div className="absolute inset-0 w-full bg-cyan-400 rounded-full h-2 border border-cyan-200"
                    style={{ width: `${(shield / SHIELD_HEALTH) * 100}%` }}
                 />
            )}
        </div>
    );
};

export const PowerUpIcon = ({ type, size }: { type: PowerUpType, size: number }) => {
    const icons: { [key in PowerUpType]: string } = {
        health: '❤️',
        shield: '🛡️',
        rapidFire: '⚡',
        multiShot: '💥',
    };
    return (
        <div 
            className="rounded-full bg-yellow-400 bg-opacity-20 flex items-center justify-center border-2 border-yellow-400 animate-pulse"
            style={{width: size, height: size, textShadow: '0 0 10px #f59e0b'}}
        >
            <span style={{fontSize: size * 0.6}}>{icons[type]}</span>
        </div>
    )
};


export const TankIcon = ({ color, turretColor, size, bodyRotation, turretRotation, lastHitTime }: { color: string, turretColor: string, size: number, bodyRotation: number, turretRotation: number, lastHitTime?: number }) => (
    <div style={{ width: size, height: size, transform: `rotate(${bodyRotation}rad)`, filter: lastHitTime && Date.now() - lastHitTime < 100 ? 'brightness(3)' : 'none', transition: 'filter 0.05s' }} className="relative flex items-center justify-center">
        {/* Tank Body */}
        <div style={{ backgroundColor: color, width: size * 0.9, height: size }} className="absolute rounded-md border-2 border-gray-700 shadow-lg" />
        {/* Treads */}
        <div style={{ backgroundColor: '#333', width: size * 1.1, height: size * 0.25 }} className="absolute -translate-y-[calc(50%-2px)] top-0 rounded-sm" />
        <div style={{ backgroundColor: '#333', width: size * 1.1, height: size * 0.25 }} className="absolute -translate-y-[-calc(50%-2px)] bottom-0 rounded-sm" />

        {/* Turret */}
        <div style={{ width: size * 0.6, height: size * 0.6, transform: `rotate(${turretRotation - bodyRotation}rad)` }} className="absolute z-10 flex items-center">
            {/* Barrel */}
            <div style={{ backgroundColor: turretColor, width: size * 0.9, height: size * 0.15 }} className="absolute left-1/4 rounded-sm border border-gray-600" />
            {/* Turret Base */}
            <div style={{ backgroundColor: turretColor, width: '100%', height: '100%' }} className="rounded-full border-2 border-gray-600" />
        </div>
    </div>
);