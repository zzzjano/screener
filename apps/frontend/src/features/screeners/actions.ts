"use server";

import { revalidatePath } from "next/cache";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export async function createScreener(input: any) {
  const res = await fetch(`${API_URL}/screeners`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create screener");
  revalidatePath("/screenery");
  return res.json();
}

export async function updateScreener(id: string, input: any) {
  const res = await fetch(`${API_URL}/screeners/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to update screener");
  revalidatePath("/screenery");
  revalidatePath(`/screenery/${id}`);
  return res.json();
}

export async function activateScreener(id: string) {
  const res = await fetch(`${API_URL}/screeners/${id}/activate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to activate screener");
  revalidatePath("/screenery");
  return res.json();
}

export async function pauseScreener(id: string) {
  const res = await fetch(`${API_URL}/screeners/${id}/pause`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to pause screener");
  revalidatePath("/screenery");
  return res.json();
}

export async function deleteScreener(id: string) {
  const res = await fetch(`${API_URL}/screeners/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete screener");
  revalidatePath("/screenery");
}

export async function listScreeners() {
  const res = await fetch(`${API_URL}/screeners`);
  if (!res.ok) throw new Error("Failed to fetch screeners");
  return res.json();
}

export async function getScreener(id: string) {
  const res = await fetch(`${API_URL}/screeners/${id}`);
  if (!res.ok) return null;
  return res.json();
}
