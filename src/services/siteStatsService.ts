import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface SiteStats {
  _id: string;
  verifiedTutors: number;
  studentsMatched: number;
  districtsCovered: number;
  updatedAt?: string;
}

export const siteStatsService = {
  get: () => handleRequest<SiteStats>(() => api.get("/api/admin/site-stats")),

  update: (data: Pick<SiteStats, "verifiedTutors" | "studentsMatched" | "districtsCovered">) =>
    handleRequest<SiteStats>(() => api.put("/api/admin/site-stats", data)),
};
