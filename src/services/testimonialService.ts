import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface Testimonial {
  _id: string;
  name: string;
  role?: string;
  quote: string;
  rating?: number;
  photoUrl?: string;
  order: number;
  isPublished: boolean;
  createdAt?: string;
}

export const testimonialService = {
  getAll: () =>
    handleRequest<Testimonial[]>(() => api.get("/api/admin/testimonials")),

  create: (data: Partial<Omit<Testimonial, "_id">>) =>
    handleRequest<Testimonial>(() => api.post("/api/admin/testimonials", data)),

  update: (id: string, data: Partial<Omit<Testimonial, "_id">>) =>
    handleRequest<Testimonial>(() => api.put(`/api/admin/testimonials/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/testimonials/${id}`)),
};
