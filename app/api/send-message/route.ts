import { NextResponse } from "next/server";
import { SolapiMessageService } from "solapi";
import { createClient } from "@supabase/supabase-js";
import { reservationMessage, MAX_SMS_BYTES } from "@/lib/message";

// 환경변수에서 키를 불러옵니다 (.env.local 및 Vercel 환경변수에 추가 필요)
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY as string,
  process.env.SOLAPI_API_SECRET as string,
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userName, userPhone, targetDate, sessionTime, text } = body;

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: "NO_PHONE" },
        { status: 400 },
      );
    }

    // 기본은 정해진 안내 문구.
    let messageText = reservationMessage({ userName, targetDate, sessionTime });

    // 내용을 직접 고쳐 보내는 것은 로그인한 관리자만 허용합니다.
    // (열어두면 누구나 이 주소로 아무 번호에 아무 문자나 보낼 수 있게 됩니다.)
    if (typeof text === "string" && text.trim()) {
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
      messageText = text.slice(0, MAX_SMS_BYTES);
    }

    const result = await messageService.sendOne({
      to: userPhone, // 폼에서 입력받은 수신자 번호
      from: process.env.SOLAPI_SENDER_PHONE as string, // 솔라피에 등록된 발신자 번호
      subject: "SOZO 예약 확정 안내",
      text: messageText,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("솔라피 발송 에러:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
