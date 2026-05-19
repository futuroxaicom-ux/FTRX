import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowRight, Zap, Sparkles, Globe, Clock, Cpu, TrendingUp, Copy, Check } from 'lucide-react';
import Spline from '@splinetool/react-spline';
import { WalletConnect } from '../components/WalletConnect';
import { TokenPurchase } from '../components/TokenPurchase';
import { trackVisit } from '../utils/analytics';
import { BuyOptions } from '../components/BuyOptions';
import { LivePriceChart } from '../components/LivePriceChart';
import { SolanaInfoModal } from '../components/SolanaInfoModal';
import { ChatBot } from '../components/ChatBot';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIBannerBrain, AIBannerAutomation, AIBannerAnalytics } from '../components/AIBanner';
import { Tokenomics } from '../components/Tokenomics';
import { Whitelist } from '../components/Whitelist';
import { Roadmap } from '../components/Roadmap';
import { BotOffer } from '../components/BotOffer';
import { AIServices } from '../components/AIServicesOffer';

class SplineSafe extends React.Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.err) return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#00FFD1]/20 to-[#00FFD1]/5 border border-[#00FFD1]/20 flex items-center justify-center">
          <span className="text-5xl font-bold text-[#00FFD1] tracking-widest">FTRX</span>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const FTRX_CA = 'CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx';

