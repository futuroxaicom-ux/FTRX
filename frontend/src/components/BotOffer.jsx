import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TrendingUp, Crosshair, Repeat, ArrowLeftRight, Users, Shield, BarChart3, Wallet, Star, Zap, ChevronRight, Mail, Activity } from 'lucide-react';

export const BotOffer = () => {
  const { t } = useTranslation();

  const bots = [
    {
      id: 'spread',
      nameKey: 'spreadName', tagKey: 'spreadTag', profitKey: 'spreadProfit', descKey: 'spreadDesc',
      profitLabelKey: 'avgProfit',
      f: ['spreadF1', 'spreadF2', 'spreadF3', 'spreadF4'],
      icon: <ArrowLeftRight className="w-6 h-6" />, price: '$99 USD',
      color: '#00FFD1', popular: false,
    },
    {
      id: 'sniper',
      nameKey: 'sniperName', tagKey: 'sniperTag', profitKey: 'sniperProfit', descKey: 'sniperDesc',
      profitLabelKey: 'generatedProfit',
      f: ['sniperF1', 'sniperF2', 'sniperF3', 'sniperF4'],
      icon: <Crosshair className="w-6 h-6" />, price: '$199 USD',
      color: '#FF3366', popular: true,
    },
    {
      id: 'trade',
      nameKey: 'tradeName', tagKey: 'tradeTag', profitKey: 'tradeProfit', descKey: 'tradeDesc',
      profitLabelKey: 'generatedProfit',
      f: ['tradeF1', 'tradeF2', 'tradeF3', 'tradeF4'],
      icon: <TrendingUp className="w-6 h-6" />, price: '$199 USD',
      color: '#7B61FF', popular: false,
    },
    {
      id: 'arbitrage',
      nameKey: 'arbitrageName', tagKey: 'arbitrageTag', profitKey: 'arbitrageProfit', descKey: 'arbitrageDesc',
      profitLabelKey: 'generatedProfit',
      f: ['arbitrageF1', 'arbitrageF2', 'arbitrageF3', 'arbitrageF4'],
      icon: <Repeat className="w-6 h-6" />, price: '$99 USD',
      color: '#00CCFF', popular: false,
    },
    {
      id: 'trend',
      nameKey: 'trendName', tagKey: 'trendTag', profitKey: 'trendProfit', descKey: 'trendDesc',
      profitLabelKey: 'avgProfit',
      f: ['trendF1', 'trendF2', 'trendF3', 'trendF4'],
      icon: <Activity className="w-6 h-6" />, price: '$99 USD',
      color: '#22C55E', popular: false,
    },
    {
      id: 'copytrade',
      nameKey: 'copytradeName', tagKey: 'copytradeTag', profitKey: 'copytradeProfit', descKey: 'copytradeDesc',
      profitLabelKey: 'avgProfit',
      f: ['copytradeF1', 'copytradeF2', 'copytradeF3', 'copytradeF4'],
      icon: <Users className="w-6 h-6" />, price: '$99 USD',
      color: '#FFB800', popular: false, hasPremium: true,
    },
  ];

  return (
    <section id="bots" className="py-16 sm:py-24 px-4 sm:px-[7.6923%] relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00FFD1] opacity-[0.03] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7B61FF] opacity-[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #00FFD1 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-20 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(0,255,209,0.08)] border border-[rgba(0,255,209,0.2)] text-[#00FFD1] text-xs sm:text-sm font-medium rounded-full">
            <Zap className="w-4 h-4" />
            {t('botOffer.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {t('botOffer.title1')}<br />
            <span className="bg-gradient-to-r from-[#00FFD1] via-[#00CCFF] to-[#7B61FF] bg-clip-text text-transparent">{t('botOffer.title2')}</span>
          </h2>
          <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.6)] max-w-3xl mx-auto leading-relaxed">
            {t('botOffer.subtitle')}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-12 sm:mb-16">
          {[
            { icon: <Shield className="w-5 h-5" />, label: t('botOffer.trustNonCustodial'), desc: t('botOffer.trustNonCustodialDesc') },
            { icon: <Wallet className="w-5 h-5" />, label: t('botOffer.trustAutoPayout'), desc: t('botOffer.trustAutoPayoutDesc') },
            { icon: <BarChart3 className="w-5 h-5" />, label: t('botOffer.trustPanel'), desc: t('botOffer.trustPanelDesc') },
            { icon: <Star className="w-5 h-5" />, label: t('botOffer.trustFtrx'), desc: t('botOffer.trustFtrxDesc') },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg group hover:border-[#00FFD1]/30 transition-all duration-300">
              <div className="text-[#00FFD1] group-hover:scale-110 transition-transform">{badge.icon}</div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white">{badge.label}</p>
                <p className="text-[10px] sm:text-xs text-[#666]">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bot Cards - 3x2 grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {bots.map((bot) => (
            <Card
              key={bot.id}
              data-testid={`bot-offer-${bot.id}`}
              className={`relative bg-[#0a0a0a] border-[${bot.color}]/30 hover:border-[${bot.color}]/70 transition-all duration-500 overflow-hidden group ${bot.popular ? 'md:scale-[1.03] shadow-[0_0_40px_rgba(255,51,102,0.15)]' : ''}`}
              style={{ borderColor: `${bot.color}30` }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${bot.color}70`}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${bot.color}30`}
            >
              {bot.popular && (
                <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: bot.color, color: '#000' }}>
                  {t('botOffer.mostPopular')}
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(to bottom, ${bot.color}12, transparent)` }}></div>

              <CardContent className="p-5 sm:p-6 relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: `${bot.color}15`, color: bot.color }}>
                      {bot.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{t(`botOffer.${bot.nameKey}`)}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${bot.color}20`, color: bot.color }}>
                        {t(`botOffer.${bot.tagKey}`)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: `${bot.color}08`, border: `1px solid ${bot.color}15` }}>
                  <p className="text-2xl sm:text-3xl font-black" style={{ color: bot.color }}>{t(`botOffer.${bot.profitKey}`)}</p>
                  <p className="text-xs text-[#888] mt-0.5">{t(`botOffer.${bot.profitLabelKey}`)}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{bot.price}</span>
                  <span className="text-xs text-[#666]">{t('botOffer.monthly')}</span>
                </div>

                <p className="text-xs sm:text-sm text-[#999] leading-relaxed">{t(`botOffer.${bot.descKey}`)}</p>

                <ul className="space-y-2">
                  {bot.f.map((fKey, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs sm:text-sm text-[#ccc]">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: bot.color }}></div>
                      {t(`botOffer.${fKey}`)}
                    </li>
                  ))}
                </ul>

                {bot.hasPremium && (
                  <div className="mt-3 p-3 rounded-lg border border-[#FFB800]/20 bg-[#FFB800]/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-[#FFB800]" />
                      <span className="text-sm font-bold text-[#FFB800]">{t('botOffer.copytradePremium')}</span>
                    </div>
                    <p className="text-xs text-[#999] mb-2">{t('botOffer.copytradePremiumDesc')}</p>
                    <p className="text-lg font-bold text-[#FFB800]">{t('botOffer.copytradePremiumPrice')}</p>
                  </div>
                )}

                <Button className="w-full h-11 font-bold text-sm transition-all duration-300 group-hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${bot.color}, ${bot.color}99)`, color: '#000', boxShadow: `0 0 20px ${bot.color}30` }}>
                  {t('botOffer.buyFtrx')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mb-8 sm:mb-12 mt-6 px-4 sm:px-8 py-4 border border-[rgba(255,255,255,0.04)] rounded-lg bg-[rgba(255,255,255,0.01)]">
          <p className="text-[10px] sm:text-xs text-[#555] leading-relaxed text-center italic">
            {t('botOffer.disclaimer')}
          </p>
        </div>

        {/* Bottom: Panel + Exclusive */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-6 sm:p-8 bg-[#0a0a0a] border border-[rgba(0,255,209,0.15)] rounded-xl relative overflow-hidden group hover:border-[#00FFD1]/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00FFD1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#00FFD1]/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-[#00FFD1]" />
                </div>
                <h3 className="text-xl font-bold text-white">{t('botOffer.panelTitle')}</h3>
              </div>
              <p className="text-sm text-[#999] leading-relaxed">{t('botOffer.panelDesc')}</p>
              <ul className="space-y-2">
                {['panelF1', 'panelF2', 'panelF3', 'panelF4'].map((fKey, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#ccc]">
                    <div className="w-1.5 h-1.5 bg-[#00FFD1] rounded-full"></div> {t(`botOffer.${fKey}`)}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 p-3 bg-[#00FFD1]/5 border border-[#00FFD1]/10 rounded-lg">
                <Shield className="w-5 h-5 text-[#00FFD1] flex-shrink-0" />
                <p className="text-xs text-[#00FFD1] font-medium">{t('botOffer.panelNonCustodial')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-[#0a0a0a] border border-[rgba(255,184,0,0.15)] rounded-xl relative overflow-hidden group hover:border-[#FFB800]/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFB800]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-[#FFB800]" />
                </div>
                <h3 className="text-xl font-bold text-white">{t('botOffer.exclusiveTitle')}</h3>
              </div>
              <p className="text-sm text-[#999] leading-relaxed">{t('botOffer.exclusiveDesc')}</p>
              <ul className="space-y-2">
                {['exclusiveF1', 'exclusiveF2', 'exclusiveF3', 'exclusiveF4'].map((fKey, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#ccc]">
                    <div className="w-1.5 h-1.5 bg-[#FFB800] rounded-full"></div> {t(`botOffer.${fKey}`)}
                  </li>
                ))}
              </ul>
              <a href="mailto:support@futuroxai.com" className="flex items-center gap-3 p-4 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-lg hover:bg-[#FFB800]/15 transition-colors group/mail">
                <Mail className="w-5 h-5 text-[#FFB800]" />
                <div>
                  <p className="text-sm font-bold text-[#FFB800]">{t('botOffer.exclusiveContact')}</p>
                  <p className="text-xs text-[#999]">{t('botOffer.exclusiveEmail')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#FFB800] ml-auto group-hover/mail:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
