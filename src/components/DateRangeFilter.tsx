import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  dateRange: string;
  setDateRange: (range: string) => void;
  customStartDate: Date;
  setCustomStartDate: (date: Date) => void;
  customEndDate: Date;
  setCustomEndDate: (date: Date) => void;
  onGeneratePDF?: () => void;
  onDateChange: () => void;
}

export default function DateRangeFilter({
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onGeneratePDF,
  onDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 bg-white rounded-lg shadow p-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        <select
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value);
            onDateChange();
          }}
          className="border-0 bg-transparent text-sm text-gray-600 focus:ring-0"
        >
          <option value="today">Hoje</option>
          <option value="yesterday">Ontem</option>
          <option value="last7days">Últimos 7 dias</option>
          <option value="last30days">Últimos 30 dias</option>
          <option value="thisMonth">Este mês</option>
          <option value="lastMonth">Mês passado</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {dateRange === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStartDate.toISOString().split('T')[0]}
            onChange={(e) => {
              setCustomStartDate(new Date(e.target.value));
              onDateChange();
            }}
            className="text-sm border rounded-lg px-3 py-2"
          />
          <span className="text-gray-500">até</span>
          <input
            type="date"
            value={customEndDate.toISOString().split('T')[0]}
            onChange={(e) => {
              setCustomEndDate(new Date(e.target.value));
              onDateChange();
            }}
            className="text-sm border rounded-lg px-3 py-2"
          />
        </div>
      )}

      {onGeneratePDF && (
        <button
          onClick={onGeneratePDF}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
        >
          Gerar PDF
        </button>
      )}
    </div>
  );
}