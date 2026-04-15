import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TrendingUp, Crosshair, Repeat, ArrowLeftRight, Users, Shield, BarChart3, Wallet, Star, Zap, ChevronRight, Mail } from 'lucide-react';

const bots = [
  {
    id: 'spread',
    name: 'Spread Bot',
    icon: <ArrowLeftRight className="w-6 h-6" />,
    price: 99,
    priceLabel: '$99 USD',
    period: 'miesiecznie w FTRX',
    profitRange: '$2,000 - $8,000',
    profitLabel: 'sredni zysk miesiecznie',
    color: '#00FFD1',
    gradient: 'from-[#00FFD1]/20 to-[#00FFD1]/5',
    borderColor: 'border-[#00FFD1]/30',
    hoverBorder: 'hover:border-[#00FFD1]/70',
    description: 'Automatycznie wykorzystuje roznice cenowe miedzy gieldami DEX na Solanie. Bot analizuje spready w czasie rzeczywistym i realizuje transakcje z milisekundowa precyzja, generujac stabilne zyski przy minimalnym ryzyku.',
    features: ['Analiza spreadow 24/7', 'Multi-DEX arbitraz', 'Automatyczne hedging pozycji', 'Sredni ROI: 15-30% miesiecznie'],
    tag: 'STABILNY ZYSK',
    popular: false,
  },
  {
    id: 'sniper',
    name: 'Sniper Bot',
    icon: <Crosshair className="w-6 h-6" />,
    price: 199,
    priceLabel: '$199 USD',
    period: 'miesiecznie w FTRX',
    profitRange: 'do $10,000',
    profitLabel: 'wygenerowanego zysku',
    color: '#FF3366',
    gradient: 'from-[#FF3366]/20 to-[#FF3366]/5',
    borderColor: 'border-[#FF3366]/30',
    hoverBorder: 'hover:border-[#FF3366]/70',
    description: 'Wykrywa nowe tokeny na Raydium, Meteora i pump.fun w momencie ich uruchomienia. Kupuje w pierwszych sekundach listingu i sprzedaje z Take Profit / Stop Loss, zapewniajac maksymalne zyski z najwczesniejszego wejscia.',
    features: ['Sniping nowych tokenow <1s', 'Take Profit & Stop Loss', 'Filtrowanie scamow AI', 'Sredni ROI: 40-80% na trade'],
    tag: 'NAJWYZSZY ZYSK',
    popular: true,
  },
  {
    id: 'trade',
    name: 'Trade Bot',
    icon: <TrendingUp className="w-6 h-6" />,
    price: 199,
    priceLabel: '$199 USD',
    period: 'miesiecznie w FTRX',
    profitRange: 'do $10,000',
    profitLabel: 'wygenerowanego zysku',
    color: '#7B61FF',
    gradient: 'from-[#7B61FF]/20 to-[#7B61FF]/5',
    borderColor: 'border-[#7B61FF]/30',
    hoverBorder: 'hover:border-[#7B61FF]/70',
    description: 'Zaawansowany bot tradingowy oparty na sygnalach AI i analizie technicznej. Realizuje strategie scalping, swing trading i momentum na topowych parach Solana z automatycznym zarzadzaniem ryzykiem.',
    features: ['Strategie AI + analiza techniczna', 'Scalping i swing trading', 'Dynamiczny stop-loss', 'Sredni ROI: 30-60% miesiecznie'],
    tag: 'AI POWERED',
    popular: false,
  },
  {
    id: 'arbitrage',
    name: 'Arbitrage Bot',
    icon: <Repeat className="w-6 h-6" />,
    price: 99,
    priceLabel: '$99 USD',
    period: 'miesiecznie w FTRX',
    profitRange: 'do $10,000',
    profitLabel: 'wygenerowanego zysku',
    color: '#00CCFF',
    gradient: 'from-[#00CCFF]/20 to-[#00CCFF]/5',
    borderColor: 'border-[#00CCFF]/30',
    hoverBorder: 'hover:border-[#00CCFF]/70',
    description: 'Wykrywa roznice cenowe tego samego tokena na roznych pulach plynnosci i gieldach DEX. Realizuje natychmiastowe transakcje arbitrazowe z gwarantowanym zyskiem na kazdej operacji.',
    features: ['Cross-DEX arbitraz', 'Flash loan strategies', 'Zero-risk profit model', 'Sredni ROI: 10-25% miesiecznie'],
    tag: 'NISKIE RYZYKO',
    popular: false,
  },
  {
    id: 'copytrade',
    name: 'Copy Trade',
    icon: <Users className="w-6 h-6" />,
    price: 99,
    priceLabel: '$99 USD',
    period: 'miesiecznie w FTRX',
    profitRange: '$5,000 - $15,000',
    profitLabel: 'sredni zysk miesiecznie',
    color: '#FFB800',
    gradient: 'from-[#FFB800]/20 to-[#FFB800]/5',
    borderColor: 'border-[#FFB800]/30',
    hoverBorder: 'hover:border-[#FFB800]/70',
    description: 'Kopiuj transakcje najlepszych traderow ekosystemu Solana w czasie rzeczywistym. Wybierz sposorod zweryfikowanych portfeli z potwierdzona historia zyskow i automatycznie replikuj ich strategie.',
    features: ['Kopiowanie top traderow', 'Weryfikowana historia zyskow', 'Automatyczne proporcje', 'Sredni ROI: 25-50% miesiecznie'],
    tag: 'SMART COPY',
    popular: false,
    hasPremium: true,
    premiumPrice: 499,
    premiumLabel: '$499 USD w FTRX / mies.',
    premiumDesc: 'Dostep do portfeli zespolu FuturoX AI z wygenerowanym zyskiem do $50,000 USD',
  },
];

