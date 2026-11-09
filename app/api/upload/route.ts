import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/fileFormats";
import { BLOB_LIFECYCLE_VERSION, BLOB_PARSE_MAX_AGE_MS, BLOB_ARCHIVE_MIN_AGE_MS } from "@/lib/blobLifecycle.mjs";

// Lets the local archiver verify that the production parser has the safety window.
export async function GET() {
  return NextResponse.json({
    version: BLOB_LIFECYCLE_VERSION,
    parseMaxAgeMs: BLOB_PARSE_MAX_AGE_MS,
    archiveMinAgeMs: BLOB_ARCHIVE_MIN_AGE_MS,
    parserMaxDurationSeconds: 300,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/epub+zip",
          "application/pdf",
          "text/plain",
          "application/octet-stream",
          "application/vnd.amazon.ebook",
          "application/vnd.amazon.mobi8-ebook",
          "application/x-mobipocket-ebook",
        ],
        maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
      }),
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload token 生成失败:", error);
    return NextResponse.json(
      { error: "上传服务暂时不可用，请稍后重试。" },
      { status: 400 }
    );
  }
}
