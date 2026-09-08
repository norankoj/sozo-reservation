"use client";

import { useState, useEffect } from "react";
import { format, parseISO, getDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import { groupByDate, isCancelled } from "@/lib/seats";
import { reservationMessage, smsBytes } from "@/lib/message";
import {
  User,
  Phone,
  Users,
  CalendarDays,
  Clock,
  Send,
  XCircle,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"current" | "past">("current");
  const [busyId, setBusyId] = useState<string | null>(null);

  // 문자 발송 팝업
  const [smsTarget, setSmsTarget] = useState<any>(null);
  const [smsText, setSmsText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: resData, error }, { data: availData }] = await Promise.all([
      supabase
        .from("sozo_reservations")
        .select("*")
        .order("target_date", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("sozo_availability").select("*"),
    ]);

    if (error) console.error("데이터 로딩 에러:", error);
    setReservations(resData || []);
    setAvailabilities(availData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const scheduleOf = (date: string) =>
    availabilities.find((a) => a.target_date === date);

  const sessionTimeOf = (date: string) =>
    scheduleOf(date)?.session_time || "오전 10시";

  // 문자 발송 팝업 열기 — 기본 문구를 채워두고 관리자가 고칠 수 있게 합니다.
  const openSms = (res: any) => {
    setSmsTarget(res);
    setSmsText(
      reservationMessage({
        userName: res.user_name,
        targetDate: res.target_date,
        sessionTime: sessionTimeOf(res.target_date),
      }),
    );
  };

  const sendSms = async () => {
    if (!smsText.trim()) return alert("보낼 내용을 입력해 주세요.");

    setSending(true);
    try {
      // 내용을 고쳐 보내려면 관리자 인증이 필요합니다.
      const { data: auth } = await supabase.auth.getSession();
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          userName: smsTarget.user_name,
          userPhone: smsTarget.user_phone,
          targetDate: smsTarget.target_date,
          sessionTime: sessionTimeOf(smsTarget.target_date),
          text: smsText,
        }),
      });
      const json = await response.json();

      if (json.success) {
        alert(`${smsTarget.user_name}님에게 문자를 보냈습니다.`);
        setSmsTarget(null);
      } else if (json.error === "UNAUTHORIZED") {
        alert("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      } else {
        alert("문자 발송에 실패했습니다. 연락처와 내용을 확인해 주세요.");
      }
    } catch {
      alert("문자 발송에 실패했습니다.");
    }
    setSending(false);
  };

  // 삭제 대신 취소 처리 — 기록은 남고 자리만 다시 열립니다.
  const handleStatus = async (res: any, status: "confirmed" | "cancelled") => {
    const verb = status === "cancelled" ? "취소" : "복구";
    const note =
      status === "cancelled"
        ? "\n취소하면 그 자리는 다시 예약 가능해집니다."
        : "";
    if (!confirm(`${res.user_name}님의 예약을 ${verb}하시겠습니까?${note}`))
      return;

    setBusyId(res.id);
    // 바뀐 행만 돌려받아 화면에 반영합니다 (전체 재조회 시 목록이 깜빡입니다).
    const { data, error } = await supabase
      .from("sozo_reservations")
      .update({ status })
      .eq("id", res.id)
      .select()
      .single();
    setBusyId(null);

    if (error || !data) alert(`${verb} 중 오류가 발생했습니다.`);
    else
      setReservations((prev) =>
        prev.map((r) => (r.id === data.id ? data : r)),
      );
  };

  // 완전 삭제는 이미 취소된 예약에만 허용합니다.
  // (테스트 예약 정리, 그리고 신청자가 있어 지워지지 않는 일정을 정리할 때 필요합니다.)
  const handleHardDelete = async (res: any) => {
    if (
      !confirm(
        `${res.user_name}님의 예약을 완전히 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`,
      )
    )
      return;

    setBusyId(res.id);
    const { error } = await supabase
      .from("sozo_reservations")
      .delete()
      .eq("id", res.id);
    setBusyId(null);

    if (error) alert(`삭제 중 오류가 발생했습니다.\n(${error.message})`);
    else setReservations((prev) => prev.filter((r) => r.id !== res.id));
  };

  // 오늘 이전 날짜의 예약은 '지난 기록'으로 분리
  const today = format(new Date(), "yyyy-MM-dd");
  const past = reservations.filter((r) => r.target_date < today);
  const current = reservations.filter((r) => r.target_date >= today);
  const groups = groupByDate(tab === "past" ? past : current);
  const ordered = tab === "past" ? [...groups].reverse() : groups;

  // --- 공통 렌더 조각 ---
  const renderCapacity = (label: string, taken: number, max?: number) => {
    const full = max !== undefined && taken >= max;
    return (
      <div
        className={`px-3.5 py-2 rounded-xl border-2 font-black text-sm flex items-center gap-2 ${
          label === "남자"
            ? "border-blue-100 bg-blue-50 text-blue-700"
            : "border-red-100 bg-red-50 text-red-600"
        }`}
      >
        {label}
        <span className="text-gray-800">
          {taken}/{max ?? "?"}
        </span>
        {full && (
          <span className="text-[11px] bg-gray-800 text-white px-2 py-0.5 rounded-full">
            마감
          </span>
        )}
      </div>
    );
  };

  const renderActions = (res: any) => (
    <div className="flex gap-1.5 shrink-0">
      <button
        onClick={() => openSms(res)}
        disabled={busyId === res.id}
        title="예약 안내 문자 발송"
        className="p-2.5 rounded-xl bg-blue-50 text-[#4A628A] hover:bg-[#4A628A] hover:text-white transition disabled:opacity-40"
      >
        <Send size={16} />
      </button>
      {isCancelled(res) ? (
        <>
          <button
            onClick={() => handleStatus(res, "confirmed")}
            disabled={busyId === res.id}
            title="예약 복구"
            className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition disabled:opacity-40"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => handleHardDelete(res)}
            disabled={busyId === res.id}
            title="완전 삭제 (되돌릴 수 없음)"
            className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-700 hover:text-white transition disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        </>
      ) : (
        <button
          onClick={() => handleStatus(res, "cancelled")}
          disabled={busyId === res.id}
          title="예약 취소"
          className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-40"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  );

  const renderNotes = (res: any) => (
    <div className="space-y-2 text-xs md:text-sm text-gray-700 max-h-40 overflow-y-auto pr-1">
      {res.expectations && (
        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 leading-relaxed">
          <span className="font-black text-blue-700 mr-1.5">[기대]</span>
          {res.expectations}
        </div>
      )}
      {res.questions && (
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 leading-relaxed">
          <span className="font-black text-gray-600 mr-1.5">[궁금]</span>
          {res.questions}
        </div>
      )}
      {!res.expectations && !res.questions && (
        <span className="text-gray-400 italic bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold inline-block">
          미작성
        </span>
      )}
    </div>
  );

  const renderBadges = (res: any) => (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
          res.gender === "남자"
            ? "bg-blue-100 text-blue-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {res.gender}
      </span>
      {isCancelled(res) && (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-gray-800 text-white">
          취소됨
        </span>
      )}
    </div>
  );

  const bytes = smsBytes(smsText);
  const isLms = bytes > 90;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 문자 발송 팝업 */}
      {smsTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center md:p-6"
          onClick={() => !sending && setSmsTarget(null)}
        >
          <div
            className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-[#4A628A] text-white">
              <h3 className="font-black text-lg flex items-center gap-2">
                <Send size={18} /> 예약 안내 문자 발송
              </h3>
              <button
                onClick={() => setSmsTarget(null)}
                disabled={sending}
                className="p-1 rounded-lg hover:bg-white/20 transition disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <span className="text-xs font-black text-gray-400 shrink-0">
                  받는 사람
                </span>
                <span className="font-black text-gray-800">
                  {smsTarget.user_name}
                </span>
                <span className="text-gray-500 font-medium">
                  {smsTarget.user_phone}
                </span>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="text-sm font-black text-gray-600">
                    보낼 내용
                  </label>
                  <span
                    className={`text-xs font-black ${isLms ? "text-amber-600" : "text-gray-400"}`}
                  >
                    {bytes}바이트 · {isLms ? "장문(LMS)" : "단문(SMS)"}
                  </span>
                </div>
                <textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  rows={7}
                  className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm leading-relaxed text-gray-800 outline-none focus:border-[#4A628A] resize-none"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  90바이트(한글 45자)를 넘으면 장문으로 발송됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setSmsTarget(null)}
                disabled={sending}
                className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={sendSms}
                disabled={sending}
                className="flex-1 bg-[#4A628A] text-white py-3.5 rounded-xl font-black hover:bg-[#3A4D6D] transition disabled:opacity-50"
              >
                {sending ? "발송 중..." : "발송하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex gap-2">
          {(
            [
              ["current", `📊 진행 중 예약 (${current.length})`],
              ["past", `🗂️ 지난 기록 (${past.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 rounded-xl text-sm md:text-base font-black transition ${
                tab === key
                  ? "bg-[#4A628A] text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchAll}
          className="bg-gray-100 text-gray-700 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm md:text-base font-bold hover:bg-gray-200 transition active:scale-95"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold">
          데이터를 불러오는 중입니다...
        </div>
      ) : ordered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-20 text-center text-gray-400 font-bold">
          {tab === "past"
            ? "지난 예약 기록이 없습니다."
            : "아직 접수된 예약이 없습니다."}
        </div>
      ) : (
        <div className="space-y-6">
          {ordered.map(({ date, rows, male, female }) => {
            const schedule = scheduleOf(date);
            const dateObj = parseISO(date);

            return (
              <section
                key={date}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* 날짜 헤더 + 정원 현황 */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-5 border-b border-gray-100 bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2.5 rounded-full text-[#4A628A] shadow-sm">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-800 text-lg">
                        {format(dateObj, "yyyy년 MM월 dd일")}{" "}
                        <span className="text-gray-400">
                          ({WEEKDAYS[getDay(dateObj)]})
                        </span>
                      </h2>
                      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-500 mt-0.5">
                        <Clock size={14} />{" "}
                        {schedule?.session_time || "오전 10시"}
                        {schedule && !schedule.is_open && (
                          <span className="text-gray-400">· 접수 닫힘</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {renderCapacity("남자", male, schedule?.max_male)}
                    {renderCapacity("여자", female, schedule?.max_female)}
                  </div>
                </div>

                {/* 📱 모바일: 카드 */}
                <div className="md:hidden p-4 space-y-4">
                  {rows.map((res) => (
                    <div
                      key={res.id}
                      className={`rounded-2xl p-4 border ${
                        isCancelled(res)
                          ? "border-gray-200 bg-gray-50 opacity-60"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3 gap-2">
                        {renderBadges(res)}
                        {renderActions(res)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 bg-gray-50 p-3 rounded-xl">
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 mb-1">
                            예약자
                          </p>
                          <p className="font-black text-gray-800 flex items-center gap-1.5">
                            <User size={14} className="text-gray-400" />{" "}
                            {res.user_name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Phone size={14} className="text-gray-400" />{" "}
                            {res.user_phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 mb-1">
                            소속 / 나이
                          </p>
                          <p className="font-black text-gray-800 flex items-center gap-1.5">
                            <Users size={14} className="text-gray-400" />{" "}
                            {res.cell}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 ml-5">
                            {res.age}세
                          </p>
                        </div>
                      </div>

                      {renderNotes(res)}
                    </div>
                  ))}
                </div>

                {/* 💻 PC: 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-black text-gray-700 w-56">
                          예약자 정보
                        </th>
                        <th className="px-6 py-4 font-black text-gray-700 w-36">
                          소속 / 나이
                        </th>
                        <th className="px-6 py-4 font-black text-gray-700">
                          사전 질문 및 기대사항
                        </th>
                        <th className="px-6 py-4 font-black text-gray-700 text-center w-32">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((res) => (
                        <tr
                          key={res.id}
                          className={`hover:bg-gray-50 transition ${
                            isCancelled(res) ? "opacity-50" : ""
                          }`}
                        >
                          <td className="px-6 py-4 align-top">
                            <div className="mb-2">{renderBadges(res)}</div>
                            <div className="flex items-center gap-1.5 font-black text-gray-800 mb-1 text-base">
                              <User size={16} className="text-gray-400" />{" "}
                              {res.user_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                              <Phone size={14} className="text-gray-400" />{" "}
                              {res.user_phone}
                            </div>
                          </td>

                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-1.5 font-bold text-gray-800 mb-1.5 text-base">
                              <Users size={16} className="text-gray-400" />{" "}
                              {res.cell}
                            </div>
                            <div className="text-gray-500 text-sm font-medium pl-[22px]">
                              {res.age}세
                            </div>
                          </td>

                          <td className="px-6 py-4 align-top">
                            {renderNotes(res)}
                          </td>

                          <td className="px-6 py-4 align-top">
                            <div className="flex justify-center">
                              {renderActions(res)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
