import { useState } from "react";
import { Plus, Layout, ArrowRight, ArrowLeft, RotateCounterclockwise, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "./Dashboard";
import { format, addDays } from "date-fns";
import type { Flashcard } from "@/lib/store";

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const DIFF_DAYS: Record<Flashcard["difficulty"], number> = { easy: 7, medium: 3, hard: 1 };

export default function Flashcards() {
  const { flashcards, setFlashcards, tasks } = useStore();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ front: "", back: "", subject: "" });
  const [filterSubject, setFilterSubject] = useState("all");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const subjects = Array.from(new Set([...tasks.map(t => t.subject), ...flashcards.map(f => f.subject)])).filter(Boolean);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const dueCards = flashcards.filter(f => f.nextReview <= todayStr);
  const browseCards = flashcards.filter(f => filterSubject === "all" || f.subject === filterSubject);
  const currentCard = dueCards[reviewIdx];

  const handleAdd = () => {
    if (!form.front.trim() || !form.back.trim()) return;
    const card: Flashcard = {
      id: uid(),
      front: form.front,
      back: form.back,
      subject: form.subject || "General",
      nextReview: todayStr,
      difficulty: "medium",
      reviewCount: 0,
    };
    setFlashcards(prev => [...prev, card]);
    toast({ title: "Flashcard added" });
    setAddOpen(false);
    setForm({ front: "", back: "", subject: "" });
  };

  const handleRate = (diff: Flashcard["difficulty"]) => {
    const days = DIFF_DAYS[diff];
    setFlashcards(prev => prev.map(f =>
      f.id === currentCard.id
        ? { ...f, difficulty: diff, nextReview: format(addDays(new Date(), days), "yyyy-MM-dd"), reviewCount: f.reviewCount + 1 }
        : f
    ));
    if (reviewIdx >= dueCards.length - 1) {
      setReviewDone(true);
    } else {
      setReviewIdx(i => i + 1);
      setFlipped(false);
    }
  };

  const resetReview = () => {
    setReviewIdx(0);
    setFlipped(false);
    setReviewDone(false);
  };

  const deleteCard = (id: string) => {
    setFlashcards(prev => prev.filter(f => f.id !== id));
    toast({ title: "Card deleted" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{flashcards.length} cards · {dueCards.length} due today</p>
        <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="button-add-card">
          <Plus weight="fill" className="h-4 w-4 text-primary-foreground" />
          Add Card
        </Button>
      </div>

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review" data-testid="tab-review">Review ({dueCards.length})</TabsTrigger>
          <TabsTrigger value="browse" data-testid="tab-browse">Browse ({flashcards.length})</TabsTrigger>
        </TabsList>

        {/* Review Tab */}
        <TabsContent value="review" className="mt-4">
          {dueCards.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Layout weight="fill" className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No cards due for review today.</p>
            </div>
          ) : reviewDone ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">Done</div>
              <p className="text-muted-foreground mb-4">Reviewed {dueCards.length} card{dueCards.length !== 1 ? "s" : ""}</p>
              <Button variant="outline" className="gap-2" onClick={resetReview}>
                <RotateCounterclockwise weight="fill" className="h-4 w-4 text-muted-foreground" />
                Review Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <p className="text-xs text-muted-foreground">{reviewIdx + 1} / {dueCards.length}</p>

              {/* Card */}
              <div
                className="w-full max-w-lg h-64 relative cursor-pointer perspective-1000"
                onClick={() => setFlipped(f => !f)}
                data-testid="flashcard-card"
              >
                <AnimatePresence mode="wait">
                  {!flipped ? (
                    <motion.div
                      key="front"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: -90 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 rounded-2xl border-2 border-border bg-card flex flex-col items-center justify-center p-8 text-center"
                    >
                      <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Question</p>
                      <p className="text-lg font-semibold">{currentCard.front}</p>
                      <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: -90 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 rounded-2xl border-2 border-primary/50 bg-primary/5 flex flex-col items-center justify-center p-8 text-center"
                    >
                      <p className="text-xs font-medium text-primary mb-4 uppercase tracking-wider">Answer</p>
                      <p className="text-lg font-medium">{currentCard.back}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subject badge */}
              <Badge variant="outline" className={cn("text-xs border", getSubjectColor(currentCard.subject))}>
                {currentCard.subject}
              </Badge>

              {/* Rate buttons */}
              <AnimatePresence>
                {flipped && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <Button variant="outline" className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10 gap-1" onClick={() => handleRate("hard")} data-testid="rate-hard">
                      Hard
                    </Button>
                    <Button variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 gap-1" onClick={() => handleRate("medium")} data-testid="rate-medium">
                      Medium
                    </Button>
                    <Button variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 gap-1" onClick={() => handleRate("easy")} data-testid="rate-easy">
                      Easy
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="mt-4 space-y-4">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40" data-testid="filter-flashcard-subject">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {browseCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layout weight="fill" className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm">No cards yet. Add your first flashcard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {browseCards.map(card => (
                <Card key={card.id} data-testid={`card-${card.id}`} className="bg-card border-border group hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{card.front}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{card.back}</p>
                      </div>
                      <button onClick={() => deleteCard(card.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" data-testid={`delete-card-${card.id}`}>
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className={cn("text-xs border", getSubjectColor(card.subject))}>{card.subject}</Badge>
                      <span className={cn("text-xs", card.difficulty === "easy" ? "text-emerald-400" : card.difficulty === "medium" ? "text-amber-400" : "text-rose-400")}>
                        {card.difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">×{card.reviewCount}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Flashcard</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Front (Question)</Label><Textarea value={form.front} onChange={e => setForm(f => ({ ...f, front: e.target.value }))} placeholder="What is Coulomb's Law?" rows={3} data-testid="input-front" /></div>
            <div><Label>Back (Answer)</Label><Textarea value={form.back} onChange={e => setForm(f => ({ ...f, back: e.target.value }))} placeholder="F = kq₁q₂/r²" rows={3} data-testid="input-back" /></div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} list="subjects-fc" placeholder="Subject" />
              <datalist id="subjects-fc">{subjects.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <Button className="w-full" onClick={handleAdd} data-testid="button-save-card">Add Card</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
