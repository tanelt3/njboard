import { connection } from "next/server";
import { readGoogleSheet } from "@/lib/google-sheet";

export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store, max-age=0" };
  try {
    return Response.json(await readGoogleSheet(), { headers });
  } catch (error) {
    console.error("Google Sheet request failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "Could not load data. Please try again. If the problem persists, check the Google Sheet sharing permissions." },
      { status: 502, headers },
    );
  }
}
