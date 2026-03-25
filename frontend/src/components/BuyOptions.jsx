import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ExternalLink, Zap, ShoppingCart } from 'lucide-react';
import { EXTERNAL_LINKS } from '../config/links';

export const BuyOptions = ({ onDirectBuyClick }) => {
  const { t } = useTranslation();

  const handleRaydiumClick = () => {
    window.open(EXTERNAL_LINKS.raydium, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          {t('purchase.buyOptions.title')}
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Direct Purchase Option */}
        <Card className="bg-[#121212] border-[rgba(0,255,209,0.4)] hover:border-[#00FFD1] transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,209,0.2)]">
          <CardHeader>
            <div className="w-14 h-14 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-7 h-7 text-[#00FFD1]" />
            </div>
            <CardTitle className="text-white text-xl text-center">
              {t('purchase.buyOptions.direct.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-[rgba(255,255,255,0.85)] text-center min-h-[60px]">
              {t('purchase.buyOptions.direct.description')}
            </CardDescription>
            <Button 
              onClick={onDirectBuyClick}
              className="btn-primary w-full"
            >
              {t('purchase.buyOptions.direct.button')}
            </Button>
          </CardContent>
        </Card>

        {/* Raydium DEX Option */}
        <Card className="bg-[#121212] border-[rgba(0,255,209,0.4)] hover:border-[#00FFD1] transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,209,0.2)] relative">
          <CardHeader>
            <div className="w-14 h-14 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-[#00FFD1]" />
            </div>
            <CardTitle className="text-white text-xl text-center">
              {t('purchase.buyOptions.raydium.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-[rgba(255,255,255,0.85)] text-center min-h-[60px]">
              {t('purchase.buyOptions.raydium.description')}
            </CardDescription>
            <Button 
              onClick={handleRaydiumClick}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {t('purchase.buyOptions.raydium.button')}
              <ExternalLink className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <div className="bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-4 text-center">
        <p className="text-sm text-[rgba(255,255,255,0.85)]">
          💡 <strong>Pro Tip:</strong> Direct purchase is instant. Raydium offers market pricing with deep liquidity.
        </p>
      </div>
    </div>
  );
};
