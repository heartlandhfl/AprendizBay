import type { CollectiveHub } from "@/lib/tutor-profiles";
import type { HubStatus } from "@/lib/hubs/join";

export interface CollectiveHubLive extends CollectiveHub {
  tutorId: string;
  status: HubStatus | string;
  subject?: string;
  tutorName?: string;
  scheduledDate?: string;
  startTime?: string;
  individualPrice?: number;
  isJoined: boolean;
}

export interface CreateCollectiveHubInput {
  title: string;
  description: string;
  maxStudents: number;
  currentPrice: number;
  fullPrice: number;
  schedule: string;
  modality: "online" | "presencial";
  subject: string;
  scheduledDate: string;
  startTime: string;
  tutorName: string;
  individualPrice: number;
}

export interface JoinCollectiveClassInput {
  hubId: string;
  tutorId: string;
  price: number;
  scheduledAt: Date;
}
