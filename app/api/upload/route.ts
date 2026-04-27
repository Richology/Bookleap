import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/fileFormats";

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
        ],
        maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
      }),
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload token 生成失败:", error);
    return NextResponse.json(
      { error: "上传初始化失败" },
      { status: 400 }
    );
  }
}
