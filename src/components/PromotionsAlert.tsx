import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Promotion {
  id: string;
  title: string;
  description: string;
  dayOfWeek?: number;
  isSpecial?: boolean;
}

const PROMOTIONS: Promotion[] = [
  {
    id: 'tuesday',
    title: 'Terça do Açaí',
    description: 'Copo de 500g SEM PESO por apenas R$15,99!',
    dayOfWeek: 2, // Tuesday
    isSpecial: true
  },
  {
    id: 'thursday',
    title: 'Quinta Elite',
    description: 'Quilo por apenas R$37,99!',
    dayOfWeek: 4, // Thursday
  },
  {
    id: 'daily',
    title: 'Copo 300g',
    description: 'Copo de 300g SEM PESO por R$9,99!',
  }
];

export default function PromotionsAlert() {
  const [show, setShow] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Check if we've shown the alert today
    const lastShown = localStorage.getItem('lastPromotionShown');
    const today_str = today.toDateString();
    
    if (lastShown !== today_str) {
      // Find special promotion for today
      const todayPromotion = PROMOTIONS.find(p => p.dayOfWeek === dayOfWeek);
      
      // If no special promotion today, show a random one
      const promotionToShow = todayPromotion || 
        PROMOTIONS[Math.floor(Math.random() * PROMOTIONS.length)];

      setCurrentPromotion(promotionToShow);
      setShow(true);
      localStorage.setItem('lastPromotionShown', today_str);
    }
  }, []);

  if (!show || !currentPromotion) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm w-full animate-slide-up z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
        <button 
          onClick={() => setShow(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Tag className="w-6 h-6 text-purple-600" />
          </div>

          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {currentPromotion.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {currentPromotion.description}
            </p>

            <Link
              to="/client/promotions"
              className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-2"
              onClick={() => setShow(false)}
            >
              Ver Todas as Promoções
            </Link>
          </div>
        </div>

        {currentPromotion.isSpecial && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Hoje!
          </div>
        )}
      </div>
    </div>
  );
}