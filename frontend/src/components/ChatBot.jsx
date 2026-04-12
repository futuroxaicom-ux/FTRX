import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Bot, User, Mail, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { findAnswer, getGreeting, getQuickReplies } from '../utils/chatKnowledge';
import { trackChat } from '../utils/analytics';

export const ChatBot = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle language change - clear messages and update current lang
  useEffect(() => {
    if (i18n.language !== currentLang) {
      setMessages([]);
      setCurrentLang(i18n.language);
    }
  }, [i18n.language, currentLang]);

  // Send greeting when chat opens OR when messages are empty (after language change)
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getGreeting(currentLang);
      setMessages([{
        id: Date.now(),
        text: greeting,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentLang, messages.length]);

  const handleSendMessage = (text = inputValue) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot thinking with realistic delay
    setTimeout(() => {
      const answer = findAnswer(text, currentLang);
      trackChat(text, answer, currentLang);
      const botMessage = {
        id: Date.now() + 1,
        text: answer,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1200);
  };

  const handleQuickReply = (reply) => {
    handleSendMessage(reply);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickReplies = getQuickReplies(currentLang);

  return (
    <>
      {/* Floating Chat Button - Futuristic */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl z-50 group overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #00FFD1 0%, #00D4AA 100%)',
            animation: 'float 3s ease-in-out infinite'
          }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full animate-ping opacity-30" 
               style={{ background: 'linear-gradient(135deg, #00FFD1 0%, #00D4AA 100%)' }}></div>
          
          {/* Bot icon with sparkle */}
          <div className="relative">
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-black animate-pulse" />
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          
          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white animate-bounce">
            AI
          </span>
        </button>
      )}

      {/* Chat Window - Futuristic Design */}
      {isOpen && (
        <div 
          className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[600px] shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
            border: '1px solid rgba(0, 255, 209, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 0 60px rgba(0, 255, 209, 0.2)'
          }}
        >
          {/* Header - Futuristic with animated gradient */}
          <div 
            className="p-3 sm:p-5 flex items-center justify-between relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #00FFD1 0%, #00D4AA 50%, #00FFD1 100%)',
              backgroundSize: '200% 200%',
              animation: 'gradient 3s ease infinite'
            }}
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <div className="absolute w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" style={{ top: '-50%', left: '-20%' }}></div>
              <div className="absolute w-24 h-24 bg-white rounded-full blur-2xl animate-pulse" style={{ bottom: '-30%', right: '-10%', animationDelay: '1s' }}></div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 relative z-10">
              {/* Animated Bot Avatar */}
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-full flex items-center justify-center relative overflow-hidden">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FFD1] animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-[#00FFD1] animate-spin" style={{ animationDuration: '8s' }}></div>
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full border-2 border-black animate-ping"></div>
              </div>
              
              <div>
                <h3 className="font-bold text-black text-sm sm:text-lg flex items-center gap-1 sm:gap-2">
                  FuturoX AI
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" style={{ animationDuration: '3s' }} />
                </h3>
                <p className="text-[10px] sm:text-xs text-black/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="text-black hover:text-black/70 transition-all hover:rotate-90 duration-300 relative z-10"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Messages Area with subtle grid pattern */}
          <div 
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 relative"
            style={{
              background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
              backgroundImage: `
                linear-gradient(rgba(0, 255, 209, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 209, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 sm:gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                style={{
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                {/* Avatar with glow */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 relative ${
                  message.sender === 'bot' 
                    ? 'bg-gradient-to-br from-[#00FFD1] to-[#00D4AA]' 
                    : 'bg-gradient-to-br from-[#4D4D4D] to-[#2a2a2a]'
                }`}>
                  {message.sender === 'bot' ? (
                    <>
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                      <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[#00FFD1]"></div>
                    </>
                  ) : (
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble with gradient and glow */}
                <div className={`max-w-[80%] p-3 sm:p-4 backdrop-blur-sm relative ${
                  message.sender === 'bot'
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[rgba(0,255,209,0.3)]'
                    : 'bg-gradient-to-br from-[#00FFD1] to-[#00D4AA] text-black'
                } rounded-2xl shadow-lg`}
                style={{
                  ...(message.sender === 'bot' && {
                    boxShadow: '0 4px 20px rgba(0, 255, 209, 0.15)'
                  })
                }}>
                  {message.sender === 'bot' && (
                    <div className="absolute -left-1 top-4 w-2 h-2 bg-[#00FFD1] rounded-full animate-pulse"></div>
                  )}
                  
                  <p className={`text-xs sm:text-sm whitespace-pre-line leading-relaxed ${
                    message.sender === 'bot' ? 'text-white' : 'text-black font-medium'
                  }`}>
                    {message.text}
                  </p>
                  
                  <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 flex items-center gap-1 ${
                    message.sender === 'bot' ? 'text-[#4D4D4D]' : 'text-black/60'
                  }`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator - Enhanced */}
            {isTyping && (
              <div className="flex gap-2 sm:gap-3" style={{ animation: 'slideIn 0.3s ease-out' }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#00FFD1] to-[#00D4AA] flex items-center justify-center relative">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[#00FFD1]"></div>
                </div>
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[rgba(0,255,209,0.3)] p-3 sm:p-4 rounded-2xl shadow-lg">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#00FFD1] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#00FFD1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#00FFD1] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies - Enhanced */}
          {messages.length <= 1 && !isTyping && (
            <div className="px-3 sm:px-5 py-2 sm:py-3 bg-[#0a0a0a] border-t border-[rgba(0,255,209,0.1)]">
              <p className="text-[10px] sm:text-xs text-[#00FFD1] mb-2 sm:mb-3 flex items-center gap-2 font-semibold">
                <Sparkles className="w-3 h-3" />
                Quick questions:
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {quickReplies.slice(0, 3).map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="text-[10px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[rgba(0,255,209,0.1)] to-[rgba(0,255,209,0.05)] text-[#00FFD1] border border-[rgba(0,255,209,0.3)] hover:bg-gradient-to-r hover:from-[rgba(0,255,209,0.2)] hover:to-[rgba(0,255,209,0.1)] transition-all duration-300 rounded-full font-medium"
                    style={{
                      animation: `slideUp 0.3s ease-out ${index * 0.1}s backwards`
                    }}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Support CTA - Animated */}
          <div className="px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-[rgba(0,255,209,0.05)] to-[rgba(0,255,209,0.1)] border-t border-[rgba(0,255,209,0.2)]">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Animated bot pointing to email */}
              <div className="relative hidden sm:block">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#00FFD1] to-[#00D4AA] rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </div>
                {/* Pointing arrow animation */}
                <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                  <div className="text-[#00FFD1] animate-bounce" style={{ animationDuration: '1.5s' }}>
                    →
                  </div>
                </div>
              </div>
              
              <a 
                href="mailto:support@futuroxai.com"
                className="flex-1 flex items-center gap-2 text-[10px] sm:text-xs text-white hover:text-[#00FFD1] transition-colors group"
              >
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 group-hover:animate-pulse" />
                <div>
                  <p className="font-semibold">Need help?</p>
                  <p className="text-[#00FFD1]">support@futuroxai.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* Input Area - Futuristic */}
          <div className="p-3 sm:p-5 bg-[#0a0a0a] border-t border-[rgba(0,255,209,0.2)]">
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question..."
                  className="bg-black/50 border-[rgba(0,255,209,0.3)] text-white placeholder:text-[#4D4D4D] focus:border-[#00FFD1] pr-10 sm:pr-12 h-10 sm:h-12 rounded-full backdrop-blur-sm text-sm"
                  style={{
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                  }}
                />
                {inputValue && (
                  <Sparkles className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-[#00FFD1] animate-spin" style={{ animationDuration: '3s' }} />
                )}
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-[#00FFD1] to-[#00D4AA] hover:from-[#00E5BD] hover:to-[#00C4AA] text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center p-0 shadow-lg hover:shadow-xl transition-all duration-300"
                style={{
                  boxShadow: '0 4px 20px rgba(0, 255, 209, 0.3)'
                }}
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

