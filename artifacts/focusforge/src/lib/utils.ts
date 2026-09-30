import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSubjectColorByName = (subjectName: string, subjects: {name: string; color: string}[]): string => {
  const subject = subjects?.find(s => s.name === subjectName);
  return subject ? subject.color : "#6B7280"; // fallback to gray
};
