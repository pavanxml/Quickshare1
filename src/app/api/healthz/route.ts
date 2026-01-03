import { getAdapter } from "@/lib/factory";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const adapter = getAdapter();
    const healthy = await adapter.isHealthy();

    if (!healthy) {
        return NextResponse.json({ ok: false }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
}
