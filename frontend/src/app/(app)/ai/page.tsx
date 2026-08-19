'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  Plus, Send, Trash2, Search, MessageSquare, History, Settings,
  ChevronLeft, ChevronRight, Sparkles, User as UserIcon, Bot,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { Conversation, ConversationListItem, Message, PaginatedResponse } from '@/types';

const tabs = [
  { key: 'chat', label: 'Assistant', icon: MessageSquare },
  { key: 'history', label: 'Historique', icon: History },
  { key: 'settings', label: 'Paramètres', icon: Settings },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function AiPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canDelete = currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Assistant IA</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-accent-700'
                  : 'border-transparent text-gray-500 hover:text-primary-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'chat' && <ChatTab canCreate={canCreate} />}
      {activeTab === 'history' && <HistoryTab canDelete={canDelete} />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function ChatTab({ canCreate }: { canCreate: boolean }) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get<PaginatedResponse<ConversationListItem>>('/ai/conversations?limit=50');
      setConversations(data.data);
    } finally {
      setLoadingConv(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const { data } = await api.get<Conversation>(`/ai/conversations/${id}`);
      setActiveConversation(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleNewConversation = async () => {
    try {
      const { data } = await api.post<Conversation>('/ai/conversations', {
        title: 'Nouvelle conversation',
      });
      setActiveConversation(data);
      fetchConversations();
    } catch {
      // ignore
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeConversation || sending) return;

    const userMsg = message.trim();
    setMessage('');
    setSending(true);

    setActiveConversation((prev) => prev ? {
      ...prev,
      messages: [...prev.messages, {
        id: 'temp-user', conversationId: prev.id, role: 'USER', content: userMsg, createdAt: new Date().toISOString(),
      }],
    } : null);

    try {
      const { data } = await api.post<{ userMessage: Message; assistantMessage: Message }>('/ai/chat', {
        conversationId: activeConversation.id,
        message: userMsg,
      });

      setActiveConversation((prev) => {
        if (!prev) return null;
        const msgs = prev.messages.filter((m) => m.id !== 'temp-user');
        return { ...prev, messages: [...msgs, data.userMessage, data.assistantMessage] };
      });

      fetchConversations();
    } catch {
      setActiveConversation((prev) => prev ? {
        ...prev,
        messages: prev.messages.filter((m) => m.id !== 'temp-user'),
      } : null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 240px)' }}>
      <div className="w-72 shrink-0 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            {canCreate && (
              <Button onClick={handleNewConversation} className="w-full" size="sm">
                <Plus className="h-4 w-4" />
                Nouvelle conversation
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-200 border-t-accent-500" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-xs text-gray-400 text-center">Aucune conversation</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    activeConversation?.id === conv.id ? 'bg-accent-50 text-accent-700' : 'text-primary-900'
                  }`}
                >
                  <div className="font-medium truncate">{conv.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(conv.updatedAt).toLocaleDateString('fr-FR')}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Sparkles className="h-16 w-16 text-accent-300 mb-4" />
              <h2 className="text-xl font-semibold text-primary-900 mb-2">Assistant pédagogique</h2>
              <p className="text-sm text-gray-500 max-w-md">
                Commencez une nouvelle conversation pour obtenir de l&apos;aide sur vos préparations,
                séquences, évaluations ou tout autre aspect de votre enseignement.
              </p>
              {canCreate && (
                <Button onClick={handleNewConversation} className="mt-6">
                  <Plus className="h-4 w-4" />
                  Nouvelle conversation
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-medium text-primary-900 truncate">{activeConversation.title}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConversation.messages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Envoyez un message pour commencer la conversation.</p>
                  </div>
                )}
                {activeConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'ASSISTANT' && (
                      <div className="shrink-0 h-8 w-8 rounded-full bg-accent-100 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-accent-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                        msg.role === 'USER'
                          ? 'bg-accent-500 text-white'
                          : 'bg-gray-100 text-primary-900'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>
                      <div className={`text-xs mt-1 ${msg.role === 'USER' ? 'text-accent-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {msg.role === 'USER' && (
                      <div className="shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary-600" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {canCreate && (
                <form onSubmit={handleSend} className="p-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Écrivez votre message..."
                      disabled={sending}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
                    />
                    <Button type="submit" disabled={sending || !message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function HistoryTab({ canDelete }: { canDelete: boolean }) {
  const [result, setResult] = useState<PaginatedResponse<ConversationListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<ConversationListItem>>(`/ai/conversations?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [search, page]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/ai/conversations/${id}`);
      fetchHistory();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const conversations = result?.data || [];

  return (
    <Card>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      {conversations.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          {result?.total === 0 ? 'Aucune conversation.' : 'Aucun résultat.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Dernier message</th>
                <th className="px-4 py-3">Date de création</th>
                {canDelete && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((conv) => {
                const lastMsg = conv.messages?.[0];
                return (
                  <tr key={conv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{conv.title}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {lastMsg ? lastMsg.content.slice(0, 60) + (lastMsg.content.length > 60 ? '...' : '') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(conv.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(conv.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">{result.total} conversation{result.total > 1 ? 's' : ''} au total</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">Page {result.page} / {result.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Configuration du modèle</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Modèle utilisé</dt>
            <dd className="mt-1 text-sm text-primary-900">Assistant pédagogique Didactys</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Température</dt>
            <dd className="mt-1 text-sm text-primary-900">0.7</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Longueur maximale de réponse</dt>
            <dd className="mt-1 text-sm text-primary-900">2048 tokens</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Statut</dt>
            <dd className="mt-1">
              <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Actif</span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Capacités</h2>
        <ul className="space-y-2 text-sm text-primary-900">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Aide à la préparation de séances
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Conseils sur les séquences pédagogiques
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Suggestions pour les progressions
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Accompagnement à l&apos;évaluation
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Conseils en différenciation pédagogique
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Limitations</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            L&apos;IA ne modifie pas directement les données métier
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Les réponses sont des suggestions, pas des prescriptions
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            La génération automatique de préparations n&apos;est pas disponible
          </li>
        </ul>
      </Card>
    </div>
  );
}
