import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, User, Bot, Globe, FileText, Headphones, Brain, TrendingDown, ChevronRight, Mail, Sparkles, Briefcase, Calculator, Users, Rocket, CheckCircle2 } from 'lucide-react';

export const AIServices = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('business');

  const businessCases = [
    {
      icon: <Headphones className="w-5 h-5" />,
      title: t('aiOffer.biz1Title'),
      desc: t('aiOffer.biz1Desc'),
      saving: t('aiOffer.biz1Saving'),
      color: '#00FFD1',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: t('aiOffer.biz2Title'),
      desc: t('aiOffer.biz2Desc'),
      saving: t('aiOffer.biz2Saving'),
      color: '#00CCFF',
    },
    {
      icon: <Calculator className="w-5 h-5" />,
      title: t('aiOffer.biz3Title'),
      desc: t('aiOffer.biz3Desc'),
      saving: t('aiOffer.biz3Saving'),
      color: '#7B61FF',
    },
    {
      icon: <TrendingDown className="w-5 h-5" />,
      title: t('aiOffer.biz4Title'),
      desc: t('aiOffer.biz4Desc'),
      saving: t('aiOffer.biz4Saving'),
      color: '#FF3366',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: t('aiOffer.biz5Title'),
      desc: t('aiOffer.biz5Desc'),
      saving: t('aiOffer.biz5Saving'),
      color: '#FFB800',
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: t('aiOffer.biz6Title'),
      desc: t('aiOffer.biz6Desc'),
      saving: t('aiOffer.biz6Saving'),
      color: '#22C55E',
    },
  ];

  const packages = [
    {
      id: 'starter',
      name: t('aiOffer.starterName'),
      price: '$299',
      period: t('aiOffer.perMonth'),
      target: t('aiOffer.starterTarget'),
      color: '#00FFD1',
      features: [
        t('aiOffer.starterF1'), t('aiOffer.starterF2'), t('aiOffer.starterF3'),
        t('aiOffer.starterF4'), t('aiOffer.starterF5'),
      ],
    },
    {
      id: 'business',
      name: t('aiOffer.businessName'),
      price: '$799',
      period: t('aiOffer.perMonth'),
      target: t('aiOffer.businessTarget'),
      color: '#7B61FF',
      popular: true,
      features: [
        t('aiOffer.businessF1'), t('aiOffer.businessF2'), t('aiOffer.businessF3'),
        t('aiOffer.businessF4'), t('aiOffer.businessF5'), t('aiOffer.businessF6'),
      ],
    },
    {
      id: 'enterprise',
      name: t('aiOffer.enterpriseName'),
      price: '$1,999',
      period: t('aiOffer.perMonth'),
      target: t('aiOffer.enterpriseTarget'),
      color: '#FFB800',
      features: [
        t('aiOffer.enterpriseF1'), t('aiOffer.enterpriseF2'), t('aiOffer.enterpriseF3'),
        t('aiOffer.enterpriseF4'), t('aiOffer.enterpriseF5'), t('aiOffer.enterpriseF6'),
      ],
    },
    {
      id: 'agents',
      name: t('aiOffer.agentsName'),
      price: '$499',
      period: t('aiOffer.perAgent'),
      target: t('aiOffer.agentsTarget'),
      color: '#FF3366',
      features: [
        t('aiOffer.agentsF1'), t('aiOffer.agentsF2'), t('aiOffer.agentsF3'),
        t('aiOffer.agentsF4'), t('aiOffer.agentsF5'),
      ],
    },
  ];

  return (
    <section id="ai-services" className="py-16 sm:py-24 px-4 sm:px-[7.6923%] relative overflow-hidden bg-[#0a0a0a]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-[#7B61FF] opacity-[0.02] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FFD1] opacity-[0.02] blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-20 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(123,97,255,0.08)] border border-[rgba(123,97,255,0.2)] text-[#7B61FF] text-xs sm:text-sm font-medium rounded-full">
            <Brain className="w-4 h-4" />
            {t('aiOffer.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {t('aiOffer.title1')}<br />
            <span className="bg-gradient-to-r from-[#7B61FF] via-[#00CCFF] to-[#00FFD1] bg-clip-text text-transparent">{t('aiOffer.title2')}</span>
          </h2>
          <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.6)] max-w-3xl mx-auto leading-relaxed">
            {t('aiOffer.subtitle')}
          </p>
        </div>

        {/* Tab Switch */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <div className="inline-flex bg-black/50 border border-[rgba(255,255,255,0.08)] rounded-full p-1">
            <button onClick={() => setActiveTab('business')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === 'business' ? 'bg-[#7B61FF] text-white shadow-lg shadow-[#7B61FF]/20' : 'text-[#888] hover:text-white'}`}>
              <Building2 className="w-4 h-4" /> {t('aiOffer.tabBusiness')}
            </button>
            <button onClick={() => setActiveTab('individual')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === 'individual' ? 'bg-[#00FFD1] text-black shadow-lg shadow-[#00FFD1]/20' : 'text-[#888] hover:text-white'}`}>
              <User className="w-4 h-4" /> {t('aiOffer.tabIndividual')}
            </button>
          </div>
        </div>

        {/* Cost Reduction Examples */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-8">
            {activeTab === 'business' ? t('aiOffer.costTitle') : t('aiOffer.individualTitle')}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeTab === 'business' ? businessCases : [
              { icon: <Globe className="w-5 h-5" />, title: t('aiOffer.ind1Title'), desc: t('aiOffer.ind1Desc'), saving: t('aiOffer.ind1Saving'), color: '#00FFD1' },
              { icon: <Bot className="w-5 h-5" />, title: t('aiOffer.ind2Title'), desc: t('aiOffer.ind2Desc'), saving: t('aiOffer.ind2Saving'), color: '#7B61FF' },
              { icon: <FileText className="w-5 h-5" />, title: t('aiOffer.ind3Title'), desc: t('aiOffer.ind3Desc'), saving: t('aiOffer.ind3Saving'), color: '#00CCFF' },
              { icon: <Sparkles className="w-5 h-5" />, title: t('aiOffer.ind4Title'), desc: t('aiOffer.ind4Desc'), saving: t('aiOffer.ind4Saving'), color: '#FF3366' },
              { icon: <Briefcase className="w-5 h-5" />, title: t('aiOffer.ind5Title'), desc: t('aiOffer.ind5Desc'), saving: t('aiOffer.ind5Saving'), color: '#FFB800' },
              { icon: <Rocket className="w-5 h-5" />, title: t('aiOffer.ind6Title'), desc: t('aiOffer.ind6Desc'), saving: t('aiOffer.ind6Saving'), color: '#22C55E' },
            ]).map((c, i) => (
              <div key={i} className="p-4 sm:p-5 bg-black/40 border border-[rgba(255,255,255,0.06)] rounded-xl group hover:border-opacity-30 transition-all duration-300"
                style={{ '--hover-color': c.color }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${c.color}40`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}15`, color: c.color }}>
                    {c.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{c.title}</h4>
                    <p className="text-xs text-[#888] leading-relaxed">{c.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <TrendingDown className="w-4 h-4" style={{ color: c.color }} />
                  <span className="text-xs font-bold" style={{ color: c.color }}>{c.saving}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Packages */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-3">{t('aiOffer.packagesTitle')}</h3>
          <p className="text-sm text-[#888] text-center mb-8 max-w-2xl mx-auto">{t('aiOffer.packagesSubtitle')}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {packages.map((pkg) => (
              <Card key={pkg.id} data-testid={`ai-package-${pkg.id}`}
                className={`relative bg-black border transition-all duration-500 overflow-hidden group ${pkg.popular ? 'scale-[1.03] z-10' : 'hover:scale-[1.02]'}`}
                style={{ borderColor: `${pkg.color}25` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${pkg.color}60`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${pkg.color}25`}>
                {/* Animated glow border */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ boxShadow: `inset 0 0 30px ${pkg.color}15, 0 0 40px ${pkg.color}10` }}></div>
                {/* Moving shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                {/* Top glow bar */}
                {pkg.popular ? (
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${pkg.color}, transparent)`, boxShadow: `0 0 20px ${pkg.color}60, 0 0 40px ${pkg.color}30` }}></div>
                ) : (
                  <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${pkg.color}80, transparent)`, boxShadow: `0 0 15px ${pkg.color}40` }}></div>
                )}
                {/* Background orb glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[60px]" style={{ background: pkg.color }}></div>
                <CardContent className="p-5 sm:p-6 space-y-4 relative z-10">
                  <div>
                    <h4 className="text-lg font-bold text-white">{pkg.name}</h4>
                    <p className="text-xs text-[#666] mt-0.5">{pkg.target}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black transition-all duration-500 group-hover:drop-shadow-[0_0_12px_var(--glow)]" style={{ color: pkg.color, '--glow': `${pkg.color}80` }}>{pkg.price}</span>
                    <span className="text-xs text-[#666]">{pkg.period}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[#ccc]">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: pkg.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full h-11 font-bold text-sm transition-all duration-300 group-hover:shadow-lg"
                    style={{ background: `${pkg.color}15`, color: pkg.color, border: `1px solid ${pkg.color}30`, boxShadow: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${pkg.color}25`; e.currentTarget.style.boxShadow = `0 0 25px ${pkg.color}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${pkg.color}15`; e.currentTarget.style.boxShadow = 'none'; }}>
                    {t('aiOffer.buyFtrx')} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Company / No Employees Section */}
        <div className="p-6 sm:p-10 bg-black border border-[rgba(123,97,255,0.15)] rounded-2xl relative overflow-hidden group hover:border-[#7B61FF]/40 transition-all duration-500 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B61FF]/5 via-transparent to-[#00FFD1]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7B61FF]/10 border border-[#7B61FF]/20 rounded-full">
                <Rocket className="w-4 h-4 text-[#7B61FF]" />
                <span className="text-xs font-bold text-[#7B61FF]">{t('aiOffer.companyBadge')}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">{t('aiOffer.companyTitle')}</h3>
              <p className="text-sm text-[#999] leading-relaxed">{t('aiOffer.companyDesc')}</p>
            </div>
            <div className="space-y-3">
              {[
                { text: t('aiOffer.companyF1'), color: '#00FFD1' },
                { text: t('aiOffer.companyF2'), color: '#7B61FF' },
                { text: t('aiOffer.companyF3'), color: '#00CCFF' },
                { text: t('aiOffer.companyF4'), color: '#FFB800' },
                { text: t('aiOffer.companyF5'), color: '#FF3366' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-lg">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: f.color }} />
                  <span className="text-sm text-[#ccc]">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center">
          <a href="mailto:support@futuroxai.com" className="inline-flex items-center gap-3 px-6 py-4 bg-[#7B61FF]/10 border border-[#7B61FF]/20 rounded-xl hover:bg-[#7B61FF]/15 transition-all group">
            <Mail className="w-5 h-5 text-[#7B61FF]" />
            <div className="text-left">
              <p className="text-sm font-bold text-[#7B61FF]">{t('aiOffer.contactTitle')}</p>
              <p className="text-xs text-[#999]">support@futuroxai.com</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7B61FF] group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};
