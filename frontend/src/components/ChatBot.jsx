import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { findAnswer, getGreeting, getQuickReplies } from '../utils/chatKnowledge';

export const ChatBot = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Send greeting when chat opens
    if (isOpen && messages.length === 0) {
      const greeting = getGreeting(i18n.language);
      setMessages([{
        id: Date.now(),
        text: greeting,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

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

    // Simulate bot thinking
    setTimeout(() => {
      const answer = findAnswer(text, i18n.language);
      const botMessage = {
        id: Date.now() + 1,
        text: answer,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
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

  const quickReplies = getQuickReplies(i18n.language);

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-[#00FFD1] hover:bg-[#00E5BD] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 z-50 group"
          style={{ animation: 'pulse 2s infinite' }}
        >
          <MessageCircle className="w-7 h-7 text-black" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] bg-[#121212] border border-[rgba(0,255,209,0.3)] shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#00FFD1] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#00FFD1]" />
              </div>
              <div>
                <h3 className="font-bold text-black">FuturoX AI Assistant</h3>
                <p className="text-xs text-black/70">Online • Instant replies</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-black hover:text-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'bot' 
                    ? 'bg-[rgba(0,255,209,0.1)]' 
                    : 'bg-[rgba(255,255,255,0.1)]'
                }`}>
                  {message.sender === 'bot' ? (
                    <Bot className="w-4 h-4 text-[#00FFD1]" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[70%] ${
                  message.sender === 'bot'
                    ? 'bg-[#1a1a1a] border border-[rgba(0,255,209,0.2)]'
                    : 'bg-[#00FFD1] text-black'
                } p-3 rounded-lg`}>
                  <p className={`text-sm whitespace-pre-line ${
                    message.sender === 'bot' ? 'text-white' : 'text-black'
                  }`}>
                    {message.text}
                  </p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'bot' ? 'text-[#4D4D4D]' : 'text-black/60'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[rgba(0,255,209,0.1)] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#00FFD1]" />
                </div>
                <div className="bg-[#1a1a1a] border border-[rgba(0,255,209,0.2)] p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#00FFD1] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#00FFD1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-[#00FFD1] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 1 && !isTyping && (
            <div className="p-3 bg-[#121212] border-t border-[rgba(255,255,255,0.1)]">
              <p className="text-xs text-[#4D4D4D] mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.slice(0, 3).map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="text-xs px-3 py-1.5 bg-[rgba(0,255,209,0.1)] text-[#00FFD1] border border-[rgba(0,255,209,0.3)] hover:bg-[rgba(0,255,209,0.2)] transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-[#121212] border-t border-[rgba(255,255,255,0.1)]">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                className="flex-1 bg-black border-[rgba(255,255,255,0.2)] text-white placeholder:text-[#4D4D4D] focus:border-[#00FFD1]"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                className="bg-[#00FFD1] hover:bg-[#00E5BD] text-black px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-[#4D4D4D] mt-2 text-center">
              Powered by FuturoX AI • support@futuroxai.com
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(0, 255, 209, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(0, 255, 209, 0);
          }
        }
      `}</style>
    </>
  );
};
