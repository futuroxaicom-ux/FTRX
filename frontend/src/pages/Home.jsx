import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowRight, Zap, Sparkles, Globe, Clock, Cpu, TrendingUp } from 'lucide-react';
import Spline from '@splinetool/react-spline';

const Home = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

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
      title: "Generowanie Treści AI",
      description: "Automatyczne tworzenie tekstów, grafik i materiałów marketingowych przy użyciu zaawansowanych modeli AI."
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: "Analiza Danych Biznesowych",
      description: "Inteligentna analiza danych, predykcja trendów i wsparcie w podejmowaniu decyzji strategicznych."
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automatyzacja Procesów",
      description: "Optymalizacja workflow i automatyzacja powtarzalnych zadań z wykorzystaniem AI."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Asystenci AI dla Biznesu",
      description: "Inteligentne chatboty i wirtualni asystenci do obsługi klientów 24/7."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="dark-header">
        <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-xl">
              FC
            </div>
            <span className="text-2xl font-bold">FutureCoin</span>
          </div>
          
          <nav className="dark-nav hidden md:flex">
            <a href="#ai" className="dark-nav-link">Usługi AI</a>
            <a href="#preorder" className="dark-nav-link">Pre-order</a>
            <a href="#solana" className="dark-nav-link">Solana</a>
          </nav>

          <Button className="btn-primary">
            Kup Token
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Hero Section with Countdown and Spline */}
      <section className="pt-32 pb-20 px-[7.6923%] relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] text-[#00FFD1] text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Oparty na Solana Blockchain
                </div>
              </div>

              <h1 className="display-huge">
                Przyszłość AI <br />
                <span className="text-[#00FFD1]">Zaczyna się tutaj</span>
              </h1>

              <p className="body-large text-[rgba(255,255,255,0.85)] max-w-xl">
                FutureCoin to rewolucyjny token umożliwiający dostęp do najnowocześniejszych usług AI. 
                Wykorzystaj moc sztucznej inteligencji w swoim biznesie.
              </p>

              {/* Countdown */}
              <div className="space-y-4">
                <p className="text-sm text-[#4D4D4D] uppercase tracking-wider">
                  Uruchomienie Usług AI
                </p>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { value: timeLeft.days, label: 'Dni' },
                    { value: timeLeft.hours, label: 'Godzin' },
                    { value: timeLeft.minutes, label: 'Minut' },
                    { value: timeLeft.seconds, label: 'Sekund' }
                  ].map((item, index) => (
                    <div key={index} className="bg-[#121212] border border-[rgba(255,255,255,0.25)] p-4 text-center">
                      <div className="text-3xl font-bold text-[#00FFD1]">
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-[#4D4D4D] mt-1 uppercase">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button className="btn-primary">
                  Rozpocznij Pre-order
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button className="btn-secondary">
                  Dowiedz się więcej
                </Button>
              </div>
            </div>

            {/* Right - Spline 3D */}
            <div className="relative h-[700px] w-full flex items-center justify-center">
              <div style={{ width: '700px', height: '700px', overflow: 'visible', position: 'relative' }}>
                <Spline scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Services Section */}
      <section id="ai" className="py-20 px-[7.6923%] bg-[#121212]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="display-large">Usługi AI dla Twojego Biznesu</h2>
            <p className="body-medium text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
              Wykorzystaj moc sztucznej inteligencji poprzez FutureCoin. 
              Dostęp do zaawansowanych narzędzi AI, które zrewolucjonizują Twoją firmę.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {aiServices.map((service, index) => (
              <Card key={index} className="bg-black border-[rgba(255,255,255,0.25)] hover:border-[#00FFD1] transition-all duration-400 hover:shadow-[0_0_20px_rgba(0,255,209,0.3)]">
                <CardHeader>
                  <div className="w-14 h-14 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] mb-4">
                    {service.icon}
                  </div>
                  <CardTitle className="text-white text-2xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-[rgba(255,255,255,0.85)] text-base leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-order Section */}
      <section id="preorder" className="py-20 px-[7.6923%]">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#121212] border border-[rgba(255,255,255,0.25)] p-12 text-center space-y-8">
            <div className="space-y-4">
              <h2 className="display-large">Pre-order FutureCoin</h2>
              <p className="body-medium text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
                Bądź częścią rewolucji AI. Zamów tokeny FutureCoin już teraz i zyskaj wczesny dostęp 
                do wszystkich usług AI od dnia premiery.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="text-left space-y-2">
                <p className="text-sm text-[#4D4D4D] uppercase">Dostępność</p>
                <p className="text-xl font-bold text-[#00FFD1]">Ograniczona liczba tokenów</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-[rgba(255,255,255,0.25)]"></div>
              <div className="text-left space-y-2">
                <p className="text-sm text-[#4D4D4D] uppercase">Blockchain</p>
                <p className="text-xl font-bold">Solana Network</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button className="btn-primary">
                Kup na Giełdzie
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button className="btn-secondary">
                Zobacz Whitepaper
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Solana Section */}
      <section id="solana" className="py-20 px-[7.6923%] bg-[#121212]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="display-large">Zbudowany na Solana</h2>
              <p className="body-medium text-[rgba(255,255,255,0.85)]">
                FutureCoin wykorzystuje moc ekosystemu Solana - jednego z najszybszych 
                i najbardziej wydajnych blockchainów na świecie.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Ultraszybkie Transakcje</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-sm">
                      Do 65,000 transakcji na sekundę z minimalnymi kosztami.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Skalowalność</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-sm">
                      Technologia gotowa na miliony użytkowników globalnie.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Ekologiczny</h3>
                    <p className="text-[rgba(255,255,255,0.85)] text-sm">
                      Energooszczędny mechanizm konsensusu przyjazny dla środowiska.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black border border-[rgba(255,255,255,0.25)] p-8 space-y-6">
              <h3 className="text-2xl font-bold">Dlaczego Solana?</h3>
              <ul className="space-y-4 text-[rgba(255,255,255,0.85)]">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  Niskie koszty transakcji (~$0.00025)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  Błyskawiczne finalizacje (~400ms)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  Rozwinięty ekosystem DeFi
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#00FFD1]"></div>
                  Rosnąca społeczność deweloperów
                </li>
              </ul>
              <Button className="btn-secondary w-full">
                Więcej o Solana
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.25)] py-12 px-[7.6923%]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-xl">
                  FC
                </div>
                <span className="text-xl font-bold">FutureCoin</span>
              </div>
              <p className="text-[#4D4D4D] text-sm">
                Rewolucja AI powered by blockchain
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-[#4D4D4D] text-sm">
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Usługi AI</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Whitepaper</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Społeczność</h4>
              <ul className="space-y-2 text-[#4D4D4D] text-sm">
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Telegram</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Prawne</h4>
              <ul className="space-y-2 text-[#4D4D4D] text-sm">
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Regulamin</a></li>
                <li><a href="#" className="hover:text-[#00FFD1] transition-colors">Polityka Prywatności</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.25)] pt-8 text-center text-[#4D4D4D] text-sm">
            <p>© 2025 FutureCoin. Wszelkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
