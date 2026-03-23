import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Rocket, Mail, Wallet, CheckCircle, Sparkles, Users, Gift, Clock } from 'lucide-react';

export const Whitelist = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateWallet = (address) => {
    // Solana addresses are base58 encoded and 32-44 characters
    return address.length >= 32 && address.length <= 44;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError(t('whitelist.invalidEmail'));
      return;
    }

    if (walletAddress && !validateWallet(walletAddress)) {
      setError(t('whitelist.invalidWallet'));
      return;
    }

    setIsSubmitting(true);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          wallet_address: walletAddress || null,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setEmail('');
        setWalletAddress('');
      } else {
        const data = await response.json();
        setError(data.detail || t('whitelist.error'));
      }
    } catch (err) {
      setError(t('whitelist.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <Clock className="w-5 h-5" />,
      title: t('whitelist.benefit1Title'),
      description: t('whitelist.benefit1Desc')
    },
    {
      icon: <Gift className="w-5 h-5" />,
      title: t('whitelist.benefit2Title'),
      description: t('whitelist.benefit2Desc')
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: t('whitelist.benefit3Title'),
      description: t('whitelist.benefit3Desc')
    }
  ];

  return (
    <section id="whitelist" className="py-12 sm:py-20 px-4 sm:px-[7.6923%] bg-[#121212] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00FFD1] opacity-5 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00FFD1] opacity-5 blur-[150px] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        {/* Animated particles */}
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-[#00FFD1] rounded-full opacity-40 animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-[#00FFD1] rounded-full opacity-30 animate-float" style={{animationDelay: '0.7s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-[#00FFD1] rounded-full opacity-50 animate-float" style={{animationDelay: '1.4s'}}></div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] text-[#00FFD1] text-sm font-medium mb-4 animate-pulse">
            <Rocket className="w-4 h-4 animate-bounce" style={{animationDuration: '2s'}} />
            {t('whitelist.badge')}
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white">
            {t('whitelist.title')}
          </h2>
          <p className="text-sm sm:text-lg text-[rgba(255,255,255,0.85)] max-w-2xl mx-auto">
            {t('whitelist.description')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-start">
          {/* Benefits */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-6">
              {t('whitelist.benefitsTitle')}
            </h3>
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex gap-4 p-4 sm:p-5 bg-black border border-[rgba(255,255,255,0.1)] hover:border-[rgba(0,255,209,0.3)] transition-all duration-300 hover:translate-x-2 hover:shadow-[0_0_20px_rgba(0,255,209,0.1)] group relative overflow-hidden"
                style={{animationDelay: `${index * 0.15}s`}}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(0,255,209,0.03)] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] flex-shrink-0 group-hover:bg-[rgba(0,255,209,0.2)] group-hover:scale-110 transition-all duration-300 relative z-10">
                  {benefit.icon}
                </div>
                <div className="relative z-10">
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-1 group-hover:text-[#00FFD1] transition-colors">{benefit.title}</h4>
                  <p className="text-sm text-[rgba(255,255,255,0.7)]">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="bg-black border border-[rgba(0,255,209,0.3)] p-6 sm:p-8 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00FFD1] opacity-10 blur-[80px] rounded-full"></div>
            
            {isSuccess ? (
              <div className="text-center py-8 sm:py-12 relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[rgba(0,255,209,0.1)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#00FFD1]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {t('whitelist.successTitle')}
                </h3>
                <p className="text-[rgba(255,255,255,0.85)] mb-6">
                  {t('whitelist.successMessage')}
                </p>
                <Button
                  onClick={() => setIsSuccess(false)}
                  className="btn-secondary"
                >
                  {t('whitelist.addAnother')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 relative z-10">
                <div className="text-center mb-6">
                  <Sparkles className="w-8 h-8 text-[#00FFD1] mx-auto mb-3" />
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {t('whitelist.formTitle')}
                  </h3>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm text-[rgba(255,255,255,0.85)] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#00FFD1]" />
                    {t('whitelist.emailLabel')} *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('whitelist.emailPlaceholder')}
                    required
                    className="bg-[#121212] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[#4D4D4D] focus:border-[#00FFD1] h-12"
                  />
                </div>

                {/* Wallet Address */}
                <div className="space-y-2">
                  <label className="text-sm text-[rgba(255,255,255,0.85)] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#00FFD1]" />
                    {t('whitelist.walletLabel')}
                  </label>
                  <Input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder={t('whitelist.walletPlaceholder')}
                    className="bg-[#121212] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[#4D4D4D] focus:border-[#00FFD1] h-12 font-mono text-sm"
                  />
                  <p className="text-xs text-[#4D4D4D]">{t('whitelist.walletHint')}</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                      {t('whitelist.submitting')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      {t('whitelist.submitButton')}
                    </span>
                  )}
                </Button>

                <p className="text-xs text-center text-[#4D4D4D]">
                  {t('whitelist.privacy')}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
