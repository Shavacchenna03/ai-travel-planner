import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Password confirmation is required."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please provide valid registration details." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstErrorMessage =
      fieldErrors.name?.[0] ||
      fieldErrors.email?.[0] ||
      fieldErrors.password?.[0] ||
      fieldErrors.confirmPassword?.[0] ||
      "Invalid registration details.";
    return NextResponse.json({ error: firstErrorMessage, fieldErrors }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { success: true, message: "Account created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Roamly Auth Error] Failed to register user:", error);
    return NextResponse.json(
      { error: "Something went wrong while creating your account. Please try again." },
      { status: 500 }
    );
  }
}
