import { getAdapter } from "@/lib/factory";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

// Disable default body parser for streaming is not needed in App Router as it uses web standards
// export const config = {
//     api: {
//         bodyParser: false,
//     },
// };

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "";

        // 1. Handle JSON (Text, URL)
        if (contentType.includes("application/json")) {
            // Manually parse body because bodyParser is false
            const chunks = [];
            for await (const chunk of req.body as any) {
                chunks.push(chunk);
            }
            const bodyText = Buffer.concat(chunks).toString('utf-8');
            const body = JSON.parse(bodyText);

            // Validation
            if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
                return NextResponse.json({ error: "Content is required." }, { status: 400 });
            }

            const adapter = getAdapter();
            const id = await adapter.createPaste({
                content: body.content,
                type: body.type || 'text',
                ttl_seconds: body.ttl_seconds ? Number(body.ttl_seconds) : undefined,
                max_views: body.max_views ? Number(body.max_views) : undefined,
            });

            const host = req.headers.get("host") || "localhost:3000";
            const protocol = req.headers.get("x-forwarded-proto") || "http";
            const url = `${protocol}://${host}/p/${id}`;

            return NextResponse.json({ id, url });
        }

        // 2. Handle Binary Stream (File/Video)
        // We expect raw file body or binary stream.

        const isMultipart = contentType.includes("multipart/form-data");
        const isBinary = contentType === "application/octet-stream" || contentType.startsWith("video/") || contentType.startsWith("image/") || contentType.startsWith("application/");

        if (isBinary || isMultipart) {
            // For simplicity and 10GB support, we rely on the Client sending the file as the Request Body (binary).

            const metaHeader = req.headers.get("x-paste-meta");
            if (!metaHeader) {
                return NextResponse.json({ error: "Missing x-paste-meta header for streaming upload." }, { status: 400 });
            }

            let meta: any;
            try {
                meta = JSON.parse(metaHeader);
            } catch (e) {
                return NextResponse.json({ error: "Invalid x-paste-meta header JSON." }, { status: 400 });
            }

            if (!req.body) {
                return NextResponse.json({ error: "No file body." }, { status: 400 });
            }

            const ext = meta.extension || ".bin";
            const filename = `${nanoid()}${ext}`;

            // Determine Storage Path
            const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
            const uploadDir = isVercel
                ? path.join('/tmp', 'uploads')
                : path.join(process.cwd(), "public", "uploads");

            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, filename);

            // Stream to disk
            // @ts-ignore - native stream web vs node stream mismatch
            const nodeStream = Readable.fromWeb(req.body as any);
            await pipeline(nodeStream, createWriteStream(filePath));

            // Determine serving URL
            // If local public, can serve directly via /uploads/filename
            // If /tmp, need a route to serve it.
            // We created a route at /uploads/[filename] that handles this.
            // So we can strictly use that route for consistency, or standard public static hosting for local.

            // Let's use the route we created for everything to be consistent.
            // But nextjs static serving is better for public folder.
            const fileUrl = isVercel
                ? `/uploads/${filename}`
                : `/uploads/${filename}`; // This route will proxy to /tmp or public

            const adapter = getAdapter();
            const id = await adapter.createPaste({
                content: meta.content || "File Share",
                type: 'mixed', // Use mixed to allow text description + file
                file_url: fileUrl,
                mime_type: meta.mime_type || "application/octet-stream",
                ttl_seconds: meta.ttl_seconds ? Number(meta.ttl_seconds) : undefined,
                max_views: meta.max_views ? Number(meta.max_views) : undefined,
            });

            const host = req.headers.get("host") || "localhost:3000";
            const protocol = req.headers.get("x-forwarded-proto") || "http";
            const url = `${protocol}://${host}/p/${id}`;

            return NextResponse.json({ id, url });
        }

        return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 400 });

    } catch (error) {
        console.error("Create paste error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
