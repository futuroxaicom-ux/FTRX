import React from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, Code, Users, Zap, Globe, Target, CheckCircle, Circle } from 'lucide-react';

export const Roadmap = () => {
  const { t } = useTranslation();

  const phases = [
    {
      phase: t('roadmap.phase1.phase'),
      title: t('roadmap.phase1.title'),
      status: 'completed',
      items: [
        { text: t('roadmap.phase1.item1'), done: true },
        { text: t('roadmap.phase1.item2'), done: true },
        { text: t('roadmap.phase1.item3'), done: true },
        { text: t('roadmap.phase1.item4'), done: true },
      ],
      icon: <Rocket className="w-6 h-6" />
    },
    {
      phase: t('roadmap.phase2.phase'),
      title: t('roadmap.phase2.title'),
      status: 'in-progress',
      items: [
        { text: t('roadmap.phase2.item1'), done: true },
        { text: t('roadmap.phase2.item2'), done: true },
        { text: t('roadmap.phase2.item3'), done: false },
        { text: t('roadmap.phase2.item4'), done: false },
      ],
      icon: <Users className="w-6 h-6" />
    },
    {
      phase: t('roadmap.phase3.phase'),
      title: t('roadmap.phase3.title'),
      status: 'upcoming',
      items: [
        { text: t('roadmap.phase3.item1'), done: false },
        { text: t('roadmap.phase3.item2'), done: false },
        { text: t('roadmap.phase3.item3'), done: false },
        { text: t('roadmap.phase3.item4'), done: false },
      ],
      icon: <Zap className="w-6 h-6" />
    },
    {
      phase: t('roadmap.phase4.phase'),
      title: t('roadmap.phase4.title'),
      status: 'upcoming',
      items: [
        { text: t('roadmap.phase4.item1'), done: false },
        { text: t('roadmap.phase4.item2'), done: false },
        { text: t('roadmap.phase4.item3'), done: false },
        { text: t('roadmap.phase4.item4'), done: false },
      ],
      icon: <Globe className="w-6 h-6" />
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-[#00FFD1] text-black';
      case 'in-progress':
        return 'bg-[rgba(0,255,209,0.2)] text-[#00FFD1] border border-[#00FFD1]';
      case 'upcoming':
        return 'bg-[rgba(255,255,255,0.1)] text-[#4D4D4D]';
      default:
        return 'bg-[rgba(255,255,255,0.1)] text-[#4D4D4D]';
    }
  };

  const getLineColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-[#00FFD1]';
      case 'in-progress':
        return 'bg-gradient-to-b from-[#00FFD1] to-[rgba(255,255,255,0.2)]';
      default:
        return 'bg-[rgba(255,255,255,0.2)]';
    }
  };

  return (
    <section id="roadmap" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#00FFD1] opacity-5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[#00FFD1] opacity-5 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] text-[#00FFD1] text-sm font-medium mb-4">
            <Target className="w-4 h-4" />
            {t('roadmap.badge')}
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">
            {t('roadmap.title')}
          </h2>
          <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
            {t('roadmap.description')}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line for desktop */}
          <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-0.5 bg-[rgba(255,255,255,0.1)]"></div>

          <div className="space-y-8 lg:space-y-0">
            {phases.map((phase, index) => (
              <div 
                key={index} 
                className={`relative lg:flex lg:items-start ${
                  index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                {/* Timeline dot and connector for desktop */}
                <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${getStatusColor(phase.status)}`}>
                    {phase.icon}
                  </div>
                  {index < phases.length - 1 && (
                    <div className={`w-0.5 h-32 ${getLineColor(phase.status)}`}></div>
                  )}
                </div>

                {/* Content card */}
                <div className={`lg:w-[calc(50%-3rem)] ${index % 2 === 0 ? 'lg:pr-12' : 'lg:pl-12'}`}>
                  <div className={`bg-[#121212] border p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,209,0.1)] ${
                    phase.status === 'completed' 
                      ? 'border-[#00FFD1]' 
                      : phase.status === 'in-progress'
                        ? 'border-[rgba(0,255,209,0.5)]'
                        : 'border-[rgba(255,255,255,0.1)]'
                  }`}>
                    {/* Mobile icon */}
                    <div className="lg:hidden flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(phase.status)}`}>
                        {phase.icon}
                      </div>
                      <div>
                        <span className={`text-xs font-semibold uppercase ${
                          phase.status === 'completed' ? 'text-[#00FFD1]' : 
                          phase.status === 'in-progress' ? 'text-[#00FFD1]' : 'text-[#4D4D4D]'
                        }`}>
                          {phase.phase}
                        </span>
                      </div>
                    </div>

                    {/* Desktop phase label */}
                    <div className="hidden lg:block mb-2">
                      <span className={`text-xs font-semibold uppercase ${
                        phase.status === 'completed' ? 'text-[#00FFD1]' : 
                        phase.status === 'in-progress' ? 'text-[#00FFD1]' : 'text-[#4D4D4D]'
                      }`}>
                        {phase.phase}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4">{phase.title}</h3>

                    <ul className="space-y-2.5">
                      {phase.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2.5">
                          {item.done ? (
                            <CheckCircle className="w-5 h-5 text-[#00FFD1] flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#4D4D4D] flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${item.done ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`}>
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Status badge */}
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        phase.status === 'completed' 
                          ? 'bg-[rgba(0,255,209,0.2)] text-[#00FFD1]' 
                          : phase.status === 'in-progress'
                            ? 'bg-[rgba(255,193,7,0.2)] text-yellow-400'
                            : 'bg-[rgba(255,255,255,0.1)] text-[#4D4D4D]'
                      }`}>
                        {phase.status === 'completed' && t('roadmap.statusCompleted')}
                        {phase.status === 'in-progress' && t('roadmap.statusInProgress')}
                        {phase.status === 'upcoming' && t('roadmap.statusUpcoming')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden lg:block lg:w-[calc(50%-3rem)]"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
