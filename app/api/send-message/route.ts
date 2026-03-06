import { NextResponse } from "next/server";
import { SolapiMessageService } from "solapi";

// 환경변수에서 키를 불러옵니다 (.env.local 및 Vercel 환경변수에 추가 필요)
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY as string,
  process.env.SOLAPI_API_SECRET as string,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userName, userPhone, targetDate, sessionTime } = body;

    // 솔라피 메시지 발송 로직
    const result = await messageService.sendOne({
      to: userPhone, // 폼에서 입력받은 수신자 번호
      from: process.env.SOLAPI_SENDER_PHONE as string, // 솔라피에 등록된 발신자 번호
      text: `[SOZO 예약 완료]\n${userName}님, ${targetDate} ${sessionTime} 예약이 확정되었습니다.\n감사합니다!`, // 발송할 메시지 내용

      // 카카오톡 알림톡
      /*
      kakaoOptions: {
        pfId: "카카오톡채널_PFID", // 솔라피에 연동된 카카오 채널 ID
        templateId: "승인받은_템플릿ID" // 승인받은 알림톡 템플릿 ID
      }
      */
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("솔라피 발송 에러:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
