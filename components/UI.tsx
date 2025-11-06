import React from 'react';

interface MenuScreenProps {
  onStartGame: () => void;
  highScore: number;
  isMobileControls: boolean;
  onToggleMobileControls: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStartGame, highScore, isMobileControls, onToggleMobileControls }) => (
    <div 
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
    >
        <h1 className="text-8xl font-black text-white uppercase tracking-widest" style={{ textShadow: '0 0 15px #dc2626' }}>
            TANK
        </h1>
        <p className="text-gray-300 mt-4 mb-8 text-lg">in a Moon!</p>
        <button
            onClick={onStartGame}
            className="bg-red-600 text-white font-bold py-4 px-12 rounded-md uppercase text-xl tracking-wider hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-600/50"
        >
            Start Game
        </button>
        <div className="mt-8 flex items-center gap-3 select-none">
            <input 
                id="mobile-controls-toggle"
                type="checkbox" 
                checked={isMobileControls} 
                onChange={onToggleMobileControls}
                className="appearance-none h-6 w-6 border-2 border-gray-500 rounded-md bg-gray-800 checked:bg-red-600 checked:border-red-400 focus:outline-none transition duration-200 cursor-pointer"
            />
            <label htmlFor="mobile-controls-toggle" className="text-white text-md cursor-pointer">Enable Mobile Controls</label>
            <style>{`
                input[type="checkbox"]:checked {
                    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
                    background-size: 100% 100%;
                    background-position: center;
                    background-repeat: no-repeat;
                }
            `}</style>
        </div>
        <div className="mt-8 text-center">
            <p className="text-gray-400 text-md">High Score: {highScore}</p>
            <p className="text-gray-500 mt-2 text-sm">Created By: Kyle Anthony Sarmiento</p>
        </div>
    </div>
);

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart }) => (
  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-center z-50 backdrop-blur-sm">
    <h2 className="text-7xl font-black text-red-500 uppercase">Game Over</h2>
    <p className="text-gray-300 mt-4 mb-8 text-2xl">Your Score: {score}</p>
    <button
      onClick={onRestart}
      className="bg-gray-200 text-gray-900 font-bold py-4 px-12 rounded-md uppercase text-xl tracking-wider hover:bg-white transition-all duration-300 transform hover:scale-105"
    >
      Restart
    </button>
  </div>
);

interface HUDProps {
  score: number;
  health: number;
  maxHealth: number;
  wave: number;
  waveMessage: string;
  bossHealth?: number;
  bossMaxHealth?: number;
  bossName?: string;
}

export const HUD: React.FC<HUDProps> = ({ score, health, maxHealth, wave, waveMessage, bossHealth, bossMaxHealth, bossName }) => {
  const healthPercentage = (health / maxHealth) * 100;

  const isSecondBoss = bossName === "Gio the Molester";
  const bossNameColor = isSecondBoss ? 'text-violet-400' : 'text-purple-400';
  const bossShadowColor = isSecondBoss ? '#a78bfa' : '#8b5cf6';
  const bossBarGradient = isSecondBoss 
      ? 'from-violet-500 to-violet-700' 
      : 'from-purple-500 to-purple-700';

  return (
    <>
      <div className="absolute top-4 left-4 text-white text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
        Score: {score}
      </div>
      <div className="absolute top-4 right-4 text-white text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
        Wave: {wave}
      </div>

      {/* Boss UI */}
      {bossHealth && bossMaxHealth && bossHealth > 0 && bossName && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-2/3 flex flex-col items-center z-20">
              <h3 className={`text-3xl font-black ${bossNameColor} uppercase tracking-widest`} style={{ textShadow: `0 0 10px ${bossShadowColor}` }}>
                  {bossName}
              </h3>
              <div className="w-full bg-gray-900 rounded-full h-5 border-2 border-purple-800 mt-2 shadow-lg">
                  <div
                      className={`bg-gradient-to-r ${bossBarGradient} h-full rounded-full transition-all duration-300 ease-out`}
                      style={{ width: `${(bossHealth / bossMaxHealth) * 100}%` }}
                  ></div>
              </div>
          </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3">
        <div className="text-center mb-2 text-lg">HEALTH</div>
        <div className="w-full bg-gray-700 rounded-full h-6 border-2 border-gray-500">
          <div
            className="bg-gradient-to-r from-red-500 to-red-700 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${healthPercentage}%` }}
          ></div>
        </div>
      </div>
      {waveMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 text-5xl font-black text-white uppercase animate-pulse" style={{ textShadow: '0 0 10px #dc2626' }}>
            {waveMessage}
        </div>
      )}
    </>
  );
};