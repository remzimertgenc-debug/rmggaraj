import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PriceHistoryPoint } from '../types/pc';

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  productName: string;
  conditionLabel?: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  data,
  productName,
  conditionLabel,
}) => {
  const formatYAxis = (tickItem: number) =>
    `${new Intl.NumberFormat('tr-TR').format(tickItem)} ₺`;

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <h3 className="font-display text-lg font-bold text-[#F5F7FA]">
          {productName} — Fiyat Geçmişi
          {conditionLabel ? ` (${conditionLabel})` : ''}
        </h3>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Bu ürün için veritabanında henüz kaydedilmiş fiyat geçmişi bulunmuyor. Mağaza fiyat
          senkronizasyonu yapıldıkça fiyat değişim grafiği otomatik oluşur.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-[#F5F7FA]">
          {productName} — Son 30 Günlük Fiyat Değişimi
          {conditionLabel ? ` (${conditionLabel})` : ''}
        </h3>
        <span className="font-mono text-xs text-[#94A3B8]">
          {data.length} fiyat kaydı
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
            <YAxis
              stroke="#94A3B8"
              fontSize={12}
              tickFormatter={formatYAxis}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(value) => {
                const numeric = Number(value ?? 0);
                return [
                  `${new Intl.NumberFormat('tr-TR').format(numeric)} ₺`,
                  'Fiyat',
                ];
              }}
              contentStyle={{
                backgroundColor: '#080B12',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#F5F7FA',
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#246BFD"
              strokeWidth={3}
              dot={{ r: 4, fill: '#FF7900', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#FF7900' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
