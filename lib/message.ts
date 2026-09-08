/** 예약 안내 문자 기본 문구 (예약 완료 시 / 관리자 재발송 시 공통) */
export const reservationMessage = (o: {
  userName: string;
  targetDate: string;
  sessionTime: string;
}) =>
  `[SOZO 예약 완료]\n${o.userName}님, ${o.targetDate} ${o.sessionTime} 예약이 확정되었습니다.\n안내된 계좌로 입금 부탁드립니다. 국민은행 920301-01-728406 (하나교회)`;

/** 문자 과금 기준 바이트 수. 한글 등 비ASCII 는 2바이트, 90바이트를 넘으면 LMS. */
export const smsBytes = (text: string) =>
  [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0);

/** LMS 최대 길이 */
export const MAX_SMS_BYTES = 2000;
