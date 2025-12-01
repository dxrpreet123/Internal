
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ErrorGameProps {
  onReset: () => void;
  errorDetails?: string;
}

const GRID_SIZE = 20;
const SPEED = 100;

const ErrorGame: React.FC<ErrorGameProps> = ({ onReset, errorDetails }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('orbis_snake_hiscore') || '0'));

  // Game State Refs (to avoid closure staleness in interval)
  const snakeRef = useRef<{x: number, y: number}[]>([{x: 10, y: 10}]);
  const foodRef = useRef<{x: number, y: number}>({x: 15, y: 15});
  const dirRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  const nextDirRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  const intervalRef = useRef<any>(null);

  const spawnFood = () => {
    const x = Math.floor(Math.random() * (canvasRef.current!.width / GRID_SIZE));
    const y = Math.floor(Math.random() * (canvasRef.current!.height / GRID_SIZE));
    foodRef.current = { x, y };
  };

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    snakeRef.current = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}]; // Start with length 3
    dirRef.current = {x: 0, y: -1}; // Moving up
    nextDirRef.current = {x: 0, y: -1};
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(gameLoop, SPEED);
  };

  const gameLoop = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const w = canvas.width / GRID_SIZE;
    const h = canvas.height / GRID_SIZE;

    // Update Direction
    dirRef.current = nextDirRef.current;

    const head = { ...snakeRef.current[0] };
    head.x += dirRef.current.x;
    head.y += dirRef.current.y;

    // Collision (Walls)
    if (head.x < 0 || head.x >= w || head.y < 0 || head.y >= h) {
        handleGameOver();
        return;
    }

    // Collision (Self)
    for (let part of snakeRef.current) {
        if (part.x === head.x && part.y === head.y) {
            handleGameOver();
            return;
        }
    }

    snakeRef.current.unshift(head);

    // Eat Food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore(s => s + 10);
        spawnFood();
    } else {
        snakeRef.current.pop();
    }

    draw(canvas);
  };

  const handleGameOver = () => {
      clearInterval(intervalRef.current);
      setGameOver(true);
      setGameStarted(false);
      setScore(current => {
          if (current > highScore) {
              setHighScore(current);
              localStorage.setItem('orbis_snake_hiscore', current.toString());
          }
          return current;
      });
  };

  const draw = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.fillStyle = '#0c0a09'; // Dark BG
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Snake
      ctx.fillStyle = '#ea580c'; // Orange
      snakeRef.current.forEach((part, i) => {
          // Gradient or fade for tail
          ctx.globalAlpha = 1 - (i / (snakeRef.current.length + 5));
          ctx.fillRect(part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
      });
      ctx.globalAlpha = 1;

      // Draw Food
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
          foodRef.current.x * GRID_SIZE + GRID_SIZE/2, 
          foodRef.current.y * GRID_SIZE + GRID_SIZE/2, 
          GRID_SIZE/3, 0, Math.PI * 2
      );
      ctx.fill();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (!gameStarted) return;
      
      switch(e.key) {
          case 'ArrowUp': 
          case 'w':
              if (dirRef.current.y === 0) nextDirRef.current = {x: 0, y: -1}; 
              break;
          case 'ArrowDown':
          case 's':
              if (dirRef.current.y === 0) nextDirRef.current = {x: 0, y: 1}; 
              break;
          case 'ArrowLeft':
          case 'a':
              if (dirRef.current.x === 0) nextDirRef.current = {x: -1, y: 0}; 
              break;
          case 'ArrowRight':
          case 'd':
              if (dirRef.current.x === 0) nextDirRef.current = {x: 1, y: 0}; 
              break;
      }
  }, [gameStarted]);

  const handleTouchControl = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (!gameStarted) startGame();
      switch(direction) {
          case 'UP': if (dirRef.current.y === 0) nextDirRef.current = {x: 0, y: -1}; break;
          case 'DOWN': if (dirRef.current.y === 0) nextDirRef.current = {x: 0, y: 1}; break;
          case 'LEFT': if (dirRef.current.x === 0) nextDirRef.current = {x: -1, y: 0}; break;
          case 'RIGHT': if (dirRef.current.x === 0) nextDirRef.current = {x: 1, y: 0}; break;
      }
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Initial Draw
  useEffect(() => {
      if (canvasRef.current && !gameStarted) {
          const canvas = canvasRef.current;
          // Set logical resolution
          canvas.width = Math.min(window.innerWidth - 40, 400);
          canvas.height = 400;
          draw(canvas);
      }
  }, [gameStarted]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c0a09] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
        
        <div className="text-center mb-6 animate-fade-in px-4">
            <div className="inline-block p-3 rounded-full bg-red-500/10 mb-4">
                <span className="material-symbols-outlined text-4xl text-red-500">error_outline</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">404: Reality Glitch</h1>
            <p className="text-stone-400 max-w-md mx-auto text-sm">
               {errorDetails ? "Something broke in the system." : "This page doesn't exist anymore."} 
               <br/>While we reboot the universe, play some Snake.
            </p>
        </div>

        <div className="relative group">
            <canvas 
                ref={canvasRef} 
                className="bg-[#1c1917] rounded-xl shadow-2xl border border-stone-800 touch-none"
            />
            
            {/* Overlay Start Screen */}
            {!gameStarted && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center">
                    {gameOver && (
                        <div className="mb-4 text-center">
                            <div className="text-red-500 font-bold uppercase tracking-widest text-xl mb-1">Game Over</div>
                            <div className="text-white text-sm">Score: {score}</div>
                        </div>
                    )}
                    <button 
                        onClick={startGame}
                        className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-bold uppercase tracking-widest text-xs transition-transform hover:scale-105 shadow-lg"
                    >
                        {gameOver ? 'Try Again' : 'Play Snake'}
                    </button>
                    <div className="mt-4 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                        High Score: {highScore}
                    </div>
                </div>
            )}
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden grid grid-cols-3 gap-2 mt-6 w-48">
            <div></div>
            <button onPointerDown={(e) => { e.preventDefault(); handleTouchControl('UP'); }} className="h-12 bg-stone-800 rounded-lg flex items-center justify-center active:bg-orange-600"><span className="material-symbols-outlined">arrow_upward</span></button>
            <div></div>
            <button onPointerDown={(e) => { e.preventDefault(); handleTouchControl('LEFT'); }} className="h-12 bg-stone-800 rounded-lg flex items-center justify-center active:bg-orange-600"><span className="material-symbols-outlined">arrow_back</span></button>
            <button onPointerDown={(e) => { e.preventDefault(); handleTouchControl('DOWN'); }} className="h-12 bg-stone-800 rounded-lg flex items-center justify-center active:bg-orange-600"><span className="material-symbols-outlined">arrow_downward</span></button>
            <button onPointerDown={(e) => { e.preventDefault(); handleTouchControl('RIGHT'); }} className="h-12 bg-stone-800 rounded-lg flex items-center justify-center active:bg-orange-600"><span className="material-symbols-outlined">arrow_forward</span></button>
        </div>

        <div className="mt-8 flex gap-4">
            <button 
                onClick={onReset}
                className="px-6 py-3 border border-stone-700 text-stone-300 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-colors"
            >
                Return to Dashboard
            </button>
        </div>

    </div>
  );
};

export default ErrorGame;
