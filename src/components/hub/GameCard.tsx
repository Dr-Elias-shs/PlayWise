import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const GameCard = ({ title, description, icon: Icon, color, onClick, disabled }: GameCardProps) => {
  return (
    <motion.div 
      whileHover={!disabled ? { y: -5 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`game-card ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`p-4 rounded-2xl ${color} text-white`}>
        <Icon size={48} />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      {!disabled ? (
        <button className="btn-primary w-full mt-2">Play Now</button>
      ) : (
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-4">Coming Soon</span>
      )}
    </motion.div>
  );
};