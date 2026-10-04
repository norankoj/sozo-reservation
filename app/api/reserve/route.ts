import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reservationMessage } from "@/lib/message";
import { sendSms } from "@/lib/sms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

// 예약 등록과 안내 문자를 서버에서 한 번에 처리합니다.
// 문자는 DB에 실제로 예약이 들어간 경우에만, DB에 저장된 값으로 보냅니다.
// (예전처럼 문자 주소를 따로 열어두면 누구나 아무 번호로 문자를 보낼 수 있었습니다.)
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "INVALID" }, { status: 400 });

  const { data: row, error } = await supabase.rpc("reserve_sozo", {
    p_target_date: b.targetDate,
    p_user_name: String(b.userName ?? "").trim(),
    p_user_phone: b.userPhone,
    p_gender: b.gender,
    p_cell: String(b.userCell ?? "").trim(),
    p_age: b.userAge,
    p_expectations: b.expectations ?? "",
    p_questions: b.questions ?? "",
  });

  if (error) {
    const code =
      ["FULL", "CLOSED", "DUPLICATE", "INVALID"].find((c) =>
        error.message.includes(c),
      ) ?? "ERROR";
    if (code === "ERROR") console.error("예약 등록 에러:", error);
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const { data: schedule } = await supabase
    .from("sozo_availability")
    .select("session_time")
    .eq("target_date", row.target_date)
    .single();

  let smsSent = true;
  try {
    await sendSms(
      row.user_phone,
      reservationMessage({
        userName: row.user_name,
        targetDate: row.target_date,
        sessionTime: schedule?.session_time || "오전 10시",
      }),
    );
  } catch (e) {
    // 예약 자체는 성공했으므로 실패로 돌려주지 않습니다.
    console.error("솔라피 발송 에러:", e);
    smsSent = false;
  }

  return NextResponse.json({ success: true, smsSent });
}
