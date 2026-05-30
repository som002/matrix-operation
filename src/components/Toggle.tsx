import React from 'react';
import { motion } from 'motion/react';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
        {label}
      </span>
      <div 
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-slate-700'}`}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <motion.div 
          className="inline-block h-3 w-3 transform rounded-full bg-white bg-opacity-90 transition shadow-sm"
          animate={{ x: checked ? 20 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </label>
  );
};
