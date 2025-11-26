import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, User, Clock, Wrench, Send, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster, toast } from 'sonner';
import { chatService, formatTime, renderToolCall, generateSessionTitle } from '@/lib/chat';
import type { ChatState, SessionInfo } from '~/worker/types';
import { AgentHeader } from '@/components/AgentHeader';
import { Skeleton } from '@/components/ui/skeleton';
export function RoomView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    sessionId: sessionId || '',
    isProcessing: false,
    model: 'google-ai-studio/gemini-2.5-flash',
    streamingMessage: '',
  });
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [chatState.messages, chatState.streamingMessage]);
  const loadSession = useCallback(async (id: string) => {
    setIsLoading(true);
    chatService.switchSession(id);
    try {
      const res = await chatService.getMessages();
      if (res.success && res.data) {
        setChatState(res.data);
        const sessionsRes = await chatService.listSessions();
        if (sessionsRes.success && sessionsRes.data) {
          const currentSession = sessionsRes.data.find(s => s.id === id);
          setSessionInfo(currentSession || null);
        }
      } else {
        toast.error('Failed to load session. Redirecting...');
        navigate('/');
      }
    } catch (error) {
      toast.error('An error occurred while loading the session.');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      navigate('/');
    }
  }, [sessionId, loadSession, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatState.isProcessing) return;
    const message = input.trim();
    setInput('');
    const userMessage = { id: crypto.randomUUID(), role: 'user' as const, content: message, timestamp: Date.now() };
    setChatState(prev => ({ ...prev, messages: [...prev.messages, userMessage], isProcessing: true, streamingMessage: '' }));
    // Auto-save session title if it's a new chat
    if (chatState.messages.length === 0) {
      const title = generateSessionTitle(message);
      await chatService.updateSessionTitle(chatState.sessionId, title);
      setSessionInfo(prev => prev ? { ...prev, title } : null);
    }
    await chatService.sendMessage(message, chatState.model, (chunk) => {
      setChatState(prev => ({ ...prev, streamingMessage: (prev.streamingMessage || '') + chunk }));
    });
    // After streaming, reload the full state
    if (sessionId) {
      const res = await chatService.getMessages();
      if (res.success && res.data) {
        setChatState(res.data);
      }
    }
  };
  const handleModelChange = async (model: string) => {
    setChatState(prev => ({ ...prev, model }));
    await chatService.updateModel(model);
    toast.success(`Model updated to ${model}`);
  };
  const handleNewChat = async () => {
    const res = await chatService.createSession();
    if (res.success && res.data) {
      navigate(`/rooms/${res.data.sessionId}`);
    } else {
      toast.error('Failed to create new chat.');
    }
  };
  const handleClearChat = async () => {
    await chatService.clearMessages();
    if (sessionId) loadSession(sessionId);
  };
  return (
    <div className="h-screen flex flex-col bg-background">
      <AgentHeader
        session={sessionInfo}
        currentModel={chatState.model}
        onModelChange={handleModelChange}
        onNewChat={handleNewChat}
        onClearChat={handleClearChat}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Card className="flex-1 flex flex-col rounded-none border-0 border-t">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4 sm:p-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-16 w-3/4 ml-auto" />
                  <Skeleton className="h-24 w-1/2" />
                </div>
              ) : chatState.messages.length === 0 && !chatState.isProcessing ? (
                <div className="text-center text-muted-foreground py-8 h-full center-col">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start the conversation by sending a message.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {chatState.messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && <Bot className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />}
                      <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="whitespace-pre-wrap text-pretty">{msg.content}</p>
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-current/20 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs opacity-80">
                              <Wrench className="w-3 h-3" /> Tools Used:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.toolCalls.map((tool, idx) => (
                                <Badge key={idx} variant={tool.result && 'error' in (tool.result as object) ? 'destructive' : 'secondary'}>
                                  {renderToolCall(tool)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-xs opacity-70 mt-2 text-right flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(msg.timestamp)}
                        </div>
                      </div>
                      {msg.role === 'user' && <User className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />}
                    </motion.div>
                  ))}
                  {chatState.streamingMessage && (
                    <div className="flex gap-3 justify-start">
                      <Bot className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="max-w-xl p-3 rounded-2xl bg-muted">
                        <p className="whitespace-pre-wrap text-pretty">{chatState.streamingMessage}<span className="animate-pulse">|</span></p>
                      </div>
                    </div>
                  )}
                  {chatState.isProcessing && !chatState.streamingMessage && (
                    <div className="flex gap-3 justify-start">
                      <Bot className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="max-w-xl p-3 rounded-2xl bg-muted center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>
          <div className="p-4 border-t bg-card">
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                placeholder="Ask the agent anything..."
                className="w-full pr-12 resize-none"
                rows={1}
                disabled={chatState.isProcessing}
              />
              <Button type="submit" size="icon" className="absolute right-2 bottom-1.5" disabled={!input.trim() || chatState.isProcessing}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-2">
              AI usage has a cross-app rate limit; request volume may be limited.
            </p>
          </div>
        </Card>
      </main>
      <Toaster richColors />
    </div>
  );
}