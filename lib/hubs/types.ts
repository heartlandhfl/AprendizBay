import type { CollectiveHub } from "@/lib/tutor-profiles";

export interface CollectiveHubLive extends CollectiveHub {
  confirmedStudentIds: string[];
  status: string;
  tutorId: string;
}

export interface CreateCollectiveHubInput {
  title: string;
  description: string;
  maxStudents: number;
  currentPrice: number;
  fullPrice: number;
  schedule: string;
  modality: "online" | "presencial";
}
