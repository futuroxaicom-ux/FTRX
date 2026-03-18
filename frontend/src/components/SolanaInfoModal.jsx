import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { ExternalLink, Zap, Shield, TrendingUp, Globe, DollarSign, Cpu, Users } from 'lucide-react';

export const SolanaInfoModal = ({ open, onOpenChange }) => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Ultra-High Speed",
      description: "400ms block times and 65,000+ TPS capacity make Solana one of the fastest blockchains in production.",
      stat: "400ms"
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Incredibly Low Fees",
      description: "Average transaction cost of $0.00025 enables micro-transactions and high-frequency trading.",
      stat: "$0.00025"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Proof of Stake Security",
      description: "Secured by a network of validators with billions in staked SOL ensuring network security.",
      stat: "1,900+"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Decentralization",
      description: "Validator nodes distributed across 6 continents ensuring true decentralization.",
      stat: "Global"
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "Proof of History",
      description: "Unique consensus mechanism that creates a historical record proving events occurred at specific moments.",
      stat: "Unique"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Thriving Ecosystem",
      description: "Home to thousands of projects including DeFi, NFTs, gaming, and Web3 applications.",
      stat: "1000+"
    }
  ];

  const comparisons = [
    { chain: "Solana", tps: "65,000", fee: "$0.00025", time: "400ms", color: "#00FFD1" },
    { chain: "Ethereum", tps: "15-30", fee: "$5-50", time: "12-15s", color: "#627EEA" },
    { chain: "Bitcoin", tps: "7", fee: "$1-5", time: "10min", color: "#F7931A" },
    { chain: "Polygon", tps: "7,000", fee: "$0.01", time: "2s", color: "#8247E5" }
  ];

  const useCases = [
    "DeFi Protocols & DEXs (Raydium, Jupiter, Orca)",
    "NFT Marketplaces (Magic Eden, Tensor)",
    "Gaming & Metaverse Projects",
    "Payment Systems & Stablecoins",
    "Web3 Social Media Platforms",
    "AI & Machine Learning Applications"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121212] border-[rgba(0,255,209,0.3)] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center rounded-full">
              <Zap className="w-6 h-6 text-[#00FFD1]" />
            </div>
            Why Solana for FuturoX AI?
          </DialogTitle>
          <DialogDescription className="text-[rgba(255,255,255,0.85)] text-lg">
            Discover why we chose Solana as the foundation for FuturoX AI token
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Key Features Grid */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Key Features</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-black border border-[rgba(0,255,209,0.2)] p-6 hover:border-[#00FFD1] transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center text-[#00FFD1] group-hover:bg-[rgba(0,255,209,0.2)] transition-colors flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{feature.title}</h4>
                        <span className="text-[#00FFD1] font-bold text-sm">{feature.stat}</span>
                      </div>
                      <p className="text-[rgba(255,255,255,0.7)] text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Comparison */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Performance Comparison</h3>
            <div className="bg-black border border-[rgba(0,255,209,0.2)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.1)]">
                    <th className="text-left p-4 text-white font-semibold">Blockchain</th>
                    <th className="text-left p-4 text-white font-semibold">TPS</th>
                    <th className="text-left p-4 text-white font-semibold">Avg Fee</th>
                    <th className="text-left p-4 text-white font-semibold">Block Time</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, index) => (
                    <tr 
                      key={index}
                      className={`border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(0,255,209,0.05)] transition-colors ${
                        index === 0 ? 'bg-[rgba(0,255,209,0.03)]' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: row.color }}
                          ></div>
                          <span className={`font-semibold ${index === 0 ? 'text-[#00FFD1]' : 'text-white'}`}>
                            {row.chain}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-[rgba(255,255,255,0.85)]">{row.tps}</td>
                      <td className="p-4 text-[rgba(255,255,255,0.85)]">{row.fee}</td>
                      <td className="p-4 text-[rgba(255,255,255,0.85)]">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#4D4D4D] mt-2">
              * TPS = Transactions Per Second. Data as of 2026.
            </p>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Solana Ecosystem Use Cases</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {useCases.map((useCase, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 bg-black border border-[rgba(255,255,255,0.1)] p-4 hover:border-[rgba(0,255,209,0.3)] transition-colors"
                >
                  <div className="w-2 h-2 bg-[#00FFD1] rounded-full flex-shrink-0"></div>
                  <span className="text-[rgba(255,255,255,0.85)] text-sm">{useCase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why FuturoX AI Chose Solana */}
          <div className="bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Why FuturoX AI Chose Solana</h3>
            <div className="space-y-3 text-[rgba(255,255,255,0.85)]">
              <p className="flex items-start gap-3">
                <span className="text-[#00FFD1] font-bold">→</span>
                <span><strong>AI-Ready Infrastructure:</strong> High throughput needed for AI model payments and API calls</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-[#00FFD1] font-bold">→</span>
                <span><strong>Micro-transactions:</strong> Low fees enable pay-per-use AI services without minimum limits</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-[#00FFD1] font-bold">→</span>
                <span><strong>Real-time Payments:</strong> Fast settlement critical for instant AI service access</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-[#00FFD1] font-bold">→</span>
                <span><strong>Growing Ecosystem:</strong> Access to DeFi, DEXs, and liquidity pools for FTRX trading</span>
              </p>
            </div>
          </div>

          {/* External Resources */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Learn More</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => window.open('https://solana.com', '_blank')}
                className="btn-secondary"
              >
                Solana Official Website
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => window.open('https://docs.solana.com', '_blank')}
                className="btn-secondary"
              >
                Developer Docs
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => window.open('https://solana.com/ecosystem', '_blank')}
                className="btn-secondary"
              >
                Ecosystem
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
