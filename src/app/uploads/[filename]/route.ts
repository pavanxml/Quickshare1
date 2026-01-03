
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ filename: string }> }
) {
    const params = await props.params;
    const filename = params.filename;

    if (!filename) {
        return new NextResponse("Filename required", { status: 400 });
    }

    // Determine storage path
    const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const uploadDir = isVercel
        ? path.join('/tmp', 'uploads')
        : path.join(process.cwd(), "public", "uploads");

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
        // Fallback for local development if not in /tmp but in public
        // (Scenario: Developed locally in public/uploads, then switched flag but file is there)
        if (isVercel) {
            const localFallback = path.join(process.cwd(), "public", "uploads", filename);
            if (fs.existsSync(localFallback)) {
                // We can't stream from public/uploads via fs in Vercel usually if it's not included in build
                // But standard nextjs public folder handling should handle it via normal URL.
                // However, if we are here, it means we are trying to serve via API.
                // Let's just return 404 for now to be safe.
            }
        }
        return new NextResponse("File not found", { status: 404 });
    }

    const stats = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);

    // @ts-ignore
    return new NextResponse(Readable.from(stream), {
        headers: {
            "Content-Type": "application/octet-stream", // You might want to store mime-type in DB and pass it here if possible, or guess it.
            "Content-Length": stats.size.toString(),
        },
    });
}
