'use client';

import * as React from 'react';
import { Send, Bot, User, ExternalLink } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    slug: string;
    type: string;
  }>;
}

export function AIChat() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage }),
      });

      const data = await response.json();

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'क्षमस्व, एकत्रिकरणाच्या वेळी त्रुटी आढळली.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-card rounded-lg border border-saffron/10 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-2 text-saffron" />
            <p>भक्ती साहित्यातील प्रश्न विचारा.</p>
            <p className="text-sm mt-1">उदा: "तुकाराम महाराजांचे अभंग", "विठ्ठलासाठी आरती"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-saffron/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-saffron" />
              </div>
            )}

            <div
              className={`max-w-xs sm:max-w-md rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-saffron text-white'
                  : 'bg-background border border-saffron/10'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {msg.content}
              </p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-saffron/20">
                  <p className="text-xs font-medium mb-1">स्रोत:</p>
                  <div className="space-y-1">
                    {msg.sources.map((source) => (
                      <a
                        key={source.slug}
                        href={`/abhang/${source.slug}`}
                        className="flex items-center gap-1 text-xs hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gold" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="भक्ती साहित्यातील प्रश्न विचारा..."
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-saffron text-white hover:bg-saffron/90 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}