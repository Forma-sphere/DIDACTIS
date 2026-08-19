'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, X, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { JournalDay, Lesson, ClassItem, PaginatedResponse } from '@/types';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type LessonSlot = { lessonId: string; startTime: string; endTime: string };

type FormData = {
  classId: string; date: string; notes: string;
  lessons: LessonSlot[];
};

const emptyForm: FormData = {
  classId: '', date: '', notes: '', lessons: [],
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function JournalPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canDelete = currentUser?.role === 'ADMIN';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [journalDays, setJournalDays] = useState<JournalDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [filterClassId, setFilterClassId] = useState('');

  const [selectedDay, setSelectedDay] = useState<JournalDay | null>(null);
  const [showDayView, setShowDayView] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<JournalDay | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchJournal = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('year', String(year));
      params.set('month', String(month + 1));
      params.set('limit', '100');
      if (filterClassId) params.set('classId', filterClassId);
      const { data } = await api.get<PaginatedResponse<JournalDay>>(`/journal?${params}`);
      setJournalDays(data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [classRes, lessonRes] = await Promise.all([
        api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
        api.get<PaginatedResponse<Lesson>>('/lessons?limit=200'),
      ]);
      setClasses(classRes.data.data);
      setAllLessons(lessonRes.data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchReferenceData(); }, []);
  useEffect(() => { fetchJournal(); }, [year, month, filterClassId]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const dayHasEntries = (dayNum: number): JournalDay | undefined => {
    const dateStr = formatDate(new Date(year, month, dayNum));
    return journalDays.find((jd) => jd.date.startsWith(dateStr));
  };

  const openDayView = (jd: JournalDay) => {
    setSelectedDay(jd);
    setShowDayView(true);
  };

  const classFilterOptions = [
    { value: '', label: 'Toutes les classes' },
    ...classes.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name })),
  ];

  const classFormOptions = [
    { value: '', label: 'Sélectionner une classe' },
    ...classes.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name })),
  ];

  const availableLessons = allLessons.filter((l) => !l.isArchived);

  const openCreate = (dateStr?: string) => {
    setEditingDay(null);
    setForm({ ...emptyForm, date: dateStr || formatDate(new Date()) });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (jd: JournalDay) => {
    setEditingDay(jd);
    setForm({
      classId: jd.classId,
      date: jd.date.substring(0, 10),
      notes: jd.notes || '',
      lessons: jd.lessons.map((l) => ({
        lessonId: l.lessonId,
        startTime: l.startTime,
        endTime: l.endTime,
      })),
    });
    setErrors({});
    setServerError('');
    setShowDayView(false);
    setModalOpen(true);
  };

  const addLessonSlot = () => {
    setForm((p) => ({
      ...p,
      lessons: [...p.lessons, { lessonId: '', startTime: '08:00', endTime: '09:00' }],
    }));
  };

  const removeLessonSlot = (idx: number) => {
    setForm((p) => ({
      ...p,
      lessons: p.lessons.filter((_, i) => i !== idx),
    }));
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
    for (let i = 0; i < form.lessons.length; i++) {
      const l = form.lessons[i];
      if (!l.lessonId) { errs.lessons = 'Sélectionnez toutes les préparations'; break; }
      if (!l.startTime) { errs.lessons = "L'heure de début est requise"; break; }
      if (!l.endTime) { errs.lessons = "L'heure de fin est requise"; break; }
      if (l.startTime >= l.endTime) { errs.lessons = "L'heure de fin doit être postérieure à l'heure de début"; break; }
    }
    const lessonIds = form.lessons.map((l) => l.lessonId).filter(Boolean);
    if (new Set(lessonIds).size !== lessonIds.length) {
      errs.lessons = 'Une préparation ne peut apparaître qu\'une seule fois';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        classId: form.classId,
        date: form.date,
        notes: form.notes || undefined,
        lessons: form.lessons.map((l, i) => ({
          lessonId: l.lessonId,
          startTime: l.startTime,
          endTime: l.endTime,
          order: i,
        })),
      };
      if (editingDay) {
        await api.patch(`/journal/${editingDay.id}`, payload);
      } else {
        await api.post('/journal', payload);
      }
      setModalOpen(false);
      fetchJournal();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (jd: JournalDay) => {
    try {
      await api.delete(`/journal/${jd.id}`);
      setShowDayView(false);
      fetchJournal();
    } catch {
      // ignore
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const lessonOptions = [
    { value: '', label: 'Sélectionner une préparation' },
    ...availableLessons.map((l) => ({ value: l.id, label: `${l.title} (${l.duration} min)` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Cahier-journal</h1>
        {canWrite && (
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Nouvelle journée
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <Select
              id="filterClass"
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              options={classFilterOptions}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-primary-900">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {DAYS.map((d) => (
              <div key={d} className="bg-gray-50 px-2 py-2 text-center text-xs font-medium uppercase text-gray-500">
                {d}
              </div>
            ))}
            {calendarCells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="bg-white min-h-[80px]" />;
              }
              const entry = dayHasEntries(dayNum);
              const isToday =
                dayNum === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              return (
                <div
                  key={dayNum}
                  className={`bg-white min-h-[80px] p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'ring-2 ring-inset ring-accent-500' : ''
                  }`}
                  onClick={() => {
                    if (entry) openDayView(entry);
                    else if (canWrite) openCreate(formatDate(new Date(year, month, dayNum)));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isToday ? 'font-bold text-accent-700' : 'text-primary-900'}`}>
                      {dayNum}
                    </span>
                  </div>
                  {entry && (
                    <div className="mt-1 space-y-0.5">
                      {entry.lessons.slice(0, 3).map((jl) => (
                        <div
                          key={jl.lessonId}
                          className="truncate rounded bg-accent-50 px-1 py-0.5 text-[10px] text-accent-700"
                        >
                          {jl.startTime} {jl.lesson.title}
                        </div>
                      ))}
                      {entry.lessons.length > 3 && (
                        <div className="text-[10px] text-gray-400 px-1">
                          +{entry.lessons.length - 3} autre{entry.lessons.length - 3 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Vue Journée */}
      <Modal
        open={showDayView}
        onClose={() => setShowDayView(false)}
        title={selectedDay ? `Journée du ${new Date(selectedDay.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Journée'}
      >
        {selectedDay && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="info">{selectedDay.class?.name}</Badge>
              <span className="text-sm text-gray-500">
                {selectedDay.lessons.length} préparation{selectedDay.lessons.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {selectedDay.lessons.map((jl) => (
                <div key={jl.lessonId} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-1 text-sm font-medium text-accent-700">
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

            {selectedDay.notes && (
              <div>
                <h4 className="text-xs font-medium uppercase text-gray-500 mb-1">Notes</h4>
                <p className="text-sm text-primary-900 whitespace-pre-line">{selectedDay.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {canDelete && (
                <Button variant="outline" size="sm" onClick={() => handleDelete(selectedDay)}>
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              )}
              {canWrite && (
                <Button size="sm" onClick={() => openEdit(selectedDay)}>
                  Modifier
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Création / Modification */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDay ? 'Modifier la journée' : 'Nouvelle journée'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Select
            id="classId"
            label="Classe"
            value={form.classId}
            onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }}
            options={classFormOptions}
            error={errors.classId}
          />

          <Input
            id="date"
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); setErrors((p) => ({ ...p, date: '' })); }}
            error={errors.date}
          />

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-primary-900">Notes</label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
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
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateLessonSlot(idx, 'startTime', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateLessonSlot(idx, 'endTime', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLessonSlot(idx)}
                      className="mt-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingDay ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
