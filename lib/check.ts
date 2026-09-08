// 실행: node lib/check.ts
import assert from "node:assert/strict";
import { groupByDate } from "./seats.ts";
import { reservationMessage, smsBytes } from "./message.ts";
import { formatPhone } from "./phone.ts";

// --- 날짜별 묶음 / 정원 계산 ---
const g = groupByDate([
  { target_date: "2026-03-14", gender: "남자", status: "confirmed" },
  { target_date: "2026-03-14", gender: "여자", status: "confirmed" },
  { target_date: "2026-03-14", gender: "여자", status: "cancelled" },
  { target_date: "2026-04-04", gender: "남자", status: null },
]);

assert.equal(g.length, 2, "날짜별로 2그룹");
assert.deepEqual(
  g.map((x) => x.date),
  ["2026-03-14", "2026-04-04"],
  "입력 순서를 유지한다",
);
assert.equal(g[0].rows.length, 3, "취소건도 명단에는 남아있다");
assert.equal(g[0].male, 1);
assert.equal(g[0].female, 1, "취소된 여자 1건은 정원 계산에서 빠진다");
assert.equal(g[1].male, 1, "status 가 null 이면 유효한 예약");

// --- 문자 바이트 계산 (90 초과 시 LMS 로 과금) ---
assert.equal(smsBytes("abc"), 3, "영문/숫자는 1바이트");
assert.equal(smsBytes("가나다"), 6, "한글은 2바이트");
assert.equal(smsBytes("가\n1"), 4, "줄바꿈은 1바이트");
assert.equal(smsBytes(""), 0);
assert.ok(
  smsBytes(
    reservationMessage({
      userName: "홍길동",
      targetDate: "2026-10-10",
      sessionTime: "오전 10시",
    }),
  ) > 90,
  "기본 안내 문구는 장문(LMS)이다",
);

// --- 전화번호 하이픈 자동 입력 ---
// 숫자만 눌러가며 입력할 때 한 글자씩 어떻게 보이는지
assert.equal(formatPhone("010"), "010");
assert.equal(formatPhone("0101"), "010-1");
assert.equal(formatPhone("010123"), "010-123");
assert.equal(formatPhone("0101234"), "010-123-4");
assert.equal(formatPhone("01012345678"), "010-1234-5678", "완성된 번호");

// 하이픈을 직접 넣어도, 붙여넣기를 해도 같은 결과
assert.equal(formatPhone("010-1234-5678"), "010-1234-5678");
assert.equal(formatPhone("010 1234 5678"), "010-1234-5678");
assert.equal(formatPhone("abc010def12345678"), "010-1234-5678", "문자는 무시");
assert.equal(formatPhone("010123456789999"), "010-1234-5678", "11자리에서 자름");
assert.equal(formatPhone(""), "");

// 지우는 도중에도 깨지지 않는다
assert.equal(formatPhone("010-"), "010");
assert.equal(formatPhone("010-1234-"), "010-123-4");

console.log("✅ lib 검증 통과");
