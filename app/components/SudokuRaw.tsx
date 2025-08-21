// @ts-nocheck
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, CheckCircle, Clock, Star, Undo, Edit3, PenTool, Pause, Play, Home, Zap, Target, Heart, Moon, Sun, Volume2, VolumeX, Settings } from 'lucide-react';

const SudokuGame = () => {
  // Add favicon when component mounts
  useEffect(() => {
    // Create SVG favicon with Sudoku grid design
    const faviconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="#3B82F6"/>
        <rect x="2" y="2" width="28" height="28" fill="white" stroke="#1E40AF" stroke-width="2"/>
        <line x1="12" y1="2" x2="12" y2="30" stroke="#1E40AF" stroke-width="1"/>
        <line x1="22" y1="2" x2="22" y2="30" stroke="#1E40AF" stroke-width="1"/>
        <line x1="2" y1="12" x2="30" y2="12" stroke="#1E40AF" stroke-width="1"/>
        <line x1="2" y1="22" x2="30" y2="22" stroke="#1E40AF" stroke-width="1"/>
        <text x="7" y="10" fill="#1E40AF" font-size="8" font-weight="bold">1</text>
        <text x="17" y="20" fill="#1E40AF" font-size="8" font-weight="bold">5</text>
        <text x="25" y="28" fill="#1E40AF" font-size="8" font-weight="bold">9</text>
      </svg>
    `;
    
    // Convert SVG to data URL
    const faviconUrl = `data:image/svg+xml;base64,${btoa(faviconSvg)}`;
    
    // Remove existing favicon if any
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    // Add new favicon
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = faviconUrl;
    document.head.appendChild(favicon);
    
    // Also set the page title
    document.title = 'Sudoku Game';
    
    return () => {
      // Cleanup on unmount
      const currentFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (currentFavicon && currentFavicon.href === faviconUrl) {
        currentFavicon.remove();
      }
    };
  }, []);

  const [board, setBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [candidates, setCandidates] = useState(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
  const [userCandidates, setUserCandidates] = useState(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
  const [solution, setSolution] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [difficulty, setDifficulty] = useState('easy');
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState(Array(9).fill().map(() => Array(9).fill(false)));
  const [selectedCell, setSelectedCell] = useState({ row: -1, col: -1 });
  const [gameTime, setGameTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isNormalMode, setIsNormalMode] = useState(true);
  const [moveHistory, setMoveHistory] = useState([]);
  const [autoCandidates, setAutoCandidates] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [gameMode, setGameMode] = useState('classic');
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [revealedCells, setRevealedCells] = useState(Array(9).fill().map(() => Array(9).fill(false)));
  const [checkedCells, setCheckedCells] = useState(Array(9).fill().map(() => Array(9).fill(false)));
  const [speedTimeLimit] = useState(600);
  const [mistakes, setMistakes] = useState(0);
  const [maxMistakes] = useState(3);
  const [solvedPuzzles, setSolvedPuzzles] = useState({});

  // Cookie helpers
  const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Load settings from cookies
  useEffect(() => {
    const savedTheme = getCookie('sudoku_theme');
    const savedFontSize = getCookie('sudoku_fontSize');
    const savedSound = getCookie('sudoku_sound');
    const savedPuzzles = getCookie('sudoku_solved');
    
    if (savedTheme && ['light', 'dark', 'contrast'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
    if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
      setFontSize(savedFontSize);
    }
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
    if (savedPuzzles) {
      try {
        setSolvedPuzzles(JSON.parse(savedPuzzles));
      } catch (e) {
        setSolvedPuzzles({});
      }
    }
  }, []);

  useEffect(() => { setCookie('sudoku_theme', theme); }, [theme]);
  useEffect(() => { setCookie('sudoku_fontSize', fontSize); }, [fontSize]);
  useEffect(() => { setCookie('sudoku_sound', soundEnabled.toString()); }, [soundEnabled]);
  useEffect(() => { setCookie('sudoku_solved', JSON.stringify(solvedPuzzles)); }, [solvedPuzzles]);

  // Seeded random number generator
  const createSeededRandom = (seed) => {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  };

  const getSeed = (difficultyLevel, mode) => {
    const now = new Date();
    const year = now.getFullYear();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const hour = mode === 'daily' ? 0 : now.getHours();
    
    const difficultyMultiplier = { easy: 1, medium: 7, hard: 13 };
    const modeMultiplier = { classic: 1, speed: 17, zen: 23, daily: 31 };
    
    return (year * 10000 + dayOfYear * 100 + hour) * difficultyMultiplier[difficultyLevel] * modeMultiplier[mode];
  };

  const getThemeStyles = () => {
    const themes = {
      light: { bg: 'bg-gradient-to-br from-blue-50 to-purple-50', cardBg: 'bg-white', text: 'text-gray-800', subText: 'text-gray-600', border: 'border-gray-300' },
      dark: { bg: 'bg-gradient-to-br from-zinc-950 to-indigo-950', cardBg: 'bg-zinc-900', text: 'text-zinc-100', subText: 'text-zinc-400', border: 'border-zinc-700' },
      contrast: { bg: 'bg-white', cardBg: 'bg-white', text: 'text-black', subText: 'text-gray-800', border: 'border-black' }
    };
    return themes[theme];
  };

  const getFontSizeClass = () => {
    const sizes = { small: 'text-sm sm:text-base md:text-lg', medium: 'text-lg sm:text-xl md:text-2xl', large: 'text-xl sm:text-2xl md:text-3xl' };
    return sizes[fontSize];
  };

  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = { place: 440, error: 220, complete: 660 };
      oscillator.frequency.setValueAtTime(frequencies[type] || 440, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio not supported
    }
  };

  const shuffleArray = (array, random) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const isValidMove = (board, row, col, num) => {
    for (let j = 0; j < 9; j++) {
      if (board[row][j] === num) return false;
    }
    for (let i = 0; i < 9; i++) {
      if (board[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRow + i][boxCol + j] === num) return false;
      }
    }
    return true;
  };

  const solveSudoku = (board) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(board, row, col, num)) {
              board[row][col] = num;
              if (solveSudoku(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const generateCompleteBoard = (random) => {
    const board = Array(9).fill().map(() => Array(9).fill(0));
    for (let box = 0; box < 3; box++) {
      const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
      let numIndex = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          board[box * 3 + row][box * 3 + col] = numbers[numIndex++];
        }
      }
    }
    solveSudoku(board);
    return board;
  };

  const createPuzzle = (completeBoard, difficulty, random) => {
    const puzzle = completeBoard.map(row => [...row]);
    const difficultySettings = { easy: 40, medium: 50, hard: 60 };
    const numbersToRemove = difficultySettings[difficulty];
    const positions = [];
    
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        positions.push([i, j]);
      }
    }
    
    const shuffledPositions = shuffleArray(positions, random);
    for (let i = 0; i < numbersToRemove; i++) {
      const [row, col] = shuffledPositions[i];
      puzzle[row][col] = 0;
    }
    
    return puzzle;
  };

  const generateAutoCandidates = useCallback((currentBoard) => {
    const newCandidates = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentBoard[row][col] === 0) {
          const possibleNumbers = new Set();
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(currentBoard, row, col, num)) {
              possibleNumbers.add(num);
            }
          }
          newCandidates[row][col] = possibleNumbers;
        }
      }
    }
    
    return newCandidates;
  }, []);

  const toggleAutoCandidates = (enabled) => {
    setAutoCandidates(enabled);
    if (enabled) {
      const autoCands = generateAutoCandidates(board);
      setCandidates(autoCands);
    } else {
      setCandidates(userCandidates.map(row => row.map(cell => new Set(cell))));
    }
  };

  const isNumberComplete = useCallback((num) => {
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === num) {
          if (isValidMove(board.map((r, i) => r.map((c, j) => i === row && j === col ? 0 : c)), row, col, num)) {
            count++;
          }
        }
      }
    }
    return count === 9;
  }, [board]);

  const hasDuplicates = useCallback((row, col) => {
    const num = board[row][col];
    if (num === 0) return false;
    return !isValidMove(board.map((r, i) => r.map((c, j) => i === row && j === col ? 0 : c)), row, col, num);
  }, [board]);

  // Get puzzle identifier for tracking
  const getPuzzleId = (mode, diff) => {
    const seed = getSeed(diff, mode);
    return `${mode}_${diff}_${seed}`;
  };

  // Check if current puzzle is solved
  const isPuzzleSolved = () => {
    const puzzleId = getPuzzleId(gameMode, difficulty);
    return solvedPuzzles[puzzleId] !== undefined;
  };

  // Save completed puzzle
  const savePuzzleCompletion = (time, mode, diff, mistakeCount = 0, wasRevealed = false) => {
    const puzzleId = getPuzzleId(mode, diff);
    const completionData = {
      completedAt: Date.now(),
      time: time,
      mode: mode,
      difficulty: diff,
      mistakes: mistakeCount,
      revealed: wasRevealed,
      date: new Date().toDateString()
    };
    
    setSolvedPuzzles(prev => ({
      ...prev,
      [puzzleId]: completionData
    }));
  };

  // Get puzzle stats
  const getPuzzleStats = () => {
    const stats = {
      total: Object.keys(solvedPuzzles).length,
      byMode: {},
      byDifficulty: {},
      bestTimes: {},
      todaySolved: 0
    };
    
    const today = new Date().toDateString();
    
    Object.values(solvedPuzzles).forEach(puzzle => {
      // Count by mode
      stats.byMode[puzzle.mode] = (stats.byMode[puzzle.mode] || 0) + 1;
      
      // Count by difficulty  
      stats.byDifficulty[puzzle.difficulty] = (stats.byDifficulty[puzzle.difficulty] || 0) + 1;
      
      // Best times
      const key = `${puzzle.mode}_${puzzle.difficulty}`;
      if (!stats.bestTimes[key] || puzzle.time < stats.bestTimes[key]) {
        stats.bestTimes[key] = puzzle.time;
      }
      
      // Today's count
      if (puzzle.date === today) {
        stats.todaySolved++;
      }
    });
    
    return stats;
  };
  // Hint and reveal functions
  const giveHint = () => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0 && initialBoard[row][col] === 0) {
          const possibleNumbers = [];
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(board, row, col, num)) {
              possibleNumbers.push(num);
            }
          }
          if (possibleNumbers.length === 1) {
            setSelectedCell({ row, col });
            return;
          }
        }
      }
    }
    const emptyCells = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0 && initialBoard[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }
    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      setSelectedCell(randomCell);
    }
  };

  const checkSelectedCell = () => {
    if (selectedCell.row === -1 || selectedCell.col === -1) return;
    const { row, col } = selectedCell;
    
    if (board[row][col] === 0) return;
    
    const newCheckedCells = checkedCells.map(r => [...r]);
    newCheckedCells[row][col] = true;
    setCheckedCells(newCheckedCells);
    
    if (board[row][col] !== solution[row][col]) {
      playSound('error');
    } else {
      playSound('place');
    }
  };

  const checkAllCells = () => {
    const newCheckedCells = Array(9).fill().map(() => Array(9).fill(false));
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== 0) {
          newCheckedCells[row][col] = true;
        }
      }
    }
    setCheckedCells(newCheckedCells);
  };

  const revealSelectedCell = () => {
    if (selectedCell.row === -1 || selectedCell.col === -1) return;
    const { row, col } = selectedCell;
    
    if (initialBoard[row][col] !== 0) return;
    
    const newRevealedCells = revealedCells.map(r => [...r]);
    newRevealedCells[row][col] = true;
    setRevealedCells(newRevealedCells);
    
    handleCellChange(row, col, solution[row][col]);
    playSound('place');
  };

  const revealAllCells = () => {
    const newBoard = board.map((row, rowIndex) => 
      row.map((cell, colIndex) => 
        initialBoard[rowIndex][colIndex] !== 0 ? cell : solution[rowIndex][colIndex]
      )
    );
    
    const newRevealedCells = Array(9).fill().map((_, rowIndex) => 
      Array(9).fill().map((_, colIndex) => 
        initialBoard[rowIndex][colIndex] === 0 && board[rowIndex][colIndex] === 0
      )
    );
    
    setBoard(newBoard);
    setRevealedCells(newRevealedCells);
    setIsComplete(true);
    setIsPlaying(false);
    playSound('complete');
    
    // Save as revealed completion
    savePuzzleCompletion(gameTime, gameMode, difficulty, mistakes, true);
  };

  const saveMove = (row, col, oldValue, newValue, oldCandidates, newCandidates, moveType) => {
    setMoveHistory(prev => [...prev, {
      row, col, oldValue, newValue,
      oldCandidates: oldCandidates ? new Set(oldCandidates) : new Set(),
      newCandidates: newCandidates ? new Set(newCandidates) : new Set(),
      moveType, timestamp: Date.now()
    }]);
  };

  const undoMove = () => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const newBoard = board.map(row => [...row]);
    const newCandidates = candidates.map(row => row.map(cell => new Set(cell)));
    
    newBoard[lastMove.row][lastMove.col] = lastMove.oldValue;
    newCandidates[lastMove.row][lastMove.col] = new Set(lastMove.oldCandidates);
    
    setBoard(newBoard);
    setCandidates(newCandidates);
    if (!autoCandidates) {
      setUserCandidates(newCandidates.map(row => row.map(cell => new Set(cell))));
    }
    setMoveHistory(prev => prev.slice(0, -1));
    updateErrors(newBoard);
  };

  const startGame = (mode, diff) => {
    setGameMode(mode);
    setDifficulty(diff);
    setCurrentScreen('game');
    setMistakes(0);
    generatePuzzle(diff, mode);
  };

  const moveToNextLevel = () => {
    const levels = ['easy', 'medium', 'hard'];
    const currentIndex = levels.indexOf(difficulty);
    if (currentIndex < levels.length - 1) {
      const next = levels[currentIndex + 1];
      setDifficulty(next);
      generatePuzzle(next, gameMode);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const generatePuzzle = useCallback((diffOverride = difficulty, modeOverride = gameMode) => {
    const seed = getSeed(diffOverride, modeOverride);
    const random = createSeededRandom(seed);
    
    const completeBoard = generateCompleteBoard(random);
    const puzzle = createPuzzle(completeBoard, diffOverride, random);
    
    setBoard(puzzle);
    setInitialBoard(puzzle.map(row => [...row]));
    setSolution(completeBoard);
    setCandidates(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
    setUserCandidates(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
    setIsComplete(false);
    setErrors(Array(9).fill().map(() => Array(9).fill(false)));
    setSelectedCell({ row: -1, col: -1 });
    setGameTime(0);
    setIsPlaying(true);
    setIsPaused(false);
    setMoveHistory([]);
    setAutoCandidates(false);
    setRevealedCells(Array(9).fill().map(() => Array(9).fill(false)));
    setCheckedCells(Array(9).fill().map(() => Array(9).fill(false)));
  }, [difficulty, gameMode]);

  const checkCompletion = useCallback((currentBoard) => {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (currentBoard[i][j] === 0) return false;
      }
    }
    
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (currentBoard[i][j] !== solution[i][j]) return false;
      }
    }
    
    return true;
  }, [solution]);

  const updateErrors = useCallback((currentBoard) => {
    const newErrors = Array(9).fill().map(() => Array(9).fill(false));
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const num = currentBoard[row][col];
        if (num !== 0 && !isValidMove(currentBoard.map((r, i) => r.map((c, j) => i === row && j === col ? 0 : c)), row, col, num)) {
          newErrors[row][col] = true;
        }
      }
    }
    
    setErrors(newErrors);
  }, []);

  const handleCellChange = (row, col, value) => {
    if (initialBoard[row][col] !== 0 || revealedCells[row][col]) return;
    
    const oldValue = board[row][col];
    const oldCandidates = new Set(candidates[row][col]);
    
    if (isNormalMode) {
      if ((gameMode === 'speed') && value !== 0 && solution[row][col] !== value) {
        setMistakes(prev => prev + 1);
        playSound('error');
        if (mistakes + 1 >= maxMistakes) {
          setIsComplete(true);
          setIsPlaying(false);
          return;
        }
      }
      
      const newBoard = board.map((r, i) => r.map((c, j) => i === row && j === col ? value : c));
      const newCandidates = candidates.map((r, i) => r.map((c, j) => {
        if (i === row && j === col) {
          return new Set();
        }
        return new Set(c);
      }));
      
      setBoard(newBoard);
      if (!autoCandidates) {
        setCandidates(newCandidates);
        setUserCandidates(newCandidates.map(row => row.map(cell => new Set(cell))));
      }
      updateErrors(newBoard);
      saveMove(row, col, oldValue, value, oldCandidates, new Set(), 'normal');
      
      if (value !== 0) playSound('place');
      
      if (checkCompletion(newBoard)) {
        setIsComplete(true);
        setIsPlaying(false);
        playSound('complete');
        
        // Save puzzle completion
        savePuzzleCompletion(gameTime, gameMode, difficulty, mistakes);
      }
    } else {
      if (board[row][col] !== 0 || autoCandidates) return;
      
      const newCandidates = candidates.map((r, i) => r.map((c, j) => {
        if (i === row && j === col) {
          const newSet = new Set(c);
          if (newSet.has(value)) {
            newSet.delete(value);
          } else {
            newSet.add(value);
          }
          return newSet;
        }
        return new Set(c);
      }));
      
      setCandidates(newCandidates);
      setUserCandidates(newCandidates.map(row => row.map(cell => new Set(cell))));
      saveMove(row, col, oldValue, oldValue, oldCandidates, newCandidates[row][col], 'candidate');
    }
  };

  const clearCandidates = (row, col) => {
    if (initialBoard[row][col] !== 0 || board[row][col] !== 0 || autoCandidates || revealedCells[row][col]) return;
    
    const oldCandidates = new Set(candidates[row][col]);
    const newCandidates = candidates.map((r, i) => r.map((c, j) => {
      if (i === row && j === col) {
        return new Set();
      }
      return new Set(c);
    }));
    
    setCandidates(newCandidates);
    setUserCandidates(newCandidates.map(row => row.map(cell => new Set(cell))));
    saveMove(row, col, 0, 0, oldCandidates, new Set(), 'candidate');
  };

  const handleKeyPress = (e) => {
    // Arrow-key navigation
    if (!isPaused && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      let r = selectedCell.row, c = selectedCell.col;
      if (r === -1 || c === -1) { r = 0; c = 0; }
      if (e.key === 'ArrowUp')    r = Math.max(0, r - 1);
      if (e.key === 'ArrowDown')  r = Math.min(8, r + 1);
      if (e.key === 'ArrowLeft')  c = Math.max(0, c - 1);
      if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
      setSelectedCell({ row: r, col: c });
      return;
    }
    if (selectedCell.row === -1 || selectedCell.col === -1 || isPaused) return;
    
    const key = e.key;
    if (key >= '1' && key <= '9') {
      handleCellChange(selectedCell.row, selectedCell.col, parseInt(key));
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
      if (isNormalMode) {
        handleCellChange(selectedCell.row, selectedCell.col, 0);
      } else {
        clearCandidates(selectedCell.row, selectedCell.col);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    let interval;
    if (isPlaying && !isComplete && !isPaused) {
      interval = setInterval(() => {
        setGameTime(prev => {
          const newTime = prev + 1;
          if (gameMode === 'speed' && newTime >= speedTimeLimit) {
            setIsComplete(true);
            setIsPlaying(false);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isComplete, isPaused, gameMode, speedTimeLimit]);

  useEffect(() => {
    if (autoCandidates) {
      const newCandidates = generateAutoCandidates(board);
      setCandidates(newCandidates);
    }
  }, [board, autoCandidates, generateAutoCandidates]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedCell, isNormalMode, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetPuzzle = () => {
    setBoard(initialBoard.map(row => [...row]));
    setCandidates(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
    setUserCandidates(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
    setErrors(Array(9).fill().map(() => Array(9).fill(false)));
    setIsComplete(false);
    setSelectedCell({ row: -1, col: -1 });
    setGameTime(0);
    setIsPlaying(true);
    setIsPaused(false);
    setMoveHistory([]);
    setMistakes(0);
    setRevealedCells(Array(9).fill().map(() => Array(9).fill(false)));
    setCheckedCells(Array(9).fill().map(() => Array(9).fill(false)));
  };

  const getCellStyle = (row, col) => {
    const themeStyles = getThemeStyles();
    let baseClasses = `border ${themeStyles.border} font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center select-none relative `;
    
    baseClasses += "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 " + getFontSizeClass() + " ";
    
    if (row % 3 === 0) baseClasses += `border-t-2 ${theme === 'dark' ? 'border-t-gray-400' : theme === 'contrast' ? 'border-t-black' : 'border-t-gray-800'} `;
    if (col % 3 === 0) baseClasses += `border-l-2 ${theme === 'dark' ? 'border-l-gray-400' : theme === 'contrast' ? 'border-l-black' : 'border-l-gray-800'} `;
    if (row === 8) baseClasses += `border-b-2 ${theme === 'dark' ? 'border-b-gray-400' : theme === 'contrast' ? 'border-b-black' : 'border-b-gray-800'} `;
    if (col === 8) baseClasses += `border-r-2 ${theme === 'dark' ? 'border-r-gray-400' : theme === 'contrast' ? 'border-r-black' : 'border-r-gray-800'} `;
    
    const isSelected = selectedCell.row === row && selectedCell.col === col;
    const selectedCellValue = selectedCell.row !== -1 ? board[selectedCell.row][selectedCell.col] : 0;
    
    if (selectedCell.row !== -1 && selectedCell.col !== -1) {
      const selectedBoxRow = Math.floor(selectedCell.row / 3);
      const selectedBoxCol = Math.floor(selectedCell.col / 3);
      const currentBoxRow = Math.floor(row / 3);
      const currentBoxCol = Math.floor(col / 3);
      
      const isInSameRow = row === selectedCell.row;
      const isInSameCol = col === selectedCell.col;
      const isInSameBox = selectedBoxRow === currentBoxRow && selectedBoxCol === currentBoxCol;
      const hasSameNumber = selectedCellValue !== 0 && board[row][col] === selectedCellValue;
      
      if (isSelected) {
        baseClasses += (theme === 'dark' ? "bg-indigo-700 ring-2 ring-inset ring-indigo-400 z-20 " : "bg-blue-400 ring-2 ring-inset ring-blue-600 z-20 ");
      } else if (hasSameNumber) {
        baseClasses += (theme === 'dark' ? "bg-indigo-900/50 " : "bg-blue-200 ");
      } else if (isInSameRow || isInSameCol || isInSameBox) {
        baseClasses += (theme === 'dark' ? "bg-indigo-950/40 " : "bg-blue-100 ");
      } else if (initialBoard[row][col] !== 0) {
        baseClasses += `${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200'} ${themeStyles.text} font-bold `;
      } else if (revealedCells[row][col]) {
        baseClasses += `${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'} font-bold `;
      } else if (checkedCells[row][col]) {
        const isCorrect = board[row][col] === solution[row][col];
        baseClasses += isCorrect 
          ? `${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'} font-bold `
          : `${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'} font-bold `;
      } else {
        baseClasses += `${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : themeStyles.cardBg + ' hover:bg-blue-50'} ${themeStyles.text} `;
      }
    } else {
      if (initialBoard[row][col] !== 0) {
        baseClasses += `${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-200'} ${themeStyles.text} font-bold `;
      } else if (revealedCells[row][col]) {
        baseClasses += `${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'} font-bold `;
      } else if (checkedCells[row][col]) {
        const isCorrect = board[row][col] === solution[row][col];
        baseClasses += isCorrect 
          ? `${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'} font-bold `
          : `${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'} font-bold `;
      } else {
        baseClasses += `${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : themeStyles.cardBg + ' hover:bg-blue-50'} ${themeStyles.text} `;
      }
    }
    
    return baseClasses;
  };

  const renderErrorDot = (row, col) => {
    if (hasDuplicates(row, col)) {
      return <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full z-30"></div>;
    }
    return null;
  };

  const renderCandidates = (row, col) => {
    const cellCandidates = candidates[row][col];
    if (cellCandidates.size === 0) return null;
    
    const positions = {
      1: { top: '2px', left: '2px' }, 2: { top: '2px', left: '50%', transform: 'translateX(-50%)' }, 3: { top: '2px', right: '2px' },
      4: { top: '50%', left: '2px', transform: 'translateY(-50%)' }, 5: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, 6: { top: '50%', right: '2px', transform: 'translateY(-50%)' },
      7: { bottom: '2px', left: '2px' }, 8: { bottom: '2px', left: '50%', transform: 'translateX(-50%)' }, 9: { bottom: '2px', right: '2px' }
    };
    
    return (
      <div className="absolute inset-0">
        {Array.from(cellCandidates).map(num => (
          <div key={num} className="absolute text-xs text-gray-500 font-normal" style={positions[num]}>
            {num}
          </div>
        ))}
      </div>
    );
  };

  const themeStyles = getThemeStyles();

  // Home Screen
  if (currentScreen === 'home') {
    return (
      <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className={`text-4xl sm:text-6xl font-bold ${themeStyles.text} mb-4`}>Sudoku</h1>
            <p className={`text-lg ${themeStyles.subText}`}>Choose your challenge</p>
            
            {/* Stats Summary */}
            {Object.keys(solvedPuzzles).length > 0 && (
              <div className={`${themeStyles.cardBg} rounded-lg p-4 mt-6 shadow`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className={`text-2xl font-bold ${themeStyles.text}`}>{getPuzzleStats().total}</div>
                    <div className={`text-xs ${themeStyles.subText}`}>Total Solved</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${themeStyles.text}`}>{getPuzzleStats().todaySolved}</div>
                    <div className={`text-xs ${themeStyles.subText}`}>Today</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${themeStyles.text}`}>{getPuzzleStats().byDifficulty.hard || 0}</div>
                    <div className={`text-xs ${themeStyles.subText}`}>Hard Puzzles</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${themeStyles.text}`}>{getPuzzleStats().byMode.speed || 0}</div>
                    <div className={`text-xs ${themeStyles.subText}`}>Speed Wins</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mb-6">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-3 ${themeStyles.cardBg} rounded-lg shadow-lg hover:shadow-xl transition-all ${themeStyles.text}`}
            >
              <Star className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 ${themeStyles.cardBg} rounded-lg shadow-lg hover:shadow-xl transition-all ${themeStyles.text}`}
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {showStats && (
            <div className={`${themeStyles.cardBg} rounded-xl shadow-lg p-6 mb-6`}>
              <h3 className={`text-xl font-bold ${themeStyles.text} mb-4`}>Your Statistics</h3>
              
              {Object.keys(solvedPuzzles).length === 0 ? (
                <p className={`${themeStyles.subText} text-center py-8`}>
                  No puzzles completed yet. Start playing to build your stats!
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Overall Stats */}
                  <div>
                    <h4 className={`text-lg font-semibold ${themeStyles.text} mb-3`}>Overall Progress</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${themeStyles.text}`}>{getPuzzleStats().total}</div>
                        <div className={`text-sm ${themeStyles.subText}`}>Total Solved</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${themeStyles.text}`}>{getPuzzleStats().todaySolved}</div>
                        <div className={`text-sm ${themeStyles.subText}`}>Today</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${themeStyles.text}`}>{getPuzzleStats().byDifficulty.hard || 0}</div>
                        <div className={`text-sm ${themeStyles.subText}`}>Hard Solved</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${themeStyles.text}`}>{getPuzzleStats().byMode.speed || 0}</div>
                        <div className={`text-sm ${themeStyles.subText}`}>Speed Wins</div>
                      </div>
                    </div>
                  </div>

                  {/* Best Times */}
                  <div>
                    <h4 className={`text-lg font-semibold ${themeStyles.text} mb-3`}>Best Times</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['classic', 'speed', 'zen', 'daily'].map(mode => (
                        <div key={mode} className={`border ${themeStyles.border} rounded-lg p-3`}>
                          <h5 className={`font-medium ${themeStyles.text} mb-2 capitalize`}>{mode}</h5>
                          <div className="space-y-1">
                            {['easy', 'medium', 'hard'].map(diff => {
                              const bestTime = getPuzzleStats().bestTimes[`${mode}_${diff}`];
                              return (
                                <div key={diff} className="flex justify-between text-sm">
                                  <span className={`${themeStyles.subText} capitalize`}>{diff}:</span>
                                  <span className={`${themeStyles.text} font-mono`}>
                                    {bestTime ? formatTime(bestTime) : '--:--'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Completions */}
                  <div>
                    <h4 className={`text-lg font-semibold ${themeStyles.text} mb-3`}>Recent Completions</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Object.values(solvedPuzzles)
                        .sort((a, b) => b.completedAt - a.completedAt)
                        .slice(0, 10)
                        .map((puzzle, index) => (
                          <div key={index} className={`flex justify-between items-center p-2 ${themeStyles.border} border rounded`}>
                            <div>
                              <span className={`${themeStyles.text} capitalize font-medium`}>
                                {puzzle.mode} - {puzzle.difficulty}
                              </span>
                              {puzzle.revealed && <span className="text-yellow-600 ml-2">👁️</span>}
                            </div>
                            <div className="text-right">
                              <div className={`${themeStyles.text} font-mono text-sm`}>{formatTime(puzzle.time)}</div>
                              <div className={`${themeStyles.subText} text-xs`}>{puzzle.date}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showSettings && (
            <div className={`${themeStyles.cardBg} rounded-xl shadow-lg p-6 mb-6`}>
              <h3 className={`text-xl font-bold ${themeStyles.text} mb-4`}>Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeStyles.text} mb-2`}>Theme</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'light', icon: Sun, label: 'Light' },
                      { key: 'dark', icon: Moon, label: 'Dark' },
                      { key: 'contrast', icon: Target, label: 'High Contrast' }
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setTheme(key)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                          theme === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeStyles.text} mb-2`}>Font Size</label>
                  <div className="flex gap-2">
                    {['small', 'medium', 'large'].map(size => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`px-3 py-2 rounded-lg transition-all ${
                          fontSize === size ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="text-xs">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeStyles.text} mb-2`}>Sound Effects</label>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                      soundEnabled ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span className="text-xs">{soundEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { mode: 'classic', icon: Target, color: 'blue', desc: 'Traditional Sudoku with no time pressure' },
              { mode: 'speed', icon: Zap, color: 'yellow', desc: 'Race against time! 10 minutes, max 3 mistakes' },
              { mode: 'zen', icon: Heart, color: 'green', desc: 'Relaxing mode with no timer or mistakes' },
              { mode: 'daily', icon: Star, color: 'purple', desc: 'Same puzzle for everyone today' }
            ].map(({ mode, icon: Icon, color, desc }) => (
              <div key={mode} className={`${themeStyles.cardBg} rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer group`}>
                <div className="text-center">
                  <div className={`w-16 h-16 bg-${color}-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-${color}-200 transition-colors`}>
                    <Icon className={`w-8 h-8 text-${color}-600`} />
                  </div>
                  <h3 className={`text-xl font-bold ${themeStyles.text} mb-2`}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</h3>
                  <p className={`${themeStyles.subText} text-sm mb-4`}>{desc}</p>
                  
                  <div className="space-y-2">
                    {['easy', 'medium', 'hard'].map(diff => {
                      const puzzleId = getPuzzleId(mode, diff);
                      const isSolved = solvedPuzzles[puzzleId];
                      const bestTime = getPuzzleStats().bestTimes[`${mode}_${diff}`];
                      
                      return (
                        <div key={diff} className="relative">
                          <button
                            onClick={() => startGame(mode, diff)}
                            className={`w-full py-2 bg-${color}-500 text-white rounded-lg hover:bg-${color}-600 transition-colors text-sm font-medium relative`}
                          >
                            {diff.charAt(0).toUpperCase() + diff.slice(1)}
                            {isSolved && <span className="absolute right-2 top-1/2 transform -translate-y-1/2">✓</span>}
                          </button>
                          {bestTime && (
                            <div className="text-xs text-center text-gray-500 mt-1">
                              Best: {formatTime(bestTime)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} p-2 sm:p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Home Button and Dropdown */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => setCurrentScreen('home')}
            className={`p-2 ${themeStyles.cardBg} rounded-lg shadow hover:shadow-md transition-all ${themeStyles.text}`}
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className={`text-2xl sm:text-3xl font-bold ${themeStyles.text}`}>
              {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </h1>
          </div>
          
          {/* Dropdown Menu */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`p-2 ${themeStyles.cardBg} rounded-lg shadow hover:shadow-md transition-all ${themeStyles.text}`}
            >
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
              </div>
            </button>
            
            {showDropdown && (
              <div className={`absolute right-0 mt-2 w-48 ${themeStyles.cardBg} rounded-lg shadow-xl border ${themeStyles.border} z-[100]`}>
                <div className="py-1">
                  <button
                    onClick={() => { giveHint(); setShowDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm ${themeStyles.text} hover:bg-blue-50 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                  >
                    💡 Give Hint
                  </button>
                  <div className={`border-t ${themeStyles.border} my-1`}></div>
                  <button
                    onClick={() => { checkSelectedCell(); setShowDropdown(false); }}
                    disabled={selectedCell.row === -1 || board[selectedCell.row]?.[selectedCell.col] === 0}
                    className={`w-full text-left px-4 py-2 text-sm ${themeStyles.text} hover:bg-blue-50 ${theme === 'dark' ? 'hover:bg-gray-700' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    ✓ Check Selected Cell
                  </button>
                  <button
                    onClick={() => { checkAllCells(); setShowDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm ${themeStyles.text} hover:bg-blue-50 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                  >
                    ✓✓ Check All Cells
                  </button>
                  <div className={`border-t ${themeStyles.border} my-1`}></div>
                  <button
                    onClick={() => { revealSelectedCell(); setShowDropdown(false); }}
                    disabled={selectedCell.row === -1 || initialBoard[selectedCell.row]?.[selectedCell.col] !== 0}
                    className={`w-full text-left px-4 py-2 text-sm ${themeStyles.text} hover:bg-blue-50 ${theme === 'dark' ? 'hover:bg-gray-700' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    👁️ Reveal Selected Cell
                  </button>
                  <button
                    onClick={() => { revealAllCells(); setShowDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm ${themeStyles.text} hover:bg-blue-50 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                  >
                    👁️👁️ Reveal All Cells
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Stats */}
        <div className={`${themeStyles.cardBg} rounded-xl shadow-lg p-3 sm:p-6 mb-4 sm:mb-6`}>
          <div className="flex items-center justify-between">
            {gameMode !== 'zen' && (
              <div className={`flex items-center gap-2 ${themeStyles.text}`}>
                <Clock className="w-4 h-4" />
                <span className={`font-mono text-base sm:text-lg ${gameMode === 'speed' && gameTime > speedTimeLimit * 0.8 ? 'text-red-500' : ''}`}>
                  {formatTime(gameTime)}
                  {gameMode === 'speed' && ` / ${formatTime(speedTimeLimit)}`}
                </span>
                <button
                  onClick={togglePause}
                  disabled={!isPlaying || isComplete}
                  className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              </div>
            )}

            {gameMode === 'zen' && (
              <div className={`flex items-center gap-2 ${themeStyles.text}`}>
                <Heart className="w-5 h-5 text-green-500" />
                <span className="text-base sm:text-lg font-medium">Relax and enjoy</span>
              </div>
            )}

            {gameMode === 'speed' && (
              <div className={`flex items-center gap-4 ${themeStyles.text}`}>
                <div className="flex items-center gap-1">
                  <span className="text-sm">Mistakes:</span>
                  <span className={`font-bold ${mistakes >= maxMistakes - 1 ? 'text-red-500' : ''}`}>
                    {mistakes}/{maxMistakes}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={resetPuzzle}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className={`${themeStyles.cardBg} rounded-xl shadow-lg p-2 sm:p-6 mb-4 sm:mb-6 relative`}>
          <div className="flex justify-center">
            <div className={`inline-block ${theme === 'dark' ? 'bg-black border-2 border-gray-600' : theme === 'contrast' ? 'bg-black border-4 border-black' : 'bg-gray-800'} p-1 sm:p-2 rounded-lg`}>
              <div className="grid grid-cols-9 gap-0">
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => !isPaused && setSelectedCell({ row: rowIndex, col: colIndex })}
                      className={getCellStyle(rowIndex, colIndex)}
                      style={{ zIndex: selectedCell.row === rowIndex && selectedCell.col === colIndex ? 30 : 10 }}
                    >
                      {cell === 0 ? (
                        <>
                          {renderCandidates(rowIndex, colIndex)}
                          {renderErrorDot(rowIndex, colIndex)}
                        </>
                      ) : (
                        <>
                          <span className="relative z-40 pointer-events-none">{cell}</span>
                          {renderErrorDot(rowIndex, colIndex)}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {isPaused && (
            <div className="absolute inset-0 bg-black bg-opacity-70 rounded-xl flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 text-center shadow-2xl relative z-60">
                <Pause className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Game Paused</h3>
                <p className="text-gray-600 mb-4">Take a break! Your progress is saved.</p>
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2 mx-auto"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Number Pad with All Controls */}
        <div className={`${themeStyles.cardBg} rounded-xl shadow-lg p-3 sm:p-6 mb-4 sm:mb-6`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setIsNormalMode(true)}
              className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                isNormalMode ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Normal
            </button>
            <button
              onClick={() => setIsNormalMode(false)}
              className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                !isNormalMode ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Candidates
            </button>
            <button
              onClick={undoMove}
              disabled={moveHistory.length === 0}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
            >
              <Undo className="w-4 h-4" />
              Undo
            </button>
          </div>

          <div className="text-center">
            <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-xs sm:max-w-md mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isComplete = isNumberComplete(num);
                return (
                  <button
                    key={num}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (selectedCell.row !== -1 && selectedCell.col !== -1 && !isPaused) {
                        handleCellChange(selectedCell.row, selectedCell.col, num);
                      }
                    }}
                    disabled={selectedCell.row === -1 || selectedCell.col === -1 || isPaused}
                    className={`w-12 h-12 sm:w-14 sm:h-14 font-bold rounded-lg transition-all duration-300 text-sm sm:text-base touch-manipulation ${
                      isComplete
                        ? 'bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300 text-gray-600 shadow-inner border-2 border-gray-400'
                        : isNormalMode 
                          ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300'
                          : 'bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-300'
                    } disabled:cursor-not-allowed`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (selectedCell.row !== -1 && selectedCell.col !== -1 && !isPaused) {
                    if (isNormalMode) {
                      handleCellChange(selectedCell.row, selectedCell.col, 0);
                    } else {
                      clearCandidates(selectedCell.row, selectedCell.col);
                    }
                  }
                }}
                disabled={selectedCell.row === -1 || selectedCell.col === -1 || isPaused}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base touch-manipulation"
              >
                ✕
              </button>
            </div>
            
            <div className="flex items-center justify-center mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCandidates}
                  onChange={(e) => toggleAutoCandidates(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                />
                <span className={`text-xs ${themeStyles.subText}`}>Auto Candidates</span>
              </label>
            </div>
          </div>
        </div>

        {/* Completion Overlay */}
        {isComplete && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 sm:p-8 text-center shadow-2xl max-w-md mx-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                {gameMode === 'speed' && mistakes >= maxMistakes ? (
                  <>
                    <Clock className="w-8 h-8 text-red-500" />
                    <span className="text-2xl">⏰</span>
                    <Clock className="w-8 h-8 text-red-500" />
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <Star className="w-8 h-8 text-yellow-500" />
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </>
                )}
              </div>
              
              {gameMode === 'speed' && mistakes >= maxMistakes ? (
                <>
                  <h2 className="text-2xl font-bold text-red-700 mb-3">Game Over!</h2>
                  <p className="text-red-600 mb-4">Too many mistakes in speed mode</p>
                </>
              ) : gameMode === 'speed' && gameTime >= speedTimeLimit ? (
                <>
                  <h2 className="text-2xl font-bold text-orange-700 mb-3">Time's Up!</h2>
                  <p className="text-orange-600 mb-4">Speed challenge completed</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-green-700 mb-3">Congratulations!</h2>
                  <p className="text-green-600 mb-2">
                    You completed the <span className="font-bold">{difficulty}</span> {gameMode} puzzle!
                  </p>
                </>
              )}
              
              {!(gameMode === 'speed' && (mistakes >= maxMistakes || gameTime >= speedTimeLimit)) && gameMode !== 'zen' && (
                <p className="text-gray-600 mb-4">
                  Time: <span className="font-mono font-bold">{formatTime(gameTime)}</span>
                  {gameMode === 'speed' && ` | Mistakes: ${mistakes}/${maxMistakes}`}
                </p>
              )}
              
              {gameMode === 'zen' && (
                <p className="text-gray-600 mb-4">
                  <span className="text-green-600">✨ Peaceful solving completed ✨</span>
                </p>
              )}
              
              {/* Show if this puzzle was already solved */}
              {isPuzzleSolved() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-sm">
                    🏆 Previously completed in {formatTime(solvedPuzzles[getPuzzleId(gameMode, difficulty)]?.time || 0)}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-3">
                {difficulty !== 'hard' && !(gameMode === 'speed' && (mistakes >= maxMistakes || gameTime >= speedTimeLimit)) && (
                  <button
                    onClick={moveToNextLevel}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center gap-2 justify-center"
                  >
                    <Star className="w-4 h-4" />
                    Next Level ({difficulty === 'easy' ? 'Medium' : 'Hard'})
                  </button>
                )}
                <button
                  onClick={() => startGame(gameMode, difficulty)}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SudokuGame;