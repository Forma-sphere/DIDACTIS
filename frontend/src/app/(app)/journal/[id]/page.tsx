'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, Clock, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { JournalDay, Lesson, ClassItem, PaginatedResponse } from '@/types';

type LessonSlot = { lessonId: string; startTime: string; endTime: string };

export default function JournalDayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [journalDay, setJournalDay] = useState<JournalDay | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJournalDay = async () => {
    try {
      const { data } = await api.get<JournalDay>(`/journal/${id}`);
      setJournalDay(data);
    } catch {
      router.push('/journal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJournalDay(); }, [id]);

  if (loading || !journalDay) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const dateFormatted = new Date(journalDay.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/journal">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900 capitalize">{dateFormatted}</h1>
          <p className="text-sm text-gray-500">
            {journalDay.class?.name} · {journalDay.lessons.length} préparation{journalDay.lessons.length > 1 ? 's' : ''}
          </p>
        </div>
        <Badge variant="info">{journalDay.class?.name}</Badge>
      </div>

      <JournalDayInfoTab journalDay={journalDay} canWrite={canWrite} onUpdated={fetchJournalDay} />
    </div>
  );
}

function JournalDayInfoTab({ journalDay, canWrite, onUpdated }: { journalDay: JournalDay; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [form, setForm] = useState({
    classId: journalDay.classId,
    date: journalDay.date.substring(0, 10),
    notes: journalDay.notes || '',
    lessons: journalDay.lessons.map((l) => ({
      lessonId: l.lessonId, startTime: l.startTime, endTime: l.endTime,
    })),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      classId: journalDay.classId,
      date: journalDay.date.substring(0, 10),
      notes: journalDay.notes || '',
      lessons: journalDay.lessons.map((l) => ({
        lessonId: l.lessonId, startTime: l.startTime, endTime: l.endTime,
      })),
    });
    setEditing(false);
  }, [journalDay]);

  const startEdit = async () => {
    const [classRes, lessonRes] = await Promise.all([
      api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
      api.get<PaginatedResponse<Lesson>>('/lessons?limit=200'),
    ]);
    setClasses(classRes.data.data);
    setAllLessons(lessonRes.data.data);
    setEditing(true);
  };

  const addLessonSlot = () => {
    setForm((p) => ({
      ...p,
      lessons: [...p.lessons, { lessonId: '', startTime: '08:00', endTime: '09:00' }],
    }));
  };

  const removeLessonSlot = (idx: number) => {
    setForm((p) => ({ ...p, lessons: p.lessons.filter((_, i) => i !== idx) }));
  };

  const updateLessonSlot = (idx: number, field: keyof LessonSlot, value: string) => {
    setForm((p) => ({
      ...p,
      lessons: p.lessons.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
    setErrors((p) => ({ ...p, lessons: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.classId) errs.classId = 'La classe est requise';
    if (!form.date) errs.date = 'La date est requise';
    if (form.lessons.length === 0) errs.lessons = 'Au moins une préparation est requise';
    for (const l of form.lessons) {
      if (!l.lessonId) { errs.lessons = 'Sélectionnez toutes les préparations'; break; }
      if (!l.startTime || !l.endTime) { errs.lessons = 'Les horaires sont requis'; break; }
      if (l.startTime >= l.endTime) { errs.lessons = "L'heure de fin doit être postérieure à l'heure de début"; break; }
    }
    const ids = form.lessons.map((l) => l.lessonId).filter(Boolean);
    if (new Set(ids).size !== ids.length) errs.lessons = 'Une préparation ne peut apparaître qu\'une seule fois';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/journal/${journalDay.id}`, {
        classId: form.classId,
        date: form.date,
        notes: form.notes || undefined,
        lessons: form.lessons.map((l, i) => ({
          lessonId: l.lessonId,
          startTime: l.startTime,
          endTime: l.endTime,
          order: i,
        })),
      });
      setEditing(false);
      onUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary-900">Informations</h2>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ['Classe', journalDay.class?.name],
              ['Enseignant', journalDay.class?.teacher ? `${journalDay.class.teacher.firstName} ${journalDay.class.teacher.lastName}` : null],
              ['Date', new Date(journalDay.date).toLocaleDateString('fr-FR')],
              ['Préparations', `${journalDay.lessons.length} préparation${journalDay.lessons.length > 1 ? 's' : ''}`],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {journalDay.notes && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase text-gray-500">Notes</dt>
              <dd className="mt-1 text-sm text-primary-900 whitespace-pre-line">{journalDay.notes}</dd>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Programme de la journée ({journalDay.lessons.length})
          </h2>
          {journalDay.lessons.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune préparation planifiée.</p>
          ) : (
            <div className="space-y-2">
              {journalDay.lessons.map((jl) => (
                <div key={jl.lessonId} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-1 text-sm font-medium text-accent-700 min-w-[100px]">
                    <Clock className="h-3.5 w-3.5" />
                    {jl.startTime} - {jl.endTime}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-900">{jl.lesson.title}</p>
                    {jl.lesson.sequence && (
                      <p className="text-xs text-gray-500">{jl.lesson.sequence.title}</p>
                    )}
                  </div>
                  <Badge variant="default">{jl.lesson.duration} min</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const classOptions = [
    { value: '', label: 'Sélectionner' },
    ...classes.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name })),
  ];

  const lessonOptions = [
    { value: '', label: 'Sélectionner une préparation' },
    ...allLessons.filter((l) => !l.isArchived).map((l) => ({ value: l.id, label: `${l.title} (${l.duration} min)` })),
  ];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la journée</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Select id="classId" label="Classe" value={form.classId} onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }} options={classOptions} error={errors.classId} />

        <Input id="date" label="Date" type="date" value={form.date} onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); setErrors((p) => ({ ...p, date: '' })); }} error={errors.date} />

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-primary-900">Notes</label>
          <textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-primary-900">Préparations</label>
            <Button type="button" variant="outline" size="sm" onClick={addLessonSlot}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </div>
          {errors.lessons && <p className="mb-2 text-xs text-red-600">{errors.lessons}</p>}
          {form.lessons.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Aucune préparation ajoutée</p>
          ) : (
            <div className="space-y-2">
              {form.lessons.map((slot, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2">
                  <div className="flex-1">
                    <Select
                      id={`lesson-${idx}`}
                      value={slot.lessonId}
                      onChange={(e) => updateLessonSlot(idx, 'lessonId', e.target.value)}
                      options={lessonOptions}
                    />
                  </div>
                  <div className="w-24">
                    <input type="time" value={slot.startTime} onChange={(e) => updateLessonSlot(idx, 'startTime', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
                  </div>
                  <div className="w-24">
                    <input type="time" value={slot.endTime} onChange={(e) => updateLessonSlot(idx, 'endTime', e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
                  </div>
                  <button type="button" onClick={() => removeLessonSlot(idx)} className="mt-2 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
