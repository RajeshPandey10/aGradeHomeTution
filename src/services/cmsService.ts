import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface CMSItem {
  _id: string;
  type: string;
  content: string;
}

export const cmsService = {
  getAll: () =>
    handleRequest<CMSItem[]>(() => api.get("/api/public/cms")),

  upsert: (type: string, content: string) =>
    handleRequest<CMSItem>(() => api.post("/api/admin/cms", { type, content })),
};
