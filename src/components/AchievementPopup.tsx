import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface AchievementPopupProps {
  message: string;
  onClose?: () => void;
}

export default function AchievementPopup({ message, onClose }: AchievementPopupProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onClose) onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!show) return null;

  return (
    <div className="achievement-popup flex items-center gap-3">
      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
        <Trophy className="w-6 h-6 text-yellow-600" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900">Parabéns!</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}