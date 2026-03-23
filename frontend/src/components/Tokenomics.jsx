import React from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Coins, Lock, TrendingUp, Clock } from 'lucide-react';

export const Tokenomics = () => {
  const { t } = useTranslation();

  const distribution = [
    {
      name: t('tokenomics.bondingCurve'),
      percentage: 70,
      amount: '700,000,000',
      color: '#00FFD1',
      description: t('tokenomics.bondingCurveDesc')
    },
    {
      name: t('tokenomics.poolMigration'),
      percentage: 10,
      amount: '100,000,000',
      color: '#00D4AA',
      description: t('tokenomics.poolMigrationDesc')
    },
    {
      name: t('tokenomics.vesting'),
      percentage: 20,
      amount: '200,000,000',
      color: '#00A080',
      description: t('tokenomics.vestingDesc')
    }
  ];

  // Calculate SVG pie chart
  const createPieChart = () => {
    let cumulativePercentage = 0;
    
    return distribution.map((item, index) => {
      const startAngle = cumulativePercentage * 3.6; // 360 / 100
      cumulativePercentage += item.percentage;
      const endAngle = cumulativePercentage * 3.6;
      
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);
      
      const largeArc = item.percentage > 50 ? 1 : 0;
      
      const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
      
      return (
        <path
          key={index}
          d={pathData}
          fill={item.color}
          stroke="#000"
          strokeWidth="0.5"
          className="transition-all duration-300 hover:opacity-80"
          style={{
            filter: `drop-shadow(0 0 10px ${item.color}40)`
          }}
        />
      );
    });
  };

  return (
    <section id="tokenomics" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-black">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] text-[#00FFD1] text-sm font-medium mb-4">
            <Coins className="w-4 h-4" />
            {t('tokenomics.badge')}
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">
            {t('tokenomics.title')}
          </h2>
          <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
            {t('tokenomics.description')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Pie Chart */}
          <div className="relative flex justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-[#00FFD1] opacity-10 blur-3xl"></div>
              
              {/* SVG Pie Chart */}
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {createPieChart()}
                {/* Center circle */}
                <circle cx="50" cy="50" r="25" fill="#000" stroke="rgba(0,255,209,0.3)" strokeWidth="0.5" />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase">{t('tokenomics.totalSupply')}</p>
                <p className="text-lg sm:text-2xl font-bold text-[#00FFD1]">1B</p>
                <p className="text-xs text-[#4D4D4D]">FTRX</p>
              </div>
            </div>
          </div>

          {/* Distribution Details */}
          <div className="space-y-4 sm:space-y-6">
            {distribution.map((item, index) => (
              <div 
                key={index}
                className="bg-[#121212] border border-[rgba(255,255,255,0.1)] p-4 sm:p-6 hover:border-[rgba(0,255,209,0.3)] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">{item.name}</h3>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold" style={{ color: item.color }}>
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-sm text-[rgba(255,255,255,0.7)] mb-2">{item.description}</p>
                <p className="text-xs text-[#4D4D4D]">
                  {item.amount} FTRX
                </p>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vesting Info */}
        <div className="mt-8 sm:mt-12 grid sm:grid-cols-3 gap-4">
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.1)] p-4 sm:p-6 text-center">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-[#00FFD1] mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase mb-1">{t('tokenomics.vestingDuration')}</p>
            <p className="text-xl sm:text-2xl font-bold text-white">2 {t('tokenomics.days')}</p>
          </div>
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.1)] p-4 sm:p-6 text-center">
            <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-[#00FFD1] mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase mb-1">{t('tokenomics.cliff')}</p>
            <p className="text-xl sm:text-2xl font-bold text-white">0 {t('tokenomics.days')}</p>
          </div>
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.1)] p-4 sm:p-6 text-center">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-[#00FFD1] mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase mb-1">{t('tokenomics.liquidity')}</p>
            <p className="text-xl sm:text-2xl font-bold text-[#00FFD1]">{t('tokenomics.locked')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