export const BotOffer = () => {
  const [expandedBot, setExpandedBot] = useState(null);

  return (
    <section id="bots" className="py-16 sm:py-24 px-4 sm:px-[7.6923%] relative overflow-hidden bg-black">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00FFD1] opacity-[0.03] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7B61FF] opacity-[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #00FFD1 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-20 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(0,255,209,0.08)] border border-[rgba(0,255,209,0.2)] text-[#00FFD1] text-xs sm:text-sm font-medium rounded-full">
            <Zap className="w-4 h-4" />
            TRADING BOTY AI
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Zarabiaj na autopilocie<br />
            <span className="bg-gradient-to-r from-[#00FFD1] via-[#00CCFF] to-[#7B61FF] bg-clip-text text-transparent">z FuturoX AI Bots</span>
          </h2>
          <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.6)] max-w-3xl mx-auto leading-relaxed">
            Profesjonalne boty tradingowe napedzane sztuczna inteligencja. Platnosc wylacznie w tokenie FTRX.
            Kazdy klient otrzymuje dedykowany panel z pelna analiza i praca botow w czasie rzeczywistym.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-12 sm:mb-16">
          {[
            { icon: <Shield className="w-5 h-5" />, label: 'Non-Custodial', desc: 'Nie przechowujemy srodkow' },
            { icon: <Wallet className="w-5 h-5" />, label: 'Auto-Payout', desc: 'Zyski na Twoj portfel' },
            { icon: <BarChart3 className="w-5 h-5" />, label: 'Panel Real-Time', desc: 'Pelna analiza 24/7' },
            { icon: <Star className="w-5 h-5" />, label: 'Platnosc w FTRX', desc: 'Wylacznie token FTRX' },
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

        {/* Bot Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {bots.map((bot) => (
            <Card
              key={bot.id}
              data-testid={`bot-offer-${bot.id}`}
              className={`relative bg-[#0a0a0a] ${bot.borderColor} ${bot.hoverBorder} transition-all duration-500 overflow-hidden group cursor-pointer ${bot.popular ? 'md:scale-105 shadow-[0_0_40px_rgba(255,51,102,0.15)]' : ''}`}
              onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
            >
              {/* Popular badge */}
              {bot.popular && (
                <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: bot.color, color: '#000' }}>
                  NAJPOPULARNIEJSZY
                </div>
              )}

              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-b ${bot.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

              <CardContent className="p-5 sm:p-6 relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: `${bot.color}15`, color: bot.color }}>
                      {bot.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{bot.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${bot.color}20`, color: bot.color }}>
                        {bot.tag}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profit highlight */}
                <div className="p-3 rounded-lg" style={{ background: `${bot.color}08`, border: `1px solid ${bot.color}15` }}>
                  <p className="text-2xl sm:text-3xl font-black" style={{ color: bot.color }}>{bot.profitRange}</p>
                  <p className="text-xs text-[#888] mt-0.5">{bot.profitLabel}</p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{bot.priceLabel}</span>
                  <span className="text-xs text-[#666]">{bot.period}</span>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#999] leading-relaxed">{bot.description}</p>

                {/* Features */}
                <ul className="space-y-2">
                  {bot.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs sm:text-sm text-[#ccc]">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: bot.color }}></div>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Premium Option (Copy Trade) */}
                {bot.hasPremium && (
                  <div className="mt-3 p-3 rounded-lg border border-[#FFB800]/20 bg-[#FFB800]/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-[#FFB800]" />
                      <span className="text-sm font-bold text-[#FFB800]">PREMIUM - Portfele Zespolu</span>
                    </div>
                    <p className="text-xs text-[#999] mb-2">{bot.premiumDesc}</p>
                    <p className="text-lg font-bold text-[#FFB800]">{bot.premiumLabel}</p>
                  </div>
                )}

                {/* CTA */}
                <Button
                  className="w-full h-11 font-bold text-sm transition-all duration-300 group-hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${bot.color}, ${bot.color}99)`,
                    color: '#000',
                    boxShadow: `0 0 20px ${bot.color}30`,
                  }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  Kup za FTRX <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Section: Panel Info + Exclusive */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Dedicated Panel */}
          <div className="p-6 sm:p-8 bg-[#0a0a0a] border border-[rgba(0,255,209,0.15)] rounded-xl relative overflow-hidden group hover:border-[#00FFD1]/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00FFD1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#00FFD1]/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-[#00FFD1]" />
                </div>
                <h3 className="text-xl font-bold text-white">Dedykowany Panel Klienta</h3>
              </div>
              <p className="text-sm text-[#999] leading-relaxed">
                Kazdy klient otrzymuje wlasny panel z pelna analiza pracy botow w czasie rzeczywistym. 
                Sledz zyski, historii transakcji, statystyki i wydajnosc - wszystko na zywo, 24/7.
              </p>
              <ul className="space-y-2">
                {['Praca botow w czasie rzeczywistym', 'Historia wszystkich transakcji', 'Wykres zyskow i strat (PnL)', 'Automatyczne przesylanie zyskow na portfel'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#ccc]">
                    <div className="w-1.5 h-1.5 bg-[#00FFD1] rounded-full"></div> {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 p-3 bg-[#00FFD1]/5 border border-[#00FFD1]/10 rounded-lg">
                <Shield className="w-5 h-5 text-[#00FFD1]" />
                <p className="text-xs text-[#00FFD1] font-medium">
                  FuturoX AI nie przechowuje srodkow klienta. Model Non-Custodial - zyski automatycznie trafiaja na Twoj portfel.
                </p>
              </div>
            </div>
          </div>

          {/* Exclusive Offer */}
          <div className="p-6 sm:p-8 bg-[#0a0a0a] border border-[rgba(255,184,0,0.15)] rounded-xl relative overflow-hidden group hover:border-[#FFB800]/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFB800]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-[#FFB800]" />
                </div>
                <h3 className="text-xl font-bold text-white">Bot na Wylacznosc</h3>
              </div>
              <p className="text-sm text-[#999] leading-relaxed">
                Mozliwosc wykupienia dowolnego bota na wylacznosc w ramach indywidualnej oferty. 
                Dedykowana konfiguracja, priorytetowe wsparcie i pelna personalizacja strategii pod Twoje potrzeby.
              </p>
              <ul className="space-y-2">
                {['Wlasna instancja bota', 'Indywidualna strategia tradingowa', 'Priorytetowe wsparcie 24/7', 'Dedykowany opiekun klienta'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#ccc]">
                    <div className="w-1.5 h-1.5 bg-[#FFB800] rounded-full"></div> {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:support@futuroxai.com" className="flex items-center gap-3 p-4 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-lg hover:bg-[#FFB800]/15 transition-colors group/mail">
                <Mail className="w-5 h-5 text-[#FFB800]" />
                <div>
                  <p className="text-sm font-bold text-[#FFB800]">Skontaktuj sie z nami</p>
                  <p className="text-xs text-[#999]">support@futuroxai.com</p>
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
