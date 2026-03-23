import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowRight, Zap, Sparkles, Globe, Clock, Cpu, TrendingUp } from 'lucide-react';
import Spline from '@splinetool/react-spline';
import { WalletConnect } from '../components/WalletConnect';
import { TokenPurchase } from '../components/TokenPurchase';
import { BuyOptions } from '../components/BuyOptions';
import { LivePriceChart } from '../components/LivePriceChart';
import { SolanaInfoModal } from '../components/SolanaInfoModal';
import { ChatBot } from '../components/ChatBot';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIBannerBrain, AIBannerAutomation, AIBannerAnalytics } from '../components/AIBanner';

const Home = () => {
  const { t } = useTranslation();
  const { connected } = useWallet();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDirectPurchase, setShowDirectPurchase] = useState(false);
  const [showSolanaModal, setShowSolanaModal] = useState(false);

  useEffect(() => {
    const targetDate = new Date('2026-05-10T00:00:00');
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

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
            <a href="#preorder" className="dark-nav-link">{t('nav.preorder')}</a>
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
            </div>

            {/* Right - Spline 3D */}
            <div className="relative h-[400px] md:h-[700px] w-full hidden md:flex items-center justify-center">
              <div style={{ width: '100%', maxWidth: '700px', height: '100%', overflow: 'visible', position: 'relative' }}>
                <Spline scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Banner 1: Neural Networks - After Hero */}
      <AIBannerBrain />

      {/* AI Services Section */}
      <section id="ai" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-[#121212]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-8 sm:mb-16 space-y-3 sm:space-y-4">
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

      {/* Pre-order Section */}
      <section id="preorder" className="py-12 sm:py-20 px-4 sm:px-[7.6923%]">
        <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-16">
          
          {/* Buy Options - Direct vs Raydium */}
          <BuyOptions onDirectBuyClick={() => setShowDirectPurchase(!showDirectPurchase)} />

          {/* Conditional Display: Show Direct Purchase Components when clicked */}
          {showDirectPurchase && (
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-12 items-start">
              {/* Left - Wallet Connect */}
              <div>
                <WalletConnect />
              </div>

              {/* Right - Token Purchase */}
              <div>
                <TokenPurchase />
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.25)] p-6 sm:p-12 text-center space-y-6 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">{t('preorder.title')}</h2>
              <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
                {t('preorder.description')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="text-left space-y-2">
                <p className="text-xs sm:text-sm text-[#4D4D4D] uppercase">{t('preorder.availability')}</p>
                <p className="text-lg sm:text-xl font-bold text-[#00FFD1]">{t('preorder.limitedTokens')}</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-[rgba(255,255,255,0.25)]"></div>
              <div className="text-left space-y-2">
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

      {/* AI Banner 3: Analytics - After Pre-order */}
      <AIBannerAnalytics />

      {/* Solana Section */}
      <section id="solana" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-[#121212]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">{t('solana.title')}</h2>
              <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)]">
                {t('solana.description')}
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1">{t('solana.ultraFast.title')}</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-xs sm:text-sm">
                      {t('solana.ultraFast.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1">{t('solana.scalability.title')}</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-xs sm:text-sm">
                      {t('solana.scalability.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1">{t('solana.eco.title')}</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-xs sm:text-sm">
                      {t('solana.eco.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black border border-[rgba(255,255,255,0.25)] p-5 sm:p-8 space-y-4 sm:space-y-6">
              <h3 className="text-xl sm:text-2xl font-bold">{t('solana.whyTitle')}</h3>
              <ul className="space-y-3 sm:space-y-4 text-[rgba(255,255,255,0.85)] text-sm sm:text-base">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  {t('solana.lowFees')}
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  {t('solana.fastFinality')}
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  {t('solana.defi')}
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  {t('solana.community')}
                </li>
              </ul>
              <Button 
                onClick={() => setShowSolanaModal(true)}
                className="btn-secondary w-full text-sm sm:text-base"
              >
                {t('solana.learnMore')}
              </Button>
            </div>
          </div>
        </div>
      </section>

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
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">{t('footer.whitepaper')}</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">{t('footer.roadmap')}</a></li>
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
