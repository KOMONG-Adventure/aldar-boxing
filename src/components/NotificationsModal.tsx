"use client";

import React, { useState } from "react";
import { Bell, Check, Info, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { AppNotification } from "@/lib/db";

interface NotificationsModalProps {
  notifications: AppNotification[];
  onRefresh: () => void;
}

export default function NotificationsModal({ notifications, onRefresh }: NotificationsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      {/* Мэдэгдлийн товч */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Мэдэгдэл"
        className="relative p-2.5 rounded-2xl bg-[#141416] border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Попап дэлгэц */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#161619] border border-zinc-800 rounded-3xl shadow-2xl z-50 p-4 text-xs animate-in fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <Bell size={16} className="text-red-500" />
                Мэдэгдлүүд
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-zinc-400 hover:text-red-400 flex items-center gap-1 transition"
                >
                  <Check size={13} /> Бүгдийг уншсан болгох
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center py-6 text-zinc-500 text-xs">Мэдэгдэл байхгүй байна</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-2xl border transition flex items-start gap-2.5 ${
                      !n.read 
                        ? 'bg-[#1e1e23] border-zinc-700/80 text-white' 
                        : 'bg-[#121215] border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.type === 'alert' && <AlertTriangle size={15} className="text-red-500" />}
                      {n.type === 'success' && <CheckCircle size={15} className="text-emerald-500" />}
                      {n.type === 'info' && <Info size={15} className="text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-zinc-200">{n.title}</span>
                        <span className="text-[10px] text-zinc-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
