import React, { useState, useCallback, useEffect } from 'react';
import { Game } from './components/Game';
import { MenuScreen, GameOverScreen } from './components/UI';
import type { GameState } from './types';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        return parseInt(localStorage.getItem('tankHighScore') || '0', 10);
    });
    const [isMobileControls, setIsMobileControls] = useState(false);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('tankHighScore', score.toString());
        }
    }, [score, highScore]);
    
    const startGame = useCallback(() => {
        setScore(0);
        setGameState('playing');
    }, []);

    const endGame = useCallback(() => {
        setGameState('gameOver');
    }, []);

    const restartGame = useCallback(() => {
        startGame();
    }, [startGame]);

    return (
        <main
            className="relative h-screen w-screen flex items-center justify-center font-orbitron"
            style={{
                backgroundImage: 'url("/bg.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div 
                className="relative bg-black border-2 border-blue-400/50 rounded-lg shadow-2xl shadow-blue-500/20 overflow-hidden"
                style={{width: GAME_WIDTH, height: GAME_HEIGHT}}
            >
                {gameState === 'menu' && <MenuScreen 
                    onStartGame={startGame} 
                    highScore={highScore} 
                    isMobileControls={isMobileControls}
                    onToggleMobileControls={() => setIsMobileControls(c => !c)}
                />}
                {gameState === 'playing' && <Game setGameState={endGame} setScore={setScore} score={score} isMobileControls={isMobileControls} />}
                {gameState === 'gameOver' && <GameOverScreen score={score} onRestart={restartGame} />}
            </div>
            <div className="absolute bottom-2 right-4 text-gray-500 text-xs font-mono opacity-75 z-50 pointer-events-none">
                Created by: Kyle Anthony Sarmiento
            </div>
        </main>
    );
};

export default App;