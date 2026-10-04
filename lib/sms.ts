import { SolapiMessageService } from "solapi";

// 서버(API 라우트)에서만 사용합니다. 키는 .env.local / Vercel 환경변수에 둡니다.
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY as string,
  process.env.SOLAPI_API_SECRET as string,
);

export const sendSms = (to: string, text: string) =>
  messageService.sendOne({
    to,
    from: process.env.SOLAPI_SENDER_PHONE as string, // 솔라피에 등록된 발신자 번호
    subject: "SOZO 예약 확정 안내",
    text,
  });
