import React, { useState, useEffect, useRef } from 'react';
import { Send, Cpu, Loader2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const API_URL = 'http://localhost:3001';

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <CopyToClipboard text={value} onCopy={handleCopy}>
        <button className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600">
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </CopyToClipboard>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: '1em 0',
          borderRadius: '0.5em',
          padding: '1em',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

const TotaUI = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_URL}/models`);
      const data = await response.json();
      setModels(data.models);
      if (data.models.length > 0) {
        setSelectedModel(data.models[0].name);
      }
    } catch (err) {
      setError('Failed to fetch models. Make sure the server is running.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, prompt: input }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantMessage }
        ]);
      }
    } catch (err) {
      setError('Failed to get a response. Check your connection and server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-source-code-pro">
      <header className="bg-gray-800 p-4 flex items-center justify-between shadow-md">
        <h1 className="text-2xl font-bold text-blue-400">TotaUI</h1>
        <div className="flex items-center space-x-2">
          <Cpu className="text-blue-400" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded-lg"
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-grow overflow-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`p-4 rounded-lg max-w-[70%] ${
                message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  className="prose prose-invert"
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <CodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, '')}
                          {...props}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 p-4 rounded-lg">
              <Loader2 className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {error && (
        <div className="bg-red-600 text-white p-4 m-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 bg-gray-800 shadow-md">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:opacity-50"
          >
            <Send />
          </button>
        </div>
      </form>
    </div>
  );
};

export default TotaUI;
