import React from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Lock } from 'lucide-react';

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
          className="transition-all duration-500 hover:opacity-80 cursor-pointer"
          style={{
            filter: `drop-shadow(0 0 10px ${item.color}40)`,
            transformOrigin: 'center',
          }}
        />
      );
    });
  };

  return (
    <section id="tokenomics" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FFD1] opacity-5 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#00FFD1] opacity-5 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-1 h-1 bg-[#00FFD1] rounded-full opacity-50 animate-float"></div>
        <div className="absolute top-40 right-40 w-2 h-2 bg-[#00FFD1] rounded-full opacity-30 animate-float" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-[#00FFD1] rounded-full opacity-40 animate-float" style={{animationDelay: '1s'}}></div>
      </div>
      
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] text-[#00FFD1] text-sm font-medium mb-4 animate-pulse">
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
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 group">
              {/* Animated glow ring */}
              <div className="absolute inset-[-20px] rounded-full border border-[rgba(0,255,209,0.2)] animate-pulse"></div>
              <div className="absolute inset-[-40px] rounded-full border border-[rgba(0,255,209,0.1)]" style={{animation: 'pulse 2s ease-in-out infinite', animationDelay: '0.5s'}}></div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-[#00FFD1] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500"></div>
              
              {/* SVG Pie Chart with rotation animation */}
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 transition-transform duration-700 group-hover:scale-105">
                {createPieChart()}
                {/* Animated center circle */}
                <circle cx="50" cy="50" r="25" fill="#000" stroke="rgba(0,255,209,0.3)" strokeWidth="0.5" className="animate-pulse" />
                {/* Inner decorative ring */}
                <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(0,255,209,0.1)" strokeWidth="0.3" strokeDasharray="2 2" className="animate-spin" style={{animationDuration: '20s'}} />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase">{t('tokenomics.totalSupply')}</p>
                <p className="text-lg sm:text-2xl font-bold text-[#00FFD1] animate-pulse">1B</p>
                <p className="text-xs text-[#4D4D4D]">FTRX</p>
              </div>
            </div>
          </div>

          {/* Distribution Details */}
          <div className="space-y-4 sm:space-y-6">
            {distribution.map((item, index) => (
              <div 
                key={index}
                className="bg-[#121212] border border-[rgba(255,255,255,0.1)] p-4 sm:p-6 hover:border-[rgba(0,255,209,0.3)] transition-all duration-300 hover:translate-x-2 hover:shadow-[0_0_30px_rgba(0,255,209,0.1)] group relative overflow-hidden"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(0,255,209,0.05)] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-sm animate-pulse"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-[#00FFD1] transition-colors">{item.name}</h3>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold transition-transform group-hover:scale-110" style={{ color: item.color }}>
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-sm text-[rgba(255,255,255,0.7)] mb-2 relative z-10">{item.description}</p>
                <p className="text-xs text-[#4D4D4D] relative z-10">
                  {item.amount} FTRX
                </p>
                {/* Animated Progress bar */}
                <div className="mt-3 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden relative z-10">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  >
                    {/* Shimmer on progress bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liquidity Locked Info */}
        <div className="mt-8 sm:mt-12 flex justify-center">
          <div className="bg-[#121212] border border-[rgba(0,255,209,0.3)] p-6 sm:p-8 text-center inline-flex items-center gap-4 animate-pulse-glow hover:scale-105 transition-transform duration-300 cursor-default relative overflow-hidden group">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,255,209,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-[#00FFD1] animate-bounce relative z-10" style={{animationDuration: '2s'}} />
            <div className="text-left relative z-10">
              <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase mb-1">{t('tokenomics.liquidity')}</p>
              <p className="text-xl sm:text-2xl font-bold text-[#00FFD1]">{t('tokenomics.locked')}</p>
              <p className="text-xs text-[rgba(255,255,255,0.6)]">Raydium DEX</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
