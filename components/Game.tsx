import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Tank, Projectile, Obstacle, Vector2D, PowerUp, PowerUpType, Particle } from '../types';
import {
    GAME_WIDTH, GAME_HEIGHT, PLAYER_SIZE, ENEMY_SIZE, OBSTACLE_SIZE_MIN, OBSTACLE_SIZE_MAX, PLAYER_SPEED, ENEMY_SPEED,
    PLAYER_TURN_SPEED, PROJECTILE_SIZE, PROJECTILE_SPEED, PLAYER_FIRE_RATE, ENEMY_FIRE_RATE, PROJECTILE_DAMAGE, PLAYER_MAX_HEALTH, ENEMY_MAX_HEALTH, WAVE_START_DELAY, ENEMY_SPAWN_PER_WAVE, TANK_COLORS, ENEMY_AIM_INACCURACY, ENEMY_TURN_SPEED, POWERUP_SIZE, POWERUP_SPAWN_CHANCE, RAPID_FIRE_DURATION, RAPID_FIRE_MULTIPLIER, SHIELD_HEALTH, TankIcon, HealthBar, PowerUpIcon,
    BOSS_WAVE_NUMBER, BOSS_SIZE, BOSS_MAX_HEALTH, BOSS_SPEED, BOSS_TURN_SPEED, BOSS_FIRE_RATE, BOSS_SPREAD_SHOT_COUNT, BOSS_SPREAD_ANGLE, MULTI_SHOT_DURATION, MULTI_SHOT_COUNT, MULTI_SHOT_SPREAD_ANGLE, BOSS_POWERUP_SPAWN_INTERVAL
} from '../constants';
import { HUD } from './UI';

// --- HELPER FUNCTIONS ---
const isColliding = (obj1: {position: Vector2D, size: number}, obj2: {position: Vector2D, size: number}) => {
    const dist = Math.hypot(obj1.position.x - obj2.position.x, obj1.position.y - obj2.position.y);
    return dist < (obj1.size / 2 + obj2.size / 2);
};

const generateObstacles = (count: number): Obstacle[] => {
    const obstacles: Obstacle[] = [];
    while (obstacles.length < count) {
        const newObstacle = {
            id: `obs-${obstacles.length}-${Date.now()}`,
            position: {
                x: Math.random() * (GAME_WIDTH - 200) + 100,
                y: Math.random() * (GAME_HEIGHT - 200) + 100,
            },
            size: OBSTACLE_SIZE_MIN + Math.random() * (OBSTACLE_SIZE_MAX - OBSTACLE_SIZE_MIN),
            rotation: Math.random() * Math.PI * 2,
            type: 'rock' as const
        };
        // Ensure obstacles don't overlap with each other or the center
        const centerDist = Math.hypot(newObstacle.position.x - GAME_WIDTH / 2, newObstacle.position.y - GAME_HEIGHT / 2);
        if (centerDist < 200) continue;
        if (!obstacles.some(obs => isColliding(newObstacle, obs))) {
            obstacles.push(newObstacle);
        }
    }
    return obstacles;
};

// --- JOYSTICK TYPES ---
interface JoystickState {
    active: boolean;
    angle: number;
    magnitude: number;
    position: Vector2D; // Current position of the stick for rendering
}

const JOYSTICK_RADIUS = 60;
const STICK_RADIUS = 30;

// --- GAME COMPONENT ---
interface GameProps {
  setGameState: (state: GameState) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  score: number;
  isMobileControls: boolean;
}

