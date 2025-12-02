import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, X } from "lucide-react";
import axios from "axios";
import config from "../../config/config";

const FitnessChatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your fitness assistant. Ask me anything about workouts, nutrition, or fitness tips!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `http://localhost:4000/api/v1/fitness-chat`,
        { message: userMessage },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.data.response },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm your fitness assistant. Ask me anything about workouts, nutrition, or fitness tips!",
      },
    ]);
  };

  // Format bot message content with proper line breaks and structure
  const formatBotMessage = (content) => {
    // Clean up the content - remove extra bullet formatting
    let cleanContent = content
      .replace(/•\s*\n\s*\./g, '•') // Remove newline between • and .
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Convert **text** to bold
      .trim();

    // Split by double newlines or section breaks
    const sections = cleanContent.split(/\n\n+/);
    
    return (
      <div className="space-y-4">
        {sections.map((section, idx) => {
          const lines = section.split('\n').filter(line => line.trim());
          
          // Check if section is a heading (starts with ** or #)
          if (lines.length === 1 && (/^\*\*[^*]+\*\*/.test(lines[0]) || /^#+\s/.test(lines[0]))) {
            const text = lines[0]
              .replace(/^\*\*|\*\*$/g, '')
              .replace(/^#+\s/, '');
            return (
              <div key={idx} className="font-bold text-base text-indigo-300 mt-3">
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </div>
            );
          }
          
          // Check if all lines are bullet points
          const isList = lines.every(line => /^[•\-*]\s/.test(line.trim()));
          
          if (isList) {
            return (
              <ul key={idx} className="space-y-2 ml-2">
                {lines.map((item, i) => {
                  const cleanItem = item.replace(/^[•\-*]\s*\.?\s*/, '').trim();
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                      <span dangerouslySetInnerHTML={{ __html: cleanItem }} />
                    </li>
                  );
                })}
              </ul>
            );
          }
          
          // Regular paragraph
          return (
            <div key={idx} className="leading-relaxed space-y-1">
              {lines.map((line, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Fitness Chatbot</h1>
            <p className="text-sm text-white/80">Your AI Fitness Companion</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
          Clear Chat
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } animate-fadeIn`}
          >
            <div
              className={`flex items-start gap-3 max-w-2xl ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-green-500 to-green-600"
                    : "bg-gradient-to-br from-indigo-500 to-purple-600"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl shadow-lg ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-green-600 to-green-700"
                    : "bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600"
                }`}
              >
                {message.role === "user" ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                ) : (
                  <div className="text-sm">
                    {formatBotMessage(message.content)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex items-start gap-3 max-w-2xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about workouts, nutrition, fitness tips..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={isLoading}
            />
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Send
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Get personalized fitness advice, workout tips, and nutrition guidance
        </p>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FitnessChatbot;
