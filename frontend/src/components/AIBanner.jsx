import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Network, Cpu, Bot, Sparkles, Zap, Shield, Database, Cloud, LineChart, MessageSquare, Settings } from 'lucide-react';

// Floating AI Icon component with animation
const FloatingIcon = ({ Icon, delay = 0, duration = 4, x = 0, y = 0 }) => (
  <div 
    className="absolute opacity-20 text-[#00FFD1]"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animation: `float${Math.random() > 0.5 ? 'A' : 'B'} ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`
    }}
  >
    <Icon className="w-8 h-8 md:w-12 md:h-12" />
  </div>
);

// Neural Network Animation
const NeuralNetwork = () => {
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    x: 10 + (i % 4) * 25,
    y: 20 + Math.floor(i / 4) * 30,
    delay: i * 0.2
  }));

  return (
    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Connection lines with animated dash */}
      {nodes.map((node, i) => 
        nodes.slice(i + 1).map((target, j) => (
          <line
            key={`${i}-${j}`}
            x1={node.x}
            y1={node.y}
            x2={target.x}
            y2={target.y}
            stroke="#00FFD1"
            strokeWidth="0.2"
            strokeDasharray="2,2"
            className="animate-pulse"
            style={{ animationDelay: `${node.delay}s` }}
          />
        ))
      )}
      {/* Nodes */}
      {nodes.map((node, i) => (
        <g key={i}>
          <circle
            cx={node.x}
            cy={node.y}
            r="1.5"
            fill="#00FFD1"
            className="animate-pulse"
            style={{ animationDelay: `${node.delay}s` }}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r="3"
            fill="transparent"
            stroke="#00FFD1"
            strokeWidth="0.3"
            className="animate-ping"
            style={{ animationDelay: `${node.delay}s`, animationDuration: '2s' }}
          />
        </g>
      ))}
    </svg>
  );
};

// Data Flow Animation
const DataFlow = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-30">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[2px] bg-gradient-to-r from-transparent via-[#00FFD1] to-transparent"
          style={{
            width: `${80 + Math.random() * 100}px`,
            top: `${15 + i * 15}%`,
            left: '-100px',
            animation: `dataFlow ${3 + Math.random() * 2}s linear infinite`,
            animationDelay: `${i * 0.5}s`
          }}
        />
      ))}
    </div>
  );
};

// Circuit Pattern
const CircuitPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
    {/* Horizontal lines */}
    <path d="M0,30 H40 V50 H100" stroke="#00FFD1" fill="none" strokeWidth="0.3" />
    <path d="M0,70 H30 V40 H70 V70 H100" stroke="#00FFD1" fill="none" strokeWidth="0.3" />
    {/* Dots at intersections */}
    <circle cx="40" cy="30" r="1" fill="#00FFD1" className="animate-pulse" />
    <circle cx="40" cy="50" r="1" fill="#00FFD1" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
    <circle cx="30" cy="70" r="1" fill="#00FFD1" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <circle cx="30" cy="40" r="1" fill="#00FFD1" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
    <circle cx="70" cy="40" r="1" fill="#00FFD1" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
    <circle cx="70" cy="70" r="1" fill="#00FFD1" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
  </svg>
);

