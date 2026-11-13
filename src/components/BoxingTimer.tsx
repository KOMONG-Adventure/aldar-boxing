"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, Shield, Flame, BellRing } from "lucide-react";

export default function BoxingTimer() {
  const [roundTime, setRoundTime] = useState(180); // 3 минут
  const [restTime, setRestTime] = useState(60);   // 1 минут
  const [totalRounds, setTotalRounds] = useState(5);

  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(180);
  const [isResting, setIsResting] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Дууны дохио (Web Audio API - ямар ч гадны файл шаардахгүй цэвэр synth)
  const playSound = (freq = 800, type: OscillatorType = "sine", duration = 0.4) => {
    try {
      const audioCtx = new window.AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
      osc.onended = () => { void audioCtx.close(); };
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const tick = window.setTimeout(() => {
      if (timeLeft > 1) {
        if (timeLeft === 4) playSound(600, "square", 0.15);
        setTimeLeft(timeLeft - 1);
        return;
      }
      if (isResting) {
        playSound(900, "sine", 0.6);
        setIsResting(false);
        setCurrentRound(currentRound + 1);
        setTimeLeft(roundTime);
        return;
      }
      playSound(450, "sine", 0.8);
      if (currentRound < totalRounds) {
        setIsResting(true);
        setTimeLeft(restTime);
      } else {
        setTimeLeft(0);
        setIsActive(false);
        playSound(1000, "square", 1.2);
      }
    }, 1000);
    return () => window.clearTimeout(tick);
  }, [isActive, timeLeft, isResting, currentRound, roundTime, restTime, totalRounds]);
  const toggleTimer = () => {
    if (!isActive && timeLeft === 0) {
      setIsResting(false);
      setCurrentRound(1);
      setTimeLeft(roundTime);
    }
    if (!isActive) playSound(800, "sine", 0.3);
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsResting(false);
    setCurrentRound(1);
    setTimeLeft(roundTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-600/20 text-red-500 rounded-xl">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Боксын Раунд Таймер (Pro Round Timer)</h3>
            <p className="text-[11px] text-zinc-400">Спарринг, цохилт бэлтгэлд зориулсан аудио дохиотой</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
          isResting 
            ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
            : isActive 
            ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" 
            : "bg-zinc-800 text-zinc-400 border-zinc-700"
        }`}>
          {isResting ? "АМРАЛТ" : isActive ? "ТУЛААН ЯВАГДАЖ БАЙНА" : "БЭЛЭН"}
        </span>
      </div>

      {/* Таймер цаг том дэлгэц */}
      <div className={`p-6 rounded-3xl text-center border-2 transition-all duration-300 relative overflow-hidden ${
        isResting 
          ? "bg-blue-950/20 border-blue-600/40" 
          : isActive 
          ? "bg-red-950/30 border-red-600/60 shadow-lg shadow-red-950/50" 
          : "bg-[#16161b] border-zinc-800"
      }`}>
        <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold block mb-1">
          {isResting ? "Дараагийн раунд хүртэл амрах" : `Раунд ${currentRound} / ${totalRounds}`}
        </span>
        <div className="text-6xl sm:text-7xl font-black tracking-tight text-white font-mono">
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Удирдлагын товчнууд */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={toggleTimer}
          className={`py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition text-sm shadow-lg ${
            isActive 
              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20" 
              : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30"
          }`}
        >
          {isActive ? <Pause size={18} /> : <Play size={18} />}
          {isActive ? "Түр зогсоох" : "Эхлүүлэх (Fight!)"}
        </button>

        <button
          onClick={resetTimer}
          className="py-3.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-semibold flex items-center justify-center gap-2 transition text-sm"
        >
          <RotateCcw size={18} /> Дахин эхлүүлэх
        </button>
      </div>

      {/* Тохиргооны хурдан сонголтууд */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <button
          onClick={() => { setRoundTime(180); setRestTime(60); resetTimer(); setTimeLeft(180); }}
          className="p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-[11px] text-zinc-300 border border-zinc-700/50 transition"
        >
          🥊 Мэргэжлийн (3 мин / 1 мин)
        </button>
        <button
          onClick={() => { setRoundTime(120); setRestTime(60); resetTimer(); setTimeLeft(120); }}
          className="p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-[11px] text-zinc-300 border border-zinc-700/50 transition"
        >
          ⚡ Сонирхогч (2 мин / 1 мин)
        </button>
        <button
          onClick={() => { setRoundTime(60); setRestTime(30); resetTimer(); setTimeLeft(60); }}
          className="p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-[11px] text-zinc-300 border border-zinc-700/50 transition"
        >
          🔥 HIIT Спринт (1 мин / 30 сек)
        </button>
      </div>
    </div>
  );
}
