'use client';

import { useState, useEffect } from 'react';
import {
  Search, Download, Trash2, ChevronLeft, ChevronRight, FileText, FileDown, FileUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type {
  DocumentItem, DocumentType as DocType, SourceModule,
  Lesson, Sequence, Progression, JournalDay, Assessment,
  PaginatedResponse,
} from '@/types';

const typeLabels: Record<DocType, string> = { PDF: 'PDF', WORD: 'Word' };
const typeBadgeVariant: Record<DocType, 'info' | 'success' | 'warning' | 'default'> = {
  PDF: 'info', WORD: 'success',
};

const moduleLabels: Record<SourceModule, string> = {
  LESSON: 'Préparation', SEQUENCE: 'Séquence', PROGRESSION: 'Progression',
  JOURNAL: 'Cahier-journal', ASSESSMENT: 'Évaluation',
};

const SOURCE_MODULES: { value: SourceModule; label: string }[] = [
  { value: 'LESSON', label: 'Préparation' },
  { value: 'SEQUENCE', label: 'Séquence' },
  { value: 'PROGRESSION', label: 'Progression' },
  { value: 'JOURNAL', label: 'Cahier-journal' },
  { value: 'ASSESSMENT', label: 'Évaluation' },
];

function getFileUrl(filePath: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const base = apiBase.replace('/api/v1', '');
  return `${base}/${filePath.replace(/^\.\//, '')}`;
}

export default function DocumentsPage() {
  const { user: currentUser } = useAuth();
  const canGenerate = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canDelete = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<DocumentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [page, setPage] = useState(1);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [genModule, setGenModule] = useState<SourceModule | ''>('');
  const [genSourceId, setGenSourceId] = useState('');
  const [genType, setGenType] = useState<DocType | ''>('');
  const [sourceItems, setSourceItems] = useState<{ id: string; label: string }[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genErrors, setGenErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterModule) params.set('sourceModule', filterModule);
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<DocumentItem>>(`/documents?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [search, filterType, filterModule, page]);

  const typeFilterOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'PDF', label: 'PDF' },
    { value: 'WORD', label: 'Word' },
  ];

  const moduleFilterOptions = [
    { value: '', label: 'Tous les modules' },
    ...SOURCE_MODULES.map((m) => ({ value: m.value, label: m.label })),
  ];

  const fetchSourceItems = async (module: SourceModule) => {
    setLoadingSource(true);
    setSourceItems([]);
    setGenSourceId('');
    try {
      switch (module) {
        case 'LESSON': {
          const { data } = await api.get<PaginatedResponse<Lesson>>('/lessons?limit=200');
          setSourceItems(data.data.filter((l) => !l.isArchived).map((l) => ({ id: l.id, label: l.title })));
          break;
        }
        case 'SEQUENCE': {
          const { data } = await api.get<PaginatedResponse<Sequence>>('/sequences?limit=200');
          setSourceItems(data.data.filter((s) => !s.isArchived).map((s) => ({ id: s.id, label: s.title })));
          break;
        }
        case 'PROGRESSION': {
          const { data } = await api.get<PaginatedResponse<Progression>>('/progressions?limit=200');
          setSourceItems(data.data.filter((p) => !p.isArchived).map((p) => ({ id: p.id, label: p.title })));
          break;
        }
        case 'JOURNAL': {
          const { data } = await api.get<PaginatedResponse<JournalDay>>('/journal?limit=200');
          setSourceItems(data.data.map((j) => ({
            id: j.id,
            label: `${j.class?.name || '—'} — ${new Date(j.date).toLocaleDateString('fr-FR')}`,
          })));
          break;
        }
        case 'ASSESSMENT': {
          const { data } = await api.get<PaginatedResponse<Assessment>>('/assessments?limit=200');
          setSourceItems(data.data.filter((a) => !a.isArchived).map((a) => ({ id: a.id, label: a.title })));
          break;
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingSource(false);
    }
  };

  const openGenerate = () => {
    setGenModule('');
    setGenSourceId('');
    setGenType('');
    setSourceItems([]);
    setGenErrors({});
    setServerError('');
    setGenerateOpen(true);
  };

  const handleModuleChange = (value: string) => {
    setGenModule(value as SourceModule);
    setGenErrors((p) => ({ ...p, module: '' }));
    if (value) {
      fetchSourceItems(value as SourceModule);
    } else {
      setSourceItems([]);
      setGenSourceId('');
    }
  };

  const validateGenerate = () => {
    const errs: Record<string, string> = {};
    if (!genModule) errs.module = 'Le module est requis';
    if (!genSourceId) errs.sourceId = 'La source est requise';
    if (!genType) errs.type = 'Le format est requis';
    setGenErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = async () => {
    setServerError('');
    if (!validateGenerate()) return;

    setGenerating(true);
    try {
      await api.post('/documents/generate', {
        sourceModule: genModule,
        sourceId: genSourceId,
        type: genType,
      });
      setGenerateOpen(false);
      fetchDocuments();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      await api.delete(`/documents/${doc.id}`);
      fetchDocuments();
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

  const documents = result?.data || [];

  const moduleFormOptions = [
    { value: '', label: 'Sélectionner un module' },
    ...SOURCE_MODULES.map((m) => ({ value: m.value, label: m.label })),
  ];

  const sourceFormOptions = [
    { value: '', label: loadingSource ? 'Chargement...' : 'Sélectionner une source' },
    ...sourceItems.map((s) => ({ value: s.id, label: s.label })),
  ];

  const typeFormOptions = [
    { value: '', label: 'Sélectionner un format' },
    { value: 'PDF', label: 'PDF' },
    { value: 'WORD', label: 'Word (.docx)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Documents</h1>
        {canGenerate && (
          <Button onClick={openGenerate}>
            <FileUp className="h-4 w-4" />
            Générer un document
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="min-w-[140px]">
            <Select
              id="filterType"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              options={typeFilterOptions}
            />
          </div>
          <div className="min-w-[180px]">
            <Select
              id="filterModule"
              value={filterModule}
              onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
              options={moduleFilterOptions}
            />
          </div>
        </div>

        {documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucun document généré.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Auteur</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        {doc.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={typeBadgeVariant[doc.type]}>{typeLabels[doc.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {moduleLabels[doc.sourceModule]}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {doc.createdBy.firstName} {doc.createdBy.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a href={getFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                        </a>
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">{result.total} document{result.total > 1 ? 's' : ''} au total</p>
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

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Générer un document"
      >
        <div className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Select
            id="genModule"
            label="Module source"
            value={genModule}
            onChange={(e) => handleModuleChange(e.target.value)}
            options={moduleFormOptions}
            error={genErrors.module}
          />

          <Select
            id="genSourceId"
            label="Source"
            value={genSourceId}
            onChange={(e) => { setGenSourceId(e.target.value); setGenErrors((p) => ({ ...p, sourceId: '' })); }}
            options={sourceFormOptions}
            error={genErrors.sourceId}
          />

          <Select
            id="genType"
            label="Format"
            value={genType}
            onChange={(e) => { setGenType(e.target.value as DocType); setGenErrors((p) => ({ ...p, type: '' })); }}
            options={typeFormOptions}
            error={genErrors.type}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Annuler</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              <FileDown className="h-4 w-4" />
              {generating ? 'Génération...' : 'Générer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
