import { NextResponse } from 'next/server';
import { selectionError } from '@/lib/bookAnalysis/selectionExplanation.mjs';
import { generateSelectionExplanation } from '@/lib/skills/generateSelectionExplanation';

export async function POST(request: Request) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 300000) return NextResponse.json({error: '解释上下文过长。'}, {status: 413});
    body = JSON.parse(raw);
    const error = selectionError(body?.selection);
    if (error || typeof body?.cardContent !== 'string' || typeof body?.title !== 'string') {
      return NextResponse.json({error: error || '解释请求无效。'}, {status: 400});
    }
  } catch {
    return NextResponse.json({error: '解释请求无效。'}, {status: 400});
  }
  try {
    const result = await generateSelectionExplanation(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({error: '暂时无法解释，请重试。'}, {status: 502});
  }
}