const ContractAddressBadge = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(FTRX_CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const short = `${FTRX_CA.slice(0, 8)}...${FTRX_CA.slice(-8)}`;
  return (
    <div className="w-full max-w-xl">
      <p className="text-[10px] sm:text-xs text-[#4D4D4D] uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FFD1] animate-pulse"></span>
        Smart Contract (CA)
      </p>
      <div
        onClick={copy}
        className="flex items-center gap-3 bg-[rgba(0,255,209,0.06)] border border-[rgba(0,255,209,0.35)] rounded-lg px-4 py-3 cursor-pointer hover:bg-[rgba(0,255,209,0.12)] hover:border-[rgba(0,255,209,0.6)] transition-all group w-full"
        title="Kliknij aby skopiować"
      >
        <span className="font-mono text-[#00FFD1] text-[11px] sm:text-sm select-all flex-1 hidden sm:block tracking-wide">{FTRX_CA}</span>
        <span className="font-mono text-[#00FFD1] text-xs select-all flex-1 sm:hidden">{short}</span>
        <span className="flex-shrink-0 flex items-center gap-1.5">
          {copied
            ? <><Check className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400 hidden sm:inline">Skopiowano!</span></>
            : <><Copy className="w-4 h-4 text-[#00FFD1] group-hover:scale-110 transition-transform" /><span className="text-xs text-[#4D4D4D] hidden sm:inline">Kopiuj</span></>
          }
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <a href={`https://solscan.io/token/${FTRX_CA}`} target="_blank" rel="noreferrer"
          className="text-[10px] text-[#4D4D4D] hover:text-[#00FFD1] transition-colors">
          Solscan ↗
        </a>
        <span className="text-[#333] text-[10px]">•</span>
        <a href={`https://app.dexlab.space/token-hub/${FTRX_CA}?tab=trade`} target="_blank" rel="noreferrer"
          className="text-[10px] text-[#4D4D4D] hover:text-[#00FFD1] transition-colors">
          DexLab ↗
        </a>
        <span className="text-[#333] text-[10px]">•</span>
        <a href={`https://www.geckoterminal.com/solana/pools/HvaXgLZP28ATMMmqNAyL2MM3ob3HC7XyCJZcrqH7dkyC`} target="_blank" rel="noreferrer"
          className="text-[10px] text-[#4D4D4D] hover:text-[#00FFD1] transition-colors">
          GeckoTerminal ↗
        </a>
      </div>
    </div>
  );
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const isPl = i18n.language === 'pl';
  const { connected } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDirectPurchase, setShowDirectPurchase] = useState(false);
  const [showSolanaModal, setShowSolanaModal] = useState(false);

  const LAUNCH_DATE = new Date('2026-06-01T00:00:00');

  const calcTimeLeft = () => {
    const diff = LAUNCH_DATE - new Date();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft);

  useEffect(() => { trackVisit('/'); }, []);
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const aiServices = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: t('aiServices.contentGeneration.title'),
      description: t('aiServices.contentGeneration.description')
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: t('aiServices.dataAnalysis.title'),
      description: t('aiServices.dataAnalysis.description')
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: t('aiServices.automation.title'),
      description: t('aiServices.automation.description')
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: t('aiServices.assistants.title'),
      description: t('aiServices.assistants.description')
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="dark-header">
        <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-[10px] md:text-sm">
              FTRX
            </div>
            <span className="text-base md:text-2xl font-bold">FuturoX AI</span>
          </div>
          
          <nav className="dark-nav hidden md:flex">
            <a href="#ai" className="dark-nav-link">{t('nav.aiServices')}</a>
            <a href="#bots" className="dark-nav-link">Trading Bots</a>
            <a href="#tokenomics" className="dark-nav-link">{t('nav.tokenomics')}</a>
            <a href="#whitelist" className="dark-nav-link">{t('nav.whitelist')}</a>
            <a href="#roadmap" className="dark-nav-link">{t('nav.roadmap')}</a>
            <a href="#solana" className="dark-nav-link">{t('nav.solana')}</a>
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <LanguageSwitcher />
            <WalletMultiButton className="btn-primary" />
          </div>
        </div>
      </header>

      {/* Hero Section with Countdown and Spline */}
      <section className="pt-20 sm:pt-32 pb-8 sm:pb-20 px-4 sm:px-[7.6923%] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-4 sm:space-y-8">
              <div className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] text-[#00FFD1] text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  {t('hero.badge')}
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {t('hero.title')} <br />
                <span className="text-[#00FFD1]">{t('hero.titleHighlight')}</span>
              </h1>

              <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-xl">
                {t('hero.description')}
              </p>

              {/* Countdown */}
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase tracking-wider">
                  {t('hero.countdown')}
                </p>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
                  {[
                    { value: timeLeft.days, label: t('hero.days') },
                    { value: timeLeft.hours, label: t('hero.hours') },
                    { value: timeLeft.minutes, label: t('hero.minutes') },
                    { value: timeLeft.seconds, label: t('hero.seconds') }
                  ].map((item, index) => (
                    <div key={index} className="bg-[#121212] border border-[rgba(255,255,255,0.25)] p-1.5 sm:p-4 text-center">
                      <div className="text-lg sm:text-3xl font-bold text-[#00FFD1]">
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <div className="text-[8px] sm:text-xs text-[#4D4D4D] mt-0.5 sm:mt-1 uppercase">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button 
                  className="btn-primary w-full sm:w-auto text-sm sm:text-base"
                  onClick={() => setShowPurchaseModal(!showPurchaseModal)}
                >
                  {connected ? t('hero.buyNow') : t('wallet.connectTitle')}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button className="btn-secondary w-full sm:w-auto text-sm sm:text-base">
                  {t('hero.learnMore')}
                </Button>
              </div>

              {/* Contract Address */}
              <ContractAddressBadge />
            </div>

            {/* Right - Spline 3D */}
            <div className="relative h-[400px] md:h-[700px] w-full hidden md:flex items-center justify-center">
              <div style={{ width: '100%', maxWidth: '700px', height: '100%', overflow: 'visible', position: 'relative' }}>
                <SplineSafe>
                  <Spline scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" />
                </SplineSafe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FTRX V1 → V2 Update Banner */}
      <section className="relative overflow-hidden py-8 px-4 bg-[#050505] border-y border-[#FFD700]/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FFD700] via-[#FFD700]/50 to-transparent"></div>
          <div className="absolute inset-0 bg-[#FFD700] opacity-[0.02]"></div>
        </div>
        <div className="relative max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FFD700]/15 border border-[#FFD700]/40 flex items-center justify-center rounded shrink-0">
              <span className="text-[#FFD700] text-lg font-black">!</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider">
                  {isPl ? 'Ważna informacja' : 'Important Notice'}
                </span>
                <span className="text-xs bg-[#FFD700]/10 text-[#FFD700] px-2 py-0.5 rounded border border-[#FFD700]/30 font-bold">
                  {isPl ? 'Aktualizacja obowiązkowa' : 'Mandatory Update'}
                </span>
              </div>
              <p className="text-white font-semibold">
                {isPl
                  ? <>Token FTRX przechodzi aktualizację z <span className="text-[#FFD700] font-bold">V1</span> na <span className="text-[#00FFD1] font-bold">V2</span> — zgłoś swój portfel, aby zachować tokeny.</>
                  : <>FTRX token is migrating from <span className="text-[#FFD700] font-bold">V1</span> to <span className="text-[#00FFD1] font-bold">V2</span> — register your wallet to keep your tokens.</>
                }
              </p>
            </div>
          </div>
          <a href="/update" className="shrink-0 inline-flex items-center gap-2 px-6 py-3 font-bold text-black rounded transition-all hover:opacity-90 whitespace-nowrap" style={{ background: '#FFD700' }}>
            {isPl ? 'Złóż wniosek o aktualizację' : 'Submit Update Request'}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* AI Banner 1: Neural Networks - After Hero */}
      <AIBannerBrain />

      {/* AI Services Section */}
      <section id="ai" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-[#121212]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-8 sm:mb-16 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full mb-2">
              <span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider">
                {isPl ? 'II Etap projektu MakkCoin Global' : 'MakkCoin Global — Phase II'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">{t('aiServices.title')}</h2>
            <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
              {t('aiServices.description')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
            {aiServices.map((service, index) => (
              <Card key={index} className="bg-black border-[rgba(255,255,255,0.25)] hover:border-[#00FFD1] transition-all duration-400 hover:shadow-[0_0_20px_rgba(0,255,209,0.3)]">
                <CardHeader className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] mb-3 sm:mb-4">
                    {service.icon}
                  </div>
                  <CardTitle className="text-white text-lg sm:text-2xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <CardDescription className="text-[rgba(255,255,255,0.85)] text-sm sm:text-base leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Banner 2: Automation - After AI Services */}
      <AIBannerAutomation />

      {/* Roadmap Section */}
      <Roadmap />

      {/* WOW Banner: Trading Revolution */}
      <section className="relative overflow-hidden py-16 sm:py-20 bg-black">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#00FFD1_0%,#00CCFF_25%,#7B61FF_50%,#FF3366_75%,#FFB800_100%)] opacity-[0.06]"></div>
          <div className="absolute inset-0 bg-black/80"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00FFD1] opacity-[0.04] blur-[200px] rounded-full animate-pulse"></div>
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.15)] rounded-full">
            <span className="w-2 h-2 bg-[#00FFD1] rounded-full animate-ping"></span>
            <span className="text-sm font-medium text-[#00FFD1] tracking-wide">{t('wowBanner.live')}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-[1.1]">
            <span className="block">{t('wowBanner.line1')}</span>
            <span className="block bg-gradient-to-r from-[#00FFD1] via-[#00CCFF] to-[#7B61FF] bg-clip-text text-transparent">{t('wowBanner.line2')}</span>
            <span className="block text-[rgba(255,255,255,0.4)]">{t('wowBanner.line3')}</span>
          </h2>
          <div className="flex justify-center gap-8 sm:gap-16 pt-4">
            <div className="text-center"><p className="text-2xl sm:text-4xl font-black text-[#00FFD1]">6</p><p className="text-xs text-[#666] mt-1">{t('wowBanner.stat1')}</p></div>
            <div className="w-px h-12 bg-[rgba(255,255,255,0.08)]"></div>
            <div className="text-center"><p className="text-2xl sm:text-4xl font-black text-[#00CCFF]">24/7</p><p className="text-xs text-[#666] mt-1">{t('wowBanner.stat2')}</p></div>
            <div className="w-px h-12 bg-[rgba(255,255,255,0.08)]"></div>
            <div className="text-center"><p className="text-2xl sm:text-4xl font-black text-[#7B61FF]">80%</p><p className="text-xs text-[#666] mt-1">{t('wowBanner.stat3')}</p></div>
          </div>
        </div>
      </section>

      {/* Trading Bots Offer Section */}
      <BotOffer />

      {/* WOW Banner: AI Business Revolution */}
      <section className="relative overflow-hidden py-14 sm:py-18 bg-[#050505]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'repeating-linear-gradient(90deg, #7B61FF 0px, transparent 1px, transparent 60px), repeating-linear-gradient(0deg, #7B61FF 0px, transparent 1px, transparent 60px)'}}></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7B61FF] opacity-[0.04] blur-[180px] rounded-full"></div>
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {t('wowBanner.bizTitle1')}<br /><span className="text-[#7B61FF]">{t('wowBanner.bizTitle2')}</span>
              </h3>
              <p className="text-sm text-[#888] max-w-lg">{t('wowBanner.bizDesc')}</p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              {[
                {val: '$3K-8K', labelKey: 'save1', color: '#00FFD1'},
                {val: '$4K-10K', labelKey: 'save2', color: '#7B61FF'},
                {val: '$2K-5K', labelKey: 'save3', color: '#FF3366'},
              ].map((s,i) => (
                <div key={i} className="text-center p-4 bg-black/50 border border-[rgba(255,255,255,0.05)] rounded-xl">
                  <p className="text-xl sm:text-2xl font-black" style={{color: s.color}}>{s.val}</p>
                  <p className="text-[10px] text-[#666] mt-1 whitespace-nowrap">{t(`wowBanner.${s.labelKey}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Services for Business & Individuals */}
      <AIServices />

      {/* AI Banner 3: Analytics - Before Pre-order */}
      <AIBannerAnalytics />

      {/* Pre-order Section */}
      <section id="preorder" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] relative overflow-hidden particles-bg">
        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#00FFD1] opacity-5 rounded-full blur-[80px] animate-float"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-[#00FFD1] opacity-5 rounded-full blur-[100px] animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-[#00FFD1] rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-[#00FFD1] rounded-full opacity-40 animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>
        
        <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-16 relative z-10">
          
          {/* Buy Options - Direct vs Raydium */}
          <BuyOptions onDirectBuyClick={() => setShowDirectPurchase(!showDirectPurchase)} />

          {/* Conditional Display: Show Direct Purchase Components when clicked */}
          {showDirectPurchase && (
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-12 items-start animate-fade-in-up">
              {/* Left - Wallet Connect */}
              <div className="card-hover-lift">
                <WalletConnect />
              </div>

              {/* Right - Token Purchase */}
              <div className="card-hover-lift" style={{animationDelay: '0.2s'}}>
                <TokenPurchase />
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.25)] p-6 sm:p-12 text-center space-y-6 sm:space-y-8 relative overflow-hidden group hover:border-[rgba(0,255,209,0.3)] transition-all duration-500">
            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(0,255,209,0.05)] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            
            <div className="space-y-3 sm:space-y-4 relative z-10">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">{t('preorder.title')}</h2>
              <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
                {t('preorder.description')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10">
              <div className="text-left space-y-2 p-4 bg-black/30 hover:bg-black/50 transition-colors duration-300">
                <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase">{t('preorder.availability')}</p>
                <p className="text-lg sm:text-xl font-bold text-[#00FFD1] animate-pulse">{t('preorder.limitedTokens')}</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-[rgba(255,255,255,0.25)]"></div>
              <div className="text-left space-y-2 p-4 bg-black/30 hover:bg-black/50 transition-colors duration-300">
                <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase">{t('preorder.blockchain')}</p>
                <p className="text-lg sm:text-xl font-bold">{t('preorder.solanaNetwork')}</p>
              </div>
            </div>
          </div>

          {/* Live Price Chart */}
          <div className="mt-8 sm:mt-16">
            <LivePriceChart />
          </div>
        </div>
      </section>

      {/* Solana Section */}
      <section id="solana" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-[#121212] relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#00FFD1] opacity-5 blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#00FFD1] opacity-5 blur-[100px]"></div>
          {/* Animated grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(#00FFD1 1px, transparent 1px), linear-gradient(90deg, #00FFD1 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">{t('solana.title')}</h2>
              <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)]">
                {t('solana.description')}
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0 group-hover:bg-[rgba(0,255,209,0.2)] group-hover:scale-110 transition-all duration-300">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1 group-hover:text-[#00FFD1] transition-colors">{t('solana.ultraFast.title')}</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-xs sm:text-sm">
                      {t('solana.ultraFast.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0 group-hover:bg-[rgba(0,255,209,0.2)] group-hover:scale-110 transition-all duration-300">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1 group-hover:text-[#00FFD1] transition-colors">{t('solana.scalability.title')}</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-xs sm:text-sm">
                      {t('solana.scalability.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0 group-hover:bg-[rgba(0,255,209,0.2)] group-hover:scale-110 transition-all duration-300">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1 group-hover:text-[#00FFD1] transition-colors">{t('solana.eco.title')}</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-xs sm:text-sm">
                      {t('solana.eco.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black border border-[rgba(255,255,255,0.25)] p-5 sm:p-8 space-y-4 sm:space-y-6 relative overflow-hidden group hover:border-[rgba(0,255,209,0.5)] transition-all duration-500 card-hover-lift">
              {/* Glow effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00FFD1] opacity-0 group-hover:opacity-10 blur-[60px] transition-opacity duration-500"></div>
              
              <h3 className="text-xl sm:text-2xl font-bold relative z-10">{t('solana.whyTitle')}</h3>
              <ul className="space-y-3 sm:space-y-4 text-[rgba(255,255,255,0.85)] text-sm sm:text-base relative z-10">
                <li className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-[#00FFD1] animate-pulse"></div>
                  {t('solana.lowFees')}
                </li>
                <li className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-[#00FFD1] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  {t('solana.fastFinality')}
                </li>
                <li className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-[#00FFD1] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  {t('solana.defi')}
                </li>
                <li className="flex items-center gap-3 hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-[#00FFD1] animate-pulse" style={{animationDelay: '0.6s'}}></div>
                  {t('solana.community')}
                </li>
              </ul>
              <Button 
                onClick={() => setShowSolanaModal(true)}
                className="btn-secondary w-full text-sm sm:text-base relative z-10 hover:shadow-[0_0_20px_rgba(0,255,209,0.3)] transition-shadow duration-300"
              >
                {t('solana.learnMore')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenomics Section - After Solana */}
      <Tokenomics />

      {/* Whitelist Section - After Tokenomics */}
      <Whitelist />

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.25)] py-8 sm:py-12 px-4 sm:px-[7.6923%]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="col-span-2 md:col-span-1 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-[10px] sm:text-sm">
                  FTRX
                </div>
                <span className="text-lg sm:text-xl font-bold">FuturoX AI</span>
              </div>
              <p className="text-[#4D4D4D] text-xs sm:text-sm">
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.product')}</h4>
              <ul className="space-y-2 text-[#4D4D4D] text-xs sm:text-sm">
                <li><a href="#ai" className="hover:text-[#00FFD1] transition-colors">{t('footer.aiServices')}</a></li>
                <li><a href="#tokenomics" className="hover:text-[#00FFD1] transition-colors">{t('footer.whitepaper')}</a></li>
                <li><a href="#roadmap" className="hover:text-[#00FFD1] transition-colors">{t('footer.roadmap')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.community')}</h4>
              <ul className="space-y-2 text-[#4D4D4D] text-xs sm:text-sm">
                <li><a href="https://x.com/FuturoxAI" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FFD1] transition-colors">Twitter / X</a></li>
                <li><a href="https://www.facebook.com/profile.php?id=61577565175491" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FFD1] transition-colors">Facebook</a></li>
                <li><a href="https://www.instagram.com/futuroxaicoin/" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FFD1] transition-colors">Instagram</a></li>
                <li><a href="https://www.tiktok.com/@futuroxai" target="_blank" rel="noopener noreferrer" className="hover:text-[#00FFD1] transition-colors">TikTok</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-[#4D4D4D] text-xs sm:text-sm">
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">{t('footer.terms')}</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">{t('footer.privacy')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.25)] pt-6 sm:pt-8 text-center text-[#4D4D4D] text-xs sm:text-sm">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Solana Info Modal */}
      <SolanaInfoModal 
        open={showSolanaModal} 
        onOpenChange={setShowSolanaModal}
      />

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
};

export default Home;
