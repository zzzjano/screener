import { prisma } from "./prisma";

const DEMO_USER_EMAIL = "demo@screener.local";

export async function getDemoUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: {
      email: DEMO_USER_EMAIL,
      displayName: "Demo Użytkownik",
      locale: "pl",
      timezone: "Europe/Warsaw",
    },
  });
  return user.id;
}
