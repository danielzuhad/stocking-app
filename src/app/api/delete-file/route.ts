import { env } from "@/lib/env";
import ImageKit from "imagekit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { fileId } = await req.json();
  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  const imagekit = new ImageKit({
    publicKey: env.data?.IMAGEKIT_PUBLIC_KEY as string,
    privateKey: env.data?.IMAGEKIT_PRIVATE_KEY as string,
    urlEndpoint: env.data?.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT as string,
  });

  try {
    const res = await imagekit.deleteFile(fileId);
    return NextResponse.json(res);
  } catch (e: unknown) {
    // lakukan narrowing, karena e bisa apa saja
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
