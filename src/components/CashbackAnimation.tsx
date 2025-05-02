import React from 'react';
import { CreditCard } from 'lucide-react';

interface CashbackAnimationProps {
  amount: number;
}

const CashbackAnimation: React.FC<CashbackAnimationProps> = ({ amount }) => {
  return (
    <div className="cashback-animation flex items-center gap-2 text-purple-600">
      <CreditCard className="w-6 h-6" />
      <span className="font-medium">+R$ {amount.toFixed(2)}</span>
    </div>
  );
};

export default CashbackAnimation;