// @ts-nocheck
"use client";

import React, { useState } from "react";
import { UserPlus, Mail, Key, Lock, CheckCircle2, X, Eye, EyeOff } from "lucide-react";

export default function UserModal({
  modalConfig,
  formData,
  setFormData,
  handleApplyChanges,
  closeModal,
}: {
  modalConfig: { type: string | null; userId?: string | null };
  formData: { name: string; email: string; password: string; confirm: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; email: string; password: string; confirm: string }>>;
  handleApplyChanges: () => void;
  closeModal: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const actionButtonPalette =
    modalConfig.type === "create"
      ? "bg-emerald-300 hover:bg-emerald-400 shadow-emerald-200"
      : modalConfig.type === "email"
        ? "bg-indigo-300 hover:bg-indigo-400 shadow-indigo-200"
        : "bg-amber-400 hover:bg-amber-500 shadow-amber-200";

  const passwordMismatch =
    modalConfig.type === "password" &&
    formData.password &&
    formData.confirm &&
    formData.password !== formData.confirm;

  const handleSubmit = () => {
    if (passwordMismatch) return;
    handleApplyChanges();
  };

  if (!modalConfig.type) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                modalConfig.type === "create"
                  ? "bg-emerald-100 text-emerald-600"
                  : modalConfig.type === "email"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-amber-100 text-amber-600"
              }`}
            >
              {modalConfig.type === "create" ? <UserPlus size={18} /> : modalConfig.type === "email" ? <Mail size={18} /> : <Key size={18} />}
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
              {modalConfig.type === "create" ? "Create Local User" : modalConfig.type === "email" ? "Update User Email" : "Rotate Password"}
            </h3>
          </div>
          <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {modalConfig.type === "create" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">User Name</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>
            </div>
          )}

          {(modalConfig.type === "create" || modalConfig.type === "email") && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  placeholder="name@seam.io"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          )}

          {(modalConfig.type === "create" || modalConfig.type === "password") && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Secure password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-xs"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {modalConfig.type === "password" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirm Password</label>
                  <div className="relative">
                    <CheckCircle2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-xs"
                      value={formData.confirm}
                      onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowConfirm((prev) => !prev)}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordMismatch && (
                    <p className="text-[10px] font-black text-rose-500 pl-1">Passwords do not match.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-black text-slate-500 hover:bg-white transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={passwordMismatch}
            className={`flex-1 px-4 py-2.5 rounded-xl font-black text-slate-900 shadow-lg active:scale-95 transition-all ${actionButtonPalette} ${passwordMismatch ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {modalConfig.type === "create" ? "Create User" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
