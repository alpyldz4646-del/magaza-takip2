import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccess } from "@/components/access-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FOCUS_AREAS, VISIT_QUESTIONS, VISIT_TYPES } from "@/lib/catalog";
import { todayISO } from "@/lib/format";
import { addVisit, getStoreOptions, getVisitQuestions, updateVisitQuestions } from "@/lib/server/hr";
import type { VisitQuestion } from "@/lib/types";

type PersonDraft = { name: string; position: string; notes: string };

const emptyPerson = (): PersonDraft => ({ name: "", position: "", notes: "" });

function newQuestionId() {
  return `n${Math.random().toString(36).slice(2, 8)}`;
}

export function VisitDialog({
  open,
  onOpenChange,
  regionId,
  storeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionId?: number;
  storeId?: number;
}) {
  const queryClient = useQueryClient();
  const options = useQuery({
    queryKey: ["store-options"],
    queryFn: () => getStoreOptions(),
    enabled: open,
  });

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [visitDate, setVisitDate] = useState(todayISO());
  const [visitType, setVisitType] = useState<(typeof VISIT_TYPES)[number]["id"]>("rutin");
  const [focus, setFocus] = useState<(typeof FOCUS_AREAS)[number]["id"]>("deneyim");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<PersonDraft[]>([emptyPerson()]);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [questionDrafts, setQuestionDrafts] = useState<VisitQuestion[]>([]);
  const questionsQuery = useQuery({
    queryKey: ["visit-questions"],
    queryFn: () => getVisitQuestions(),
    enabled: open,
  });
  const questions = questionsQuery.data ?? VISIT_QUESTIONS;

  useEffect(() => {
    if (!open) return;
    setVisitDate(todayISO());
    setVisitType("rutin");
    setFocus("deneyim");
    setNotes("");
    setNextAction("");
    setAnswers({});
    setPeople([emptyPerson()]);
    setEditingQuestions(false);
    if (regionId) setSelectedRegion(String(regionId));
    if (storeId) setSelectedStore(String(storeId));
  }, [open, regionId, storeId]);

  const access = useAccess();
  const regions = (options.data ?? []).filter((region) => access.canEdit(region.id));
  const stores = regions.find((region) => String(region.id) === selectedRegion)?.stores ?? [];
  const filled = questions.filter((question) => (answers[question.id] ?? "").trim()).length;

  const mutation = useMutation({
    mutationFn: () =>
      addVisit({
        data: {
          storeId: Number(selectedStore),
          visitDate,
          visitType,
          focus,
          notes,
          nextAction,
          answers: questions
            .map((question) => ({
              questionId: question.id,
              answer: answers[question.id] ?? "",
            }))
            .filter((item) => item.answer.trim()),
          interviews: people
            .filter((person) => person.name.trim())
            .map((person) => ({
              name: person.name.trim(),
              position: person.position.trim(),
              notes: person.notes.trim(),
            })),
        },
      }),
    onSuccess: (result) => {
      toast.success(
        result.gapDays !== null
          ? `Ziyaret kaydedildi. Önceki Ziyaretle ${result.gapDays} gün`
          : "Ziyaret kaydedildi",
      );
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi");
    },
  });

  const saveQuestions = useMutation({
    mutationFn: (next: VisitQuestion[]) =>
      updateVisitQuestions({
        data: {
          questions: next.map((question) => ({
            id: question.id,
            group: question.group.trim(),
            text: question.text.trim(),
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Saha Soruları güncellendi");
      void queryClient.invalidateQueries({ queryKey: ["visit-questions"] });
      setEditingQuestions(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Sorular kaydedilemedi");
    },
  });

  function openQuestionEditor() {
    setQuestionDrafts(questions.map((question) => ({ ...question })));
    setEditingQuestions(true);
  }

  function saveQuestionDrafts() {
    if (questionDrafts.length === 0) {
      toast.error("En az bir soru kalmalı.");
      return;
    }
    if (questionDrafts.some((question) => question.group.trim().length < 2)) {
      toast.error("Her sorunun bir grubu olmalı.");
      return;
    }
    if (questionDrafts.some((question) => question.text.trim().length < 3)) {
      toast.error("Her soru en az 3 karakter olmalı.");
      return;
    }
    saveQuestions.mutate(questionDrafts);
  }

  let lastGroup = "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,860px)] max-w-2xl flex-col overflow-hidden p-0">
        <div className="px-5 pt-5 sm:px-6">
          <DialogHeader>
            <DialogTitle>Ziyaret Kaydet</DialogTitle>
            <DialogDescription>
              Mağaza Ziyaretini, saha cevaplarını ve görüşülen personeli kaydedin.
            </DialogDescription>
            {access.role === "partner" ? null : editingQuestions ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingQuestions(false)}>
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  onClick={saveQuestionDrafts}
                  disabled={saveQuestions.isPending}
                >
                  <Pencil />
                  {saveQuestions.isPending ? "Kaydediliyor…" : "Soruları Kaydet"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={openQuestionEditor}
              >
                <Pencil />
                Saha Sorularını düzenle
              </Button>
            )}
          </DialogHeader>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedStore) {
              toast.error("Mağaza seçin.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Bölge</Label>
                <Select
                  value={selectedRegion}
                  onValueChange={(value) => {
                    setSelectedRegion(value);
                    setSelectedStore("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bölge seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={String(region.id)}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Mağaza</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mağaza seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-date">Tarih</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Ziyaret Türü</Label>
                <Select
                  value={visitType}
                  onValueChange={(value) =>
                    setVisitType(value as (typeof VISIT_TYPES)[number]["id"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Odak</Label>
                <Select
                  value={focus}
                  onValueChange={(value) =>
                    setFocus(value as (typeof FOCUS_AREAS)[number]["id"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOCUS_AREAS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <section className="grid gap-3">
              <div className="grid gap-2">
                <h2 className="font-display text-lg tracking-tight">Saha Soruları</h2>
                {editingQuestions ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingQuestions(false)}
                    >
                      Vazgeç
                    </Button>
                    <Button
                      type="button"
                      onClick={saveQuestionDrafts}
                      disabled={saveQuestions.isPending}
                    >
                      {saveQuestions.isPending ? "Kaydediliyor…" : "Soruları Kaydet"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center"
                    onClick={openQuestionEditor}
                  >
                    <Pencil />
                    Soruları Düzenle
                  </Button>
                )}
                <p className="text-xs text-subtle tabular-nums">
                  {editingQuestions
                    ? "Soru metnini yazın, ekleyin veya silin."
                    : `${filled}/${questions.length} cevap`}
                </p>
              </div>
              {editingQuestions
                ? questionDrafts.map((question, index) => (
                    <div key={question.id} className="grid gap-2 rounded-xl bg-bg p-3">
                      <div className="flex items-center gap-2">
                        <Label className="min-w-0 flex-1" htmlFor={`edit-${question.id}`}>
                          {index + 1}. soru
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          aria-label={`${index + 1}. soruyu sil`}
                          onClick={() =>
                            setQuestionDrafts((current) =>
                              current.filter((item) => item.id !== question.id),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <Input
                        value={question.group}
                        maxLength={60}
                        aria-label={`${index + 1}. soru grubu`}
                        onChange={(event) =>
                          setQuestionDrafts((current) =>
                            current.map((item) =>
                              item.id === question.id
                                ? { ...item, group: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Textarea
                        id={`edit-${question.id}`}
                        rows={2}
                        maxLength={240}
                        value={question.text}
                        onChange={(event) =>
                          setQuestionDrafts((current) =>
                            current.map((item) =>
                              item.id === question.id
                                ? { ...item, text: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  ))
                : questions.map((question, index) => {
                    const showGroup = question.group !== lastGroup;
                    lastGroup = question.group;
                    return (
                      <div key={question.id} className="grid gap-2">
                        {showGroup ? (
                          <p className="pt-1 text-xs font-medium tracking-wide text-subtle uppercase">
                            {question.group}
                          </p>
                        ) : null}
                        <div className="flex items-start gap-2">
                          <Label className="min-w-0 flex-1 pt-2" htmlFor={`q-${question.id}`}>
                            {index + 1}. {question.text}
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            aria-label={`${index + 1}. soruyu düzenle`}
                            onClick={openQuestionEditor}
                          >
                            <Pencil />
                          </Button>
                        </div>
                        <Textarea
                          id={`q-${question.id}`}
                          rows={2}
                          maxLength={1000}
                          value={answers[question.id] ?? ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Cevap"
                        />
                      </div>
                    );
                  })}
              {editingQuestions ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setQuestionDrafts((current) => [
                      ...current,
                      { id: newQuestionId(), group: "Saha", text: "" },
                    ])
                  }
                >
                  <Plus />
                  Soru Ekle
                </Button>
              ) : null}
            </section>

            <section className="grid gap-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg tracking-tight">Görüşülen Personel</h2>
                  <p className="text-sm text-muted">
                    Bu ziyarette konuştuğunuz kişilerin adı, pozisyonu ve görüşme notu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPeople((current) => [...current, emptyPerson()])}
                >
                  <Plus />
                  Personel
                </Button>
              </div>
              {people.map((person, index) => (
                <div key={index} className="grid gap-2 rounded-xl bg-bg p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={person.name}
                      maxLength={80}
                      placeholder="Ad Soyad"
                      aria-label={`Personel ${index + 1}`}
                      onChange={(event) =>
                        setPeople((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                    <Input
                      value={person.position}
                      maxLength={80}
                      placeholder="Pozisyon"
                      aria-label={`Pozisyon ${index + 1}`}
                      onChange={(event) =>
                        setPeople((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, position: event.target.value } : item,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label="Personeli kaldır"
                      onClick={() =>
                        setPeople((current) =>
                          current.length === 1
                            ? [emptyPerson()]
                            : current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    maxLength={1000}
                    value={person.notes}
                    placeholder="Görüşme Notu"
                    aria-label={`Görüşme Notu ${index + 1}`}
                    onChange={(event) =>
                      setPeople((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, notes: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </section>

            <div className="grid gap-2">
              <Label htmlFor="notes">Genel Saha Notu</Label>
              <Textarea
                id="notes"
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ziyaretin kısa özeti"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="next-action">Sonraki Aksiyon</Label>
              <Input
                id="next-action"
                maxLength={300}
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                placeholder="Örn. takip ziyareti, eğitim planı"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3 sm:px-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={mutation.isPending || editingQuestions}>
              {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
