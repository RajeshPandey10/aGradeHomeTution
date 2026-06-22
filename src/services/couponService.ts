import api from "@/lib/axios";
import { handleRequest } from "./api";

export interface Coupon {
  _id: string;
  code: string;
  couponType: "percentage" | "flat";
  couponValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export const couponService = {
  getAll: () =>
    handleRequest<Coupon[]>(() => api.get("/api/admin/coupons")),

  create: (data: { code: string; couponType: string; couponValue: number; maxUses?: number | null; expiresAt?: string | null }) =>
    handleRequest<Coupon>(() => api.post("/api/admin/coupons", data)),

  update: (id: string, data: Partial<Coupon>) =>
    handleRequest<Coupon>(() => api.put(`/api/admin/coupons/${id}`, data)),

  delete: (id: string) =>
    handleRequest<void>(() => api.delete(`/api/admin/coupons/${id}`)),
};
