import { getAdapter } from "@/lib/factory";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const adapter = getAdapter();

        // Deterministic Time Handling
        const testNow = req.headers.get("x-test-now-ms");
        let now = Date.now();

        // Logic: If TEST_MODE is set AND header is present, use header.
        if (process.env.TEST_MODE === "1" && testNow) {
            const parsed = parseInt(testNow, 10);
            if (!isNaN(parsed)) {
                now = parsed;
            }
        }

        const paste = await adapter.fetchPaste(params.id, now);

        if (!paste) {
            return NextResponse.json({ error: "Paste not found or unavailable" }, { status: 404 });
        }

        return NextResponse.json({
            content: paste.content,
            remaining_views: paste.views_left,
            expires_at: paste.expires_at ? new Date(paste.expires_at).toISOString() : null,
        });
    } catch (error) {
        console.error("Get paste error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