export const Game: React.FC<GameProps> = ({ setGameState, setScore, score, isMobileControls }) => {
    const [player, setPlayer] = useState<Tank>({
        id: 'player',
        position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
        size: PLAYER_SIZE,
        rotation: -Math.PI / 2,
        turretRotation: -Math.PI / 2,
        health: PLAYER_MAX_HEALTH,
        isPlayer: true,
        lastShotTime: 0,
    });
    const [enemies, setEnemies] = useState<Tank[]>([]);
    const [projectiles, setProjectiles] = useState<Projectile[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
    const [obstacles] = useState<Obstacle[]>(() => generateObstacles(12));
    const [wave, setWave] = useState(0);
    const [waveMessage, setWaveMessage] = useState('');
    const [activePowerUp, setActivePowerUp] = useState<{type: PowerUpType, timeoutId: number} | null>(null);
    const [isStartingWave, setIsStartingWave] = useState(false);

    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const mousePosition = useRef<Vector2D>({ x: 0, y: 0 });
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const gameLoopRef = useRef<number | null>(null);
    const lastBossPowerUpSpawnTime = useRef<number>(0);
    
    // Joystick state
    const moveJoystickBase = useRef({ x: 120, y: GAME_HEIGHT - 120 });
    const aimJoystickBase = useRef({ x: GAME_WIDTH - 120, y: GAME_HEIGHT - 120 });
    const [moveJoystick, setMoveJoystick] = useState<JoystickState>(() => ({ active: false, angle: 0, magnitude: 0, position: moveJoystickBase.current }));
    const [aimJoystick, setAimJoystick] = useState<JoystickState>(() => ({ active: false, angle: 0, magnitude: 0, position: aimJoystickBase.current }));
    const activeTouches = useRef<{ [touchId: number]: 'move' | 'aim' }>({});

    // --- AUDIO ---
    const audioRefs = useRef({
        shoot: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-short-laser-gun-shot-1670.mp3'),
        explosionSmall: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-short-explosion-1694.mp3'),
        explosionLarge: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-war-explosion-1286.mp3'),
        powerUp: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-video-game-power-up-3164.mp3'),
        gameOver: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3'),
        backgroundMusic: new Audio('https://assets.mixkit.co/music/preview/mixkit-techno-adrenaline-120.mp3')
    });

    const playSound = useCallback((sound: keyof typeof audioRefs.current, volume = 0.5) => {
        const audio = audioRefs.current[sound];
        if (audio) {
            audio.currentTime = 0;
            audio.volume = volume;
            audio.play().catch(e => console.error("Audio play failed:", e));
        }
    }, []);

    useEffect(() => {
        const music = audioRefs.current.backgroundMusic;
        music.loop = true;
        music.volume = 0.2;
        music.play().catch(e => console.error("Audio play failed:", e));
        
        return () => {
            music.pause();
            music.currentTime = 0;
        };
    }, []);


    // --- CORE GAME LOGIC ---
    
    const createParticleExplosion = useCallback((position: Vector2D, particleCount: number, isLarge: boolean) => {
        playSound(isLarge ? 'explosionLarge' : 'explosionSmall', isLarge ? 0.7 : 0.4);
        const newParticles: Particle[] = [];
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (isLarge ? 7 : 4) + 1;
            const lifespan = Math.random() * 40 + 30; // frames
            newParticles.push({
                id: `part-${Date.now()}-${Math.random()}`,
                position: { ...position },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed,
                },
                size: Math.random() * (isLarge ? 7 : 3) + 2,
                lifespan: lifespan,
                initialLifespan: lifespan,
                color: `hsl(${Math.random() * 25 + 15}, 100%, ${50 + Math.random() * 15}%)`,
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    }, [playSound]);

    const createMuzzleFlash = useCallback((tank: Tank) => {
        const barrelLength = tank.size * 0.7;
        const flashPosition = {
            x: tank.position.x + Math.cos(tank.turretRotation) * barrelLength,
            y: tank.position.y + Math.sin(tank.turretRotation) * barrelLength,
        };
        const newParticles: Particle[] = [];
        for (let i = 0; i < 20; i++) {
            const angle = tank.turretRotation + (Math.random() - 0.5) * 0.6; // Cone shape
            const speed = Math.random() * 5 + 3;
            const lifespan = Math.random() * 8 + 4; // very short life
            newParticles.push({
                id: `part-${Date.now()}-${Math.random()}`,
                position: { ...flashPosition },
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed,
                },
                size: Math.random() * 6 + 2,
                lifespan: lifespan,
                initialLifespan: lifespan,
                color: `hsl(${Math.random() * 20 + 35}, 100%, ${60 + Math.random() * 20}%)`,
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    }, []);

    const fireProjectile = useCallback((tank: Tank, overrideAngle?: number) => {
        if (tank.id === 'player') playSound('shoot', 0.3); // Only play for player to reduce noise
        if (tank.isPlayer) createMuzzleFlash(tank);

        const accuracy = tank.isPlayer ? 0 : (Math.random() - 0.5) * ENEMY_AIM_INACCURACY;
        const fireAngle = overrideAngle !== undefined ? overrideAngle : tank.turretRotation + accuracy;
        
        const newProjectile: Projectile = {
            id: `proj-${Date.now()}-${Math.random()}`,
            position: { 
                x: tank.position.x + Math.cos(fireAngle) * (tank.size * 0.5),
                y: tank.position.y + Math.sin(fireAngle) * (tank.size * 0.5),
             },
            size: PROJECTILE_SIZE,
            rotation: fireAngle,
            velocity: { x: Math.cos(fireAngle) * PROJECTILE_SPEED, y: Math.sin(fireAngle) * PROJECTILE_SPEED },
            ownerId: tank.id,
            damage: PROJECTILE_DAMAGE
        };
        setProjectiles(prev => [...prev, newProjectile]);
    }, [playSound, createMuzzleFlash]);


    const spawnEnemies = useCallback((count: number) => {
        setEnemies(currentEnemies => {
            const newEnemies: Tank[] = [];
            const margin = ENEMY_SIZE * 1.5;

            for (let i = 0; i < count; i++) {
                let position: Vector2D | null = null;
                let attempts = 0;
                while (position === null && attempts < 50) { // Safety break
                    attempts++;
                    let x = 0, y = 0;
                    const side = Math.floor(Math.random() * 4);
                    switch (side) {
                        case 0: // Top
                            x = Math.random() * (GAME_WIDTH - margin * 2) + margin;
                            y = margin;
                            break;
                        case 1: // Bottom
                            x = Math.random() * (GAME_WIDTH - margin * 2) + margin;
                            y = GAME_HEIGHT - margin;
                            break;
                        case 2: // Left
                            x = margin;
                            y = Math.random() * (GAME_HEIGHT - margin * 2) + margin;
                            break;
                        case 3: // Right
                            x = GAME_WIDTH - margin;
                            y = Math.random() * (GAME_HEIGHT - margin * 2) + margin;
                            break;
                    }
                    const tempPos = { x, y };

                    const allCurrentObjects = [...obstacles, ...currentEnemies, ...newEnemies];
                    if (!allCurrentObjects.some(obs => isColliding({ position: tempPos, size: ENEMY_SIZE }, obs))) {
                        position = tempPos;
                    }
                }
                
                if (position) { 
                    newEnemies.push({
                        id: `enemy-${i}-${Date.now()}`,
                        position,
                        size: ENEMY_SIZE,
                        rotation: Math.random() * Math.PI * 2,
                        turretRotation: 0,
                        health: ENEMY_MAX_HEALTH,
                        isPlayer: false,
                        lastShotTime: 0,
                    });
                }
            }
            return [...currentEnemies, ...newEnemies];
        });
    }, [obstacles]);

    const spawnBoss = useCallback(() => {
        const boss: Tank = {
            id: 'boss-wave-6',
            position: { x: GAME_WIDTH / 2, y: BOSS_SIZE },
            size: BOSS_SIZE,
            rotation: Math.PI / 2,
            turretRotation: Math.PI / 2,
            health: BOSS_MAX_HEALTH,
            isPlayer: false,
            lastShotTime: 0,
            isBoss: true,
        };
        setEnemies([boss]);
    }, []);

    const startNewWave = useCallback(() => {
        setIsStartingWave(true);
        setPlayer(p => ({ ...p, health: PLAYER_MAX_HEALTH, shield: p.shield || 0 })); // Restore health
        setWave(prevWave => {
            const nextWave = prevWave + 1;
            setWaveMessage(`Wave ${nextWave}`);
            setTimeout(() => {
                setWaveMessage('');
                if (nextWave === BOSS_WAVE_NUMBER) {
                    spawnBoss();
                } else {
                    spawnEnemies(nextWave + ENEMY_SPAWN_PER_WAVE - 1);
                }
                setIsStartingWave(false);
            }, WAVE_START_DELAY);
            return nextWave;
        });
    }, [spawnEnemies, spawnBoss]);

    // Game Loop
    const gameLoop = useCallback(() => {
        const now = performance.now();
        const allTanks = [player, ...enemies];

        // 1. Update Player
        setPlayer(p => {
            if (p.health <= 0) return p;
            let newRotation = p.rotation;
            let newPos = { ...p.position };
            let velocity = {x: 0, y: 0};

            if (isMobileControls && moveJoystick.active) {
                const rotDiff = moveJoystick.angle - newRotation;
                const normalizedRotDiff = Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff));
                if (Math.abs(normalizedRotDiff) > PLAYER_TURN_SPEED) {
                    newRotation += Math.sign(normalizedRotDiff) * PLAYER_TURN_SPEED;
                } else {
                    newRotation = moveJoystick.angle;
                }
                velocity.x = Math.cos(newRotation) * PLAYER_SPEED * moveJoystick.magnitude;
                velocity.y = Math.sin(newRotation) * PLAYER_SPEED * moveJoystick.magnitude;
            } else {
                if (keysPressed.current['a'] || keysPressed.current['ArrowLeft']) newRotation -= PLAYER_TURN_SPEED;
                if (keysPressed.current['d'] || keysPressed.current['ArrowRight']) newRotation += PLAYER_TURN_SPEED;
                if (keysPressed.current['w'] || keysPressed.current['ArrowUp']) {
                    velocity.x += Math.cos(newRotation) * PLAYER_SPEED;
                    velocity.y += Math.sin(newRotation) * PLAYER_SPEED;
                }
                if (keysPressed.current['s'] || keysPressed.current['ArrowDown']) {
                    velocity.x -= Math.cos(newRotation) * PLAYER_SPEED * 0.7;
                    velocity.y -= Math.sin(newRotation) * PLAYER_SPEED * 0.7;
                }
            }
            newPos.x += velocity.x;
            newPos.y += velocity.y;
            
            const potentialPlayer = {...p, position: newPos};
            let collision = false;
            for (const obs of obstacles) if (isColliding(potentialPlayer, obs)) collision = true;
            for (const enemy of enemies) if (isColliding(potentialPlayer, enemy)) collision = true;
            
            if (collision) newPos = p.position;
            
            newPos.x = Math.max(p.size / 2, Math.min(GAME_WIDTH - p.size / 2, newPos.x));
            newPos.y = Math.max(p.size / 2, Math.min(GAME_HEIGHT - p.size / 2, newPos.y));
            
            let turretRotation = p.turretRotation;
            if (isMobileControls && aimJoystick.active) {
                turretRotation = aimJoystick.angle;
            } else if (!isMobileControls) {
                const rect = gameAreaRef.current?.getBoundingClientRect();
                if(rect) turretRotation = Math.atan2(mousePosition.current.y - (p.position.y), mousePosition.current.x - (p.position.x));
            }
            
            return { ...p, position: newPos, rotation: newRotation, turretRotation };
        });

        // 2. Update Enemies
        setEnemies(currentEnemies => currentEnemies.map(enemy => {
            if (enemy.health <= 0) return enemy;
            
            const angleToPlayer = Math.atan2(player.position.y - enemy.position.y, player.position.x - enemy.position.x);
            let newRotation = enemy.rotation;
            const rotDiff = angleToPlayer - newRotation;
            const normalizedRotDiff = Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff));
            
            const speed = enemy.isBoss ? BOSS_SPEED : ENEMY_SPEED;
            const turnSpeed = enemy.isBoss ? BOSS_TURN_SPEED : ENEMY_TURN_SPEED;
            
            let isStuck = false;
            let newPos = { ...enemy.position };
            const nextX = newPos.x + Math.cos(newRotation) * speed;
            const nextY = newPos.y + Math.sin(newRotation) * speed;

            if (nextX < enemy.size / 2 || nextX > GAME_WIDTH - enemy.size / 2 ||
                nextY < enemy.size / 2 || nextY > GAME_HEIGHT - enemy.size / 2) {
                isStuck = true;
            }

            const potentialEnemy = { ...enemy, position: {x: nextX, y: nextY} };
            if (!isStuck && isColliding(potentialEnemy, player)) isStuck = true;
            if (!isStuck) for (const obs of obstacles) if (isColliding(potentialEnemy, obs)) isStuck = true;
            if (!isStuck) for (const otherEnemy of currentEnemies) if (enemy.id !== otherEnemy.id && isColliding(potentialEnemy, otherEnemy)) isStuck = true;

            if (isStuck) {
                newRotation += turnSpeed * 5; 
            } else {
                newPos.x = nextX;
                newPos.y = nextY;
                if (Math.abs(normalizedRotDiff) > turnSpeed) {
                    newRotation += Math.sign(normalizedRotDiff) * turnSpeed;
                } else {
                    newRotation = angleToPlayer;
                }
            }

            const fireRate = enemy.isBoss ? BOSS_FIRE_RATE : ENEMY_FIRE_RATE;
            if (now - enemy.lastShotTime > fireRate) {
                let hasLineOfSight = true;
                const dx = player.position.x - enemy.position.x;
                const dy = player.position.y - enemy.position.y;
                const distToPlayerSq = dx * dx + dy * dy;

                for (const obs of obstacles) {
                    const dot = ((obs.position.x - enemy.position.x) * dx + (obs.position.y - enemy.position.y) * dy) / distToPlayerSq;
                    if (dot > 0 && dot < 1) {
                        const closestX = enemy.position.x + dot * dx;
                        const closestY = enemy.position.y + dot * dy;
                        const distToClosestPoint = Math.hypot(closestX - obs.position.x, closestY - obs.position.y);
                        if (distToClosestPoint < obs.size / 2) {
                            hasLineOfSight = false;
                            break;
                        }
                    }
                }
                
                if (hasLineOfSight) {
                    playSound('shoot', 0.2);
                    if (enemy.isBoss) {
                        const totalAngle = BOSS_SPREAD_ANGLE;
                        const angleStep = totalAngle / (BOSS_SPREAD_SHOT_COUNT - 1);
                        const startAngle = angleToPlayer - totalAngle / 2;
                        for (let i = 0; i < BOSS_SPREAD_SHOT_COUNT; i++) {
                            fireProjectile(enemy, startAngle + i * angleStep);
                        }
                    } else {
                        fireProjectile({ ...enemy, turretRotation: angleToPlayer });
                    }
                    enemy.lastShotTime = now;
                }
            }

            return { ...enemy, position: newPos, turretRotation: angleToPlayer, rotation: newRotation };
        }));
        
        // 2.5. Player mobile firing
        if (isMobileControls && aimJoystick.active && aimJoystick.magnitude > 0.6) {
             setPlayer(p => {
                if(p.health <= 0) return p;
                const fireRate = activePowerUp?.type === 'rapidFire' ? PLAYER_FIRE_RATE * RAPID_FIRE_MULTIPLIER : PLAYER_FIRE_RATE;
                if(now - p.lastShotTime > fireRate) {
                     if (activePowerUp?.type === 'multiShot') {
                        const totalAngle = MULTI_SHOT_SPREAD_ANGLE;
                        const angleStep = totalAngle / (MULTI_SHOT_COUNT - 1);
                        const startAngle = p.turretRotation - totalAngle / 2;
                        for (let i = 0; i < MULTI_SHOT_COUNT; i++) {
                            fireProjectile(p, startAngle + i * angleStep);
                        }
                    } else {
                        fireProjectile(p);
                    }
                     return {...p, lastShotTime: now};
                }
                return p;
             });
        }


        // 3. Update Projectiles & Collisions
        setProjectiles(currentProjectiles => {
            let remainingProjectiles = [...currentProjectiles];
            const destroyedProjectiles: Set<string> = new Set();

            for (const proj of remainingProjectiles) {
                if(destroyedProjectiles.has(proj.id)) continue;
                proj.position.x += proj.velocity.x;
                proj.position.y += proj.velocity.y;

                if (proj.position.x < 0 || proj.position.x > GAME_WIDTH || proj.position.y < 0 || proj.position.y > GAME_HEIGHT) {
                    destroyedProjectiles.add(proj.id);
                    continue;
                }

                for(const obs of obstacles){
                    if(isColliding(proj, obs)){
                        createParticleExplosion(proj.position, 10, false);
                        destroyedProjectiles.add(proj.id);
                        break;
                    }
                }
                if(destroyedProjectiles.has(proj.id)) continue;
                
                for (const tank of allTanks) {
                    if (tank.health > 0 && proj.ownerId !== tank.id && isColliding(proj, tank)) {
                        createParticleExplosion(proj.position, 15, false);
                        destroyedProjectiles.add(proj.id);

                        if(tank.isPlayer) {
                             setPlayer(p => {
                                let newHealth = p.health;
                                let newShield = p.shield || 0;
                                if (newShield > 0) {
                                    newShield = Math.max(0, newShield - proj.damage);
                                } else {
                                    newHealth -= proj.damage;
                                }

                                if (newHealth <= 0) {
                                    playSound('gameOver', 0.5);
                                    createParticleExplosion(p.position, 100, true);
                                    setGameState('gameOver');
                                }
                                return {...p, health: newHealth, shield: newShield, lastHitTime: now};
                             });
                        } else {
                            setEnemies(es => es.map(e => {
                                if(e.id === tank.id){
                                    const newHealth = e.health - proj.damage;
                                    if(newHealth <= 0){
                                        const scoreIncrease = tank.isBoss ? 1000 : 100;
                                        setScore(s => s + scoreIncrease);
                                        createParticleExplosion(e.position, tank.isBoss ? 200 : 50, true);
                                        if (Math.random() < POWERUP_SPAWN_CHANCE && !tank.isBoss) {
                                            const types: PowerUpType[] = ['health', 'shield', 'rapidFire', 'multiShot'];
                                            const type = types[Math.floor(Math.random() * types.length)];
                                            setPowerUps(pus => [...pus, {id: `pu-${Date.now()}`, type, position: e.position, size: POWERUP_SIZE, rotation: 0}]);
                                        }
                                    }
                                    return {...e, health: newHealth, lastHitTime: now };
                                }
                                return e;
                            }));
                        }
                        break;
                    }
                }
            }
            return remainingProjectiles.filter(p => !destroyedProjectiles.has(p.id));
        });
        
        // 4. Player vs PowerUps
        setPowerUps(currentPowerUps => {
            const collectedPowerUps: Set<string> = new Set();
            for(const pu of currentPowerUps) {
                if(isColliding(player, pu)){
                    collectedPowerUps.add(pu.id);
                    playSound('powerUp', 0.6);
                    if(activePowerUp?.timeoutId) clearTimeout(activePowerUp.timeoutId);

                    if (pu.type === 'health') {
                        setPlayer(p => ({...p, health: Math.min(PLAYER_MAX_HEALTH, p.health + 25)}));
                        setActivePowerUp(null);
                    } else if (pu.type === 'shield') {
                        setPlayer(p => ({...p, shield: SHIELD_HEALTH}));
                         setActivePowerUp(null);
                    } else if (pu.type === 'rapidFire' || pu.type === 'multiShot') {
                        const duration = pu.type === 'rapidFire' ? RAPID_FIRE_DURATION : MULTI_SHOT_DURATION;
                        const timeoutId = window.setTimeout(() => setActivePowerUp(null), duration);
                        setActivePowerUp({type: pu.type, timeoutId});
                    }
                }
            }
            return currentPowerUps.filter(pu => !collectedPowerUps.has(pu.id));
        });

        // 5. Update Particles
        setParticles(currentParticles => currentParticles.map(p => ({
            ...p,
            position: {
                x: p.position.x + p.velocity.x,
                y: p.position.y + p.velocity.y,
            },
            velocity: {
                x: p.velocity.x * 0.98,
                y: p.velocity.y * 0.98,
            },
            lifespan: p.lifespan - 1,
        })).filter(p => p.lifespan > 0));

        // 6. Boss Wave Power-up Spawning
        const isBossOnField = enemies.some(e => e.isBoss);
        if (wave === BOSS_WAVE_NUMBER && isBossOnField) {
            if (lastBossPowerUpSpawnTime.current === 0) {
                lastBossPowerUpSpawnTime.current = now; // Initialize timer when boss appears
            }

            if (now - lastBossPowerUpSpawnTime.current > BOSS_POWERUP_SPAWN_INTERVAL) {
                const types: PowerUpType[] = ['health', 'shield', 'rapidFire', 'multiShot'];
                const type = types[Math.floor(Math.random() * types.length)];
                
                let position: Vector2D | null = null;
                let attempts = 0;
                while(position === null && attempts < 50) {
                    attempts++;
                    const tempPos = {
                        x: Math.random() * (GAME_WIDTH - 200) + 100,
                        y: Math.random() * (GAME_HEIGHT - 200) + 100,
                    };

                    const objectsToAvoid = [...obstacles, player, ...enemies];
                    if (!objectsToAvoid.some(obj => isColliding({ position: tempPos, size: POWERUP_SIZE }, obj))) {
                        position = tempPos;
                    }
                }

                if (position) {
                    setPowerUps(pus => [...pus, {
                        id: `pu-boss-${Date.now()}`,
                        type,
                        position,
                        size: POWERUP_SIZE,
                        rotation: 0
                    }]);
                    lastBossPowerUpSpawnTime.current = now; // Reset timer
                }
            }
        } else if (lastBossPowerUpSpawnTime.current !== 0) {
             // Reset if boss is defeated or wave is over
            lastBossPowerUpSpawnTime.current = 0;
        }


        // 7. Cleanup
        setEnemies(es => es.filter(e => e.health > 0));
        
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [player, enemies, obstacles, setGameState, setScore, activePowerUp, playSound, createParticleExplosion, fireProjectile, startNewWave, wave, isMobileControls, moveJoystick, aimJoystick]);
    
    // --- EFFECTS & EVENT HANDLERS ---
    useEffect(() => {
        if (enemies.length === 0 && wave > 0 && !isStartingWave) {
            startNewWave();
        }
    }, [enemies.length, wave, startNewWave, isStartingWave]);
    
    useEffect(() => {
        startNewWave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
        const handleMouseMove = (e: MouseEvent) => {
            if (isMobileControls) return;
            if (gameAreaRef.current) {
                const rect = gameAreaRef.current.getBoundingClientRect();
                mousePosition.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }
        };
        const handleMouseDown = (e: MouseEvent) => {
            if (isMobileControls) return;
            if (e.button === 0) {
                 setPlayer(p => {
                    if(p.health <= 0) return p;
                    const now = performance.now();
                    const fireRate = activePowerUp?.type === 'rapidFire' ? PLAYER_FIRE_RATE * RAPID_FIRE_MULTIPLIER : PLAYER_FIRE_RATE;
                    if(now - p.lastShotTime > fireRate) {
                         if (activePowerUp?.type === 'multiShot') {
                            const totalAngle = MULTI_SHOT_SPREAD_ANGLE;
                            const angleStep = totalAngle / (MULTI_SHOT_COUNT - 1);
                            const startAngle = p.turretRotation - totalAngle / 2;
                            for (let i = 0; i < MULTI_SHOT_COUNT; i++) {
                                fireProjectile(p, startAngle + i * angleStep);
                            }
                        } else {
                            fireProjectile(p);
                        }
                         return {...p, lastShotTime: now};
                    }
                    return p;
                 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
            if(activePowerUp?.timeoutId) clearTimeout(activePowerUp.timeoutId);
        };
    }, [gameLoop, activePowerUp, fireProjectile, isMobileControls]);

    const updateJoystick = useCallback((touch: Touch, role: 'move' | 'aim') => {
        const rect = gameAreaRef.current?.getBoundingClientRect();
        if(!rect) return;

        const basePosition = role === 'move' ? moveJoystickBase.current : aimJoystickBase.current;
        const setJoystick = role === 'move' ? setMoveJoystick : setAimJoystick;
        
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        const dx = touchX - basePosition.x;
        const dy = touchY - basePosition.y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
        const magnitude = clampedDist / JOYSTICK_RADIUS;

        const stickPosition = {
            x: basePosition.x + Math.cos(angle) * clampedDist,
            y: basePosition.y + Math.sin(angle) * clampedDist,
        };
        
        setJoystick({ active: true, angle, magnitude, position: stickPosition });
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        // FIX: Explicitly cast `touch` to type `Touch` to resolve properties like `clientX` and `identifier`.
        for (const touch of Array.from(e.changedTouches) as Touch[]) {
            const touchX = touch.clientX;
            const role = touchX < window.innerWidth / 2 ? 'move' : 'aim';
            if (!Object.values(activeTouches.current).includes(role)) {
                activeTouches.current[touch.identifier] = role;
                updateJoystick(touch, role);
            }
        }
    }, [updateJoystick]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        // FIX: Explicitly cast `touch` to type `Touch` to resolve properties like `identifier`.
        for (const touch of Array.from(e.changedTouches) as Touch[]) {
            const role = activeTouches.current[touch.identifier];
            if (role) {
                updateJoystick(touch, role);
            }
        }
    }, [updateJoystick]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        // FIX: Explicitly cast `touch` to type `Touch` to resolve properties like `identifier`.
        for (const touch of Array.from(e.changedTouches) as Touch[]) {
            const role = activeTouches.current[touch.identifier];
            if (role) {
                if(role === 'move') setMoveJoystick({ active: false, angle: 0, magnitude: 0, position: moveJoystickBase.current });
                if(role === 'aim') setAimJoystick({ active: false, angle: 0, magnitude: 0, position: aimJoystickBase.current });
                delete activeTouches.current[touch.identifier];
            }
        }
    }, []);

    const boss = enemies.find(e => e.isBoss);

    return (
        <div
            ref={gameAreaRef}
            className="relative cursor-crosshair overflow-hidden w-full h-full bg-black touch-none"
            style={{ boxShadow: 'inset 0 0 150px 20px rgba(0,0,0,0.6)' }}
            onTouchStart={isMobileControls ? handleTouchStart : undefined}
            onTouchMove={isMobileControls ? handleTouchMove : undefined}
            onTouchEnd={isMobileControls ? handleTouchEnd : undefined}
            onTouchCancel={isMobileControls ? handleTouchEnd : undefined}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 via-transparent to-gray-900/20 animate-slow-pan pointer-events-none" style={{ backgroundSize: '400% 100%' }} />
            <HUD
                score={score}
                health={player.health}
                maxHealth={PLAYER_MAX_HEALTH}
                wave={wave}
                waveMessage={waveMessage}
                bossHealth={boss?.health}
                bossMaxHealth={boss ? BOSS_MAX_HEALTH : undefined}
            />

            {obstacles.map(obs => (
                <div key={obs.id} className="absolute" style={{ top: obs.position.y - obs.size / 2, left: obs.position.x - obs.size / 2, width: obs.size, height: obs.size }}>
                     <svg viewBox="0 0 100 100" style={{ transform: `rotate(${obs.rotation}rad)`}}>
                        <path d="M 50,5 A 45,40 0 0 1 90,60 L 80,95 L 20,85 L 10,50 A 45,40 0 0 1 50,5 Z" fill="#374151" stroke="#1f2937" strokeWidth="3" />
                    </svg>
                </div>
            ))}
            
             {powerUps.map(pu => (
                 <div key={pu.id} className="absolute" style={{ top: pu.position.y - pu.size / 2, left: pu.position.x - pu.size / 2 }}>
                    <PowerUpIcon type={pu.type} size={pu.size} />
                 </div>
             ))}

            {player.health > 0 && <div className="absolute" style={{ top: player.position.y - player.size / 2, left: player.position.x - player.size / 2 }}>
                <HealthBar health={player.health} maxHealth={PLAYER_MAX_HEALTH} size={player.size} isPlayer={true} shield={player.shield} />
                <TankIcon color={TANK_COLORS.playerBody} turretColor={TANK_COLORS.playerTurret} size={player.size} bodyRotation={player.rotation} turretRotation={player.turretRotation} lastHitTime={player.lastHitTime}/>
            </div>}

            {enemies.map(enemy => (
                <div key={enemy.id} className="absolute" style={{ top: enemy.position.y - enemy.size / 2, left: enemy.position.x - enemy.size / 2 }}>
                     <HealthBar health={enemy.health} maxHealth={enemy.isBoss ? BOSS_MAX_HEALTH : ENEMY_MAX_HEALTH} size={enemy.size} isPlayer={false} />
                     <TankIcon color={enemy.isBoss ? TANK_COLORS.bossBody : TANK_COLORS.enemyBody} turretColor={enemy.isBoss ? TANK_COLORS.bossTurret : TANK_COLORS.enemyTurret} size={enemy.size} bodyRotation={enemy.rotation} turretRotation={enemy.turretRotation} lastHitTime={enemy.lastHitTime} />
                </div>
            ))}
             {projectiles.map(proj => (
                <div key={proj.id} className="absolute bg-yellow-400 rounded-full shadow-lg" style={{ top: proj.position.y - proj.size/2, left: proj.position.x - proj.size/2, width: proj.size, height: proj.size, boxShadow:'0 0 8px #f59e0b' }}/>
            ))}
            {particles.map(p => {
                const opacity = p.lifespan / p.initialLifespan;
                const scale = opacity; // Particles shrink as they fade
                return (
                    <div key={p.id} className="absolute rounded-full pointer-events-none" style={{
                        top: p.position.y,
                        left: p.position.x,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        opacity: opacity,
                        transform: `translate(-50%, -50%) scale(${scale})`,
                    }} />
                );
            })}

            {isMobileControls && (
                <>
                    {/* Move Joystick */}
                    <div className="absolute rounded-full bg-gray-500/30" style={{ left: moveJoystickBase.current.x - JOYSTICK_RADIUS, top: moveJoystickBase.current.y - JOYSTICK_RADIUS, width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2 }} />
                    <div className="absolute rounded-full bg-gray-400/50" style={{ left: moveJoystick.position.x - STICK_RADIUS, top: moveJoystick.position.y - STICK_RADIUS, width: STICK_RADIUS * 2, height: STICK_RADIUS * 2, pointerEvents: 'none' }} />
                    
                    {/* Aim Joystick */}
                    <div className="absolute rounded-full bg-gray-500/30" style={{ left: aimJoystickBase.current.x - JOYSTICK_RADIUS, top: aimJoystickBase.current.y - JOYSTICK_RADIUS, width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2 }} />
                    <div className="absolute rounded-full bg-gray-400/50" style={{ left: aimJoystick.position.x - STICK_RADIUS, top: aimJoystick.position.y - STICK_RADIUS, width: STICK_RADIUS * 2, height: STICK_RADIUS * 2, pointerEvents: 'none' }} />
                </>
            )}

            <style>{`
                @keyframes slow-pan {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-slow-pan {
                    animation: slow-pan 30s ease-in-out infinite;
                }
                .touch-none {
                    touch-action: none;
                }
            `}</style>
        </div>
    );
};