// Banner Variant 1: AI Brain Network
export const AIBannerBrain = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative py-16 overflow-hidden bg-gradient-to-r from-black via-[#0a0a0a] to-black border-y border-[rgba(0,255,209,0.2)]">
      <NeuralNetwork />
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-[7.6923%] flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] flex items-center justify-center">
              <Brain className="w-10 h-10 text-[#00FFD1] animate-pulse" />
            </div>
            <div className="absolute -inset-2 border border-[rgba(0,255,209,0.2)] animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">{t('banners.neuralNetworks.title')}</h3>
            <p className="text-sm text-[rgba(255,255,255,0.7)] max-w-md">{t('banners.neuralNetworks.description')}</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          {[Network, Cpu, Database].map((Icon, i) => (
            <div 
              key={i}
              className="w-12 h-12 bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] flex items-center justify-center"
              style={{ animation: `pulse 2s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
            >
              <Icon className="w-6 h-6 text-[#00FFD1]" />
            </div>
          ))}
        </div>
      </div>
      
      <FloatingIcon Icon={Sparkles} x={5} y={10} delay={0} />
      <FloatingIcon Icon={Zap} x={85} y={70} delay={1} />
    </div>
  );
};

// Banner Variant 2: AI Automation
export const AIBannerAutomation = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative py-16 overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-black to-[#0a0a0a] border-y border-[rgba(0,255,209,0.2)]">
      <CircuitPattern />
      <DataFlow />
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-[7.6923%]">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
          {/* Animated robot/bot icon */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-[rgba(0,255,209,0.2)] to-[rgba(0,255,209,0.05)] border border-[#00FFD1] flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
              <Bot className="w-14 h-14 text-[#00FFD1]" />
            </div>
            {/* Orbiting elements */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#00FFD1] rounded-full" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#00FFD1] rounded-full opacity-50" />
            </div>
          </div>
          
          <div className="max-w-lg">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{t('banners.automation.title')}</h3>
            <p className="text-sm text-[rgba(255,255,255,0.7)]">{t('banners.automation.description')}</p>
          </div>
          
          {/* Stats indicators */}
          <div className="hidden lg:flex gap-6">
            {[
              { value: '99.9%', label: t('banners.automation.uptime') },
              { value: '24/7', label: t('banners.automation.available') },
              { value: '10x', label: t('banners.automation.faster') }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="text-center px-4 py-2 bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)]"
                style={{ animation: `fadeIn 0.5s ease-out ${i * 0.2}s backwards` }}
              >
                <div className="text-2xl font-bold text-[#00FFD1]">{stat.value}</div>
                <div className="text-xs text-[rgba(255,255,255,0.6)] uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Banner Variant 3: AI Analytics
export const AIBannerAnalytics = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative py-16 overflow-hidden bg-gradient-to-l from-black via-[#0a0a0a] to-black border-y border-[rgba(0,255,209,0.2)]">
      {/* Animated chart bars background */}
      <div className="absolute inset-0 flex items-end justify-center gap-2 opacity-10 px-4">
        {[40, 60, 35, 80, 55, 70, 45, 90, 65, 50, 75, 85].map((height, i) => (
          <div
            key={i}
            className="w-4 md:w-8 bg-[#00FFD1]"
            style={{
              height: `${height}%`,
              animation: `chartGrow 2s ease-out ${i * 0.1}s backwards, pulse 3s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-[7.6923%]">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] flex items-center justify-center">
                <LineChart className="w-8 h-8 text-[#00FFD1]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white">{t('banners.analytics.title')}</h3>
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.7)] max-w-lg">{t('banners.analytics.description')}</p>
          </div>
          
          {/* Mini analytics indicators */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, label: t('banners.analytics.secure') },
              { icon: Cloud, label: t('banners.analytics.cloud') },
              { icon: Settings, label: t('banners.analytics.customizable') },
              { icon: MessageSquare, label: t('banners.analytics.insights') }
            ].map((item, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)]"
              >
                <item.icon className="w-4 h-4 text-[#00FFD1]" />
                <span className="text-xs text-white">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS Animations (to be added to global styles)
export const bannerStyles = `
  @keyframes floatA {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-20px) rotate(5deg);
    }
  }
  
  @keyframes floatB {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-15px) rotate(-5deg);
    }
  }
  
  @keyframes dataFlow {
    0% {
      left: -100px;
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      left: 100%;
      opacity: 0;
    }
  }
  
  @keyframes chartGrow {
    0% {
      transform: scaleY(0);
      transform-origin: bottom;
    }
    100% {
      transform: scaleY(1);
      transform-origin: bottom;
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default { AIBannerBrain, AIBannerAutomation, AIBannerAnalytics };
