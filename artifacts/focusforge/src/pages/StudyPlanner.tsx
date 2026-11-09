import { useState, useEffect } from "react";
import {format, startOfWeek, addDays} from 'date-fns';
import { Plus, Trash, BookOpen, ArrowsClockwise } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/StoreContext";
import { Subject } from '@/lib/store';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { start } from "node:repl";

const PALETTE = [
  '#4285FA',
  '#EA4335',
  '#FBBC05',
  '#34A853',
  '#8B5CF6',
  '#0EA5E9',
  '#EC4899',
  '#F97316',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StudyPlanner() {
  const { tasks, settings, setSettings } = useStore();
  const { toast } = useToast();
  const weekStart = startOfWeek(new Date(), {weekStartsOn: 1});
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  

}