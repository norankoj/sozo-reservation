import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MAX_SMS_BYTES } from "@/lib/message";
import { sendSms } from "@/lib/sms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

// 관리자 대시보드의 문자 (재)발송 전용. 로그인한 관리자만 사용할 수 있습니다.
// 신청자 예약 시 문자는 /api/reserve 에서 보냅니다.
export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    const user = token ? (await supabase.auth.getUser(token)).data.user : null;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { userPhone, text } = await request.json();
    if (!userPhone || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "INVALID" },
        { status: 400 },
      );
    }

    const result = await sendSms(userPhone, text.slice(0, MAX_SMS_BYTES));
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("솔라피 발송 에러:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
