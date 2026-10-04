"use client";

import { useState, useEffect, useRef } from "react";
import { format, parseISO, getDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import { formatPhone } from "@/lib/phone";
import { BANK_ACCOUNT } from "@/lib/message";
import { ChevronLeft, CalendarDays, Clock, Copy, CheckCircle2 } from "lucide-react";

// Tailwind 가 클래스를 찾을 수 있도록 전체 이름으로 적어 둡니다.
// 강조색은 brand 하나만. 성별 색은 작은 글씨에만 씁니다.
const SEAT_TONE = {
  남자: {
    idle: "border-gray-100 bg-white text-male hover:border-brand/40",
    on: "border-brand bg-brand text-white shadow-brand",
  },
  여자: {
    idle: "border-gray-100 bg-white text-female hover:border-brand/40",
    on: "border-brand bg-brand text-white shadow-brand",
  },
};

const copyAccount = async () => {
  try {
    await navigator.clipboard.writeText(BANK_ACCOUNT.replace(/\D/g, ""));
    alert("계좌번호를 복사했습니다.");
  } catch {
    alert(`복사에 실패했습니다. 직접 적어 주세요.\n${BANK_ACCOUNT}`);
  }
};

export default function Home() {
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  // 예약자 명단이 아니라 "날짜/성별별 예약 수" 만 받아옵니다.
  const [seats, setSeats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);
  const [selectedGenderSeat, setSelectedGenderSeat] = useState<string | null>(
    null,
  );

  // 예약 완료 후 보여줄 확인 화면 정보
  const [done, setDone] = useState<{
    name: string;
    date: string;
    time: string;
    smsSent: boolean;
  } | null>(null);

  const [userPhone, setUserPhone] = useState("");
  const [gender, setGender] = useState("남자");
  const [isAgreed, setIsAgreed] = useState<boolean | null>(null);

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  // 최신 잔여석을 받아오고, 방금 받은 값을 그대로 돌려준다.
  const fetchSeats = async () => {
    const { data } = await supabase.rpc("sozo_seat_counts");
    const rows = data ?? [];
    setSeats(rows);
    return rows;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: availData } = await supabase
        .from("sozo_availability")
        .select("*")
        .eq("is_open", true)
        .gte("target_date", format(new Date(), "yyyy-MM-dd")) // 지난 일정은 숨김
        .order("target_date", { ascending: true });

      if (availData) setAvailabilities(availData);

      await fetchSeats();
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const takenSeats = (rows: any[], targetDate: string, g: string) =>
    Number(
      rows.find((s) => s.target_date === targetDate && s.gender === g)?.taken ??
        0,
    );

  const getRemainingSeats = (
    targetDate: string,
    maxMale: number,
    maxFemale: number,
  ) => ({
    remainMale: maxMale - takenSeats(seats, targetDate, "남자"),
    remainFemale: maxFemale - takenSeats(seats, targetDate, "여자"),
  });

  const resetForm = () => {
    setUserPhone("");
    setIsAgreed(null);
  };

  const handleBack = () => {
    lastClick.current = "";
    setSelectedDayInfo(null);
    setSelectedGenderSeat(null);
    resetForm();
  };

  const FULL_MESSAGE =
    "죄송합니다. 방금 다른 분께서 예약을 완료하셔서 해당 예약이 마감되었습니다. \n다른 예약일정을 선택해 주시기 바랍니다.";

  // 가장 마지막에 누른 자리. 늦게 도착한 확인 결과가 다른 자리를 닫지 않게 합니다.
  const lastClick = useRef("");

  const handleSeatClick = async (dayInfo: any, selectedGender: string) => {
    // 폼은 바로 열고(기다림 없음), 잔여석 재확인은 뒤에서 합니다.
    const key = `${dayInfo.id}:${selectedGender}`;
    lastClick.current = key;
    setDone(null);
    setSelectedDayInfo(dayInfo);
    setSelectedGenderSeat(selectedGender);
    setGender(selectedGender);
    // 모바일에서는 목록 아래쪽에서 눌러도 폼 맨 위부터 보이게
    window.scrollTo(0, 0);

    // 화면이 오래됐을 수 있으니 다시 확인 (최종 판정은 신청 시 DB가 함)
    const maxSeat =
      selectedGender === "남자" ? dayInfo.max_male : dayInfo.max_female;
    const fresh = await fetchSeats();
    if (
      lastClick.current === key &&
      takenSeats(fresh, dayInfo.target_date, selectedGender) >= maxSeat
    ) {
      alert(FULL_MESSAGE);
      handleBack();
    }
  };

  const handleReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDayInfo || isLoading) return;
    if (isAgreed !== true)
      return alert("소조사역 내용에 동의하셔야 예약이 가능합니다.");

    // 글자 칸은 입력할 때마다 화면 전체가 다시 그려지지 않도록(버벅임 방지)
    // 상태로 들고 있지 않고, 제출할 때 한 번에 읽습니다.
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    const userName = f.userName ?? "";

    setIsLoading(true);

    // 정원 확인 + 등록은 DB 함수가 한 번에 처리하고(동시 신청에도 초과 없음),
    // 안내 문자는 서버가 등록 성공 시에만 보냅니다.
    let json: { success?: boolean; smsSent?: boolean; error?: string } = {};
    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: selectedDayInfo.target_date,
          userName,
          userPhone,
          gender,
          userCell: f.userCell,
          userAge: f.userAge,
          expectations: f.expectations ?? "",
          questions: f.questions ?? "",
        }),
      });
      json = await res.json();
    } catch {
      json = { error: "NETWORK" };
    }

    if (!json.success) {
      await fetchSeats();
      if (json.error === "FULL") {
        alert(FULL_MESSAGE);
        handleBack();
      } else if (json.error === "CLOSED") {
        alert("현재 예약을 받고 있지 않은 일정입니다.");
        handleBack();
      } else if (json.error === "DUPLICATE") {
        alert("이 번호로 같은 날짜에 이미 예약되어 있습니다.");
      } else if (json.error === "INVALID") {
        alert("입력하신 내용을 다시 확인해 주세요. (연락처 11자리 등)");
      } else {
        alert(
          "예약 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요. 계속되면 담당자에게 문의해 주세요.",
        );
      }
      setIsLoading(false);
      return;
    }

    const confirmed = {
      name: userName,
      date: selectedDayInfo.target_date,
      time: selectedDayInfo.session_time || "오전 10시",
      smsSent: json.smsSent !== false,
    };
    await fetchSeats();
    handleBack();
    setDone(confirmed);
    setIsLoading(false);
    window.scrollTo(0, 0);
  };

  const renderSeat = (day: any, g: "남자" | "여자", remain: number) => {
    const selected = selectedGenderSeat === g && selectedDayInfo?.id === day.id;
    const open = remain > 0;
    return (
      <button
        onClick={() => open && handleSeatClick(day, g)}
        disabled={!open || isLoading}
        aria-label={open ? `${g} ${remain}자리 남음, 신청하기` : `${g} 마감`}
        className={`w-[76px] py-2 flex flex-col items-center rounded-xl border-2 transition active:scale-95 ${
          !open
            ? "border-transparent bg-gray-100 text-gray-400 cursor-not-allowed"
            : selected
              ? SEAT_TONE[g].on
              : SEAT_TONE[g].idle
        }`}
      >
        <span className="text-xs font-bold">{g}</span>
        <span
          className={`text-base font-bold leading-tight ${open && !selected ? "text-gray-900" : ""}`}
        >
          {open ? `${remain}자리` : "마감"}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-start md:items-center justify-center p-0 md:p-6 lg:p-10 font-sans">
      <div className="max-w-6xl w-full bg-white md:rounded-[24px] md:shadow-card-lg md:overflow-hidden flex flex-col md:flex-row min-h-[100dvh] md:min-h-0 md:h-[850px]">
        {/* ==========================================
            좌측: 날짜 리스트 영역
        ========================================== */}
        <div
          className={`w-full md:w-[45%] flex flex-col border-r border-gray-100 bg-gray-50 ${selectedGenderSeat || done ? "hidden md:flex" : "flex"}`}
        >
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#6b7bff_0%,#8a7bff_55%,#9d8bff_100%)] text-white px-6 py-6 md:px-8 md:py-7 shrink-0">
            {/* MARF 안내 페이지와 같은 은은한 빛 */}
            <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_70%)]" />
            <h1 className="text-[28px] md:text-3xl font-extrabold tracking-[-0.03em]">
              SOZO 예약
            </h1>
            <p className="text-[15px] font-semibold opacity-95 mt-1">
              날짜 옆 남자 / 여자 자리를 눌러 신청하세요.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold bg-white/20 px-3 py-1.5 rounded-full">
              <Clock size={13} /> 세션 90분
            </span>
          </div>

          <div className="flex-1 md:overflow-y-auto p-4 md:p-6 space-y-4">
            {isLoading && availabilities.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-lg font-bold">
                잠시만 기다려주세요...
              </div>
            ) : availabilities.length === 0 ? (
              <div className="bg-white text-red-600 p-8 rounded-2xl text-center text-lg font-bold border-2 border-red-100 shadow-sm">
                현재 예약 가능한 일정이 없습니다. <br /> 다음 사역 오픈을
                기다려주세요!
              </div>
            ) : (
              <div className="pb-10">
                <ul className="bg-white rounded-[20px] shadow-card divide-y divide-gray-100 overflow-hidden">
                  {availabilities.map((day) => {
                    const dateObj = parseISO(day.target_date);
                    const { remainMale, remainFemale } = getRemainingSeats(
                      day.target_date,
                      day.max_male,
                      day.max_female,
                    );
                    const soldOut = remainMale <= 0 && remainFemale <= 0;

                    return (
                      <li
                        key={day.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 ${soldOut ? "bg-gray-50" : ""}`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`text-lg font-bold leading-tight ${soldOut ? "text-gray-400" : "text-gray-900"}`}
                          >
                            {format(dateObj, "M월 d일")}{" "}
                            <span className="text-gray-400 font-bold">
                              ({WEEKDAYS[getDay(dateObj)]})
                            </span>
                          </p>
                          <p className="flex items-center gap-1 text-sm font-bold text-gray-500 mt-0.5">
                            <Clock size={13} /> {day.session_time || "오전 10시"}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {renderSeat(day, "남자", remainMale)}
                          {renderSeat(day, "여자", remainFemale)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            우측: 예약 폼 영역
        ========================================== */}
        <div
          className={`w-full md:w-[55%] flex flex-col bg-gray-50 ${selectedGenderSeat || done ? "flex" : "hidden md:flex"}`}
        >
          {done ? (
            <div className="flex-1 md:overflow-y-auto p-6 md:p-10 animate-fade-in">
              <div className="flex flex-col items-center text-center pt-6 md:pt-10">
                <CheckCircle2 size={64} className="text-brand mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  예약이 완료되었습니다
                </h2>
                <p className="text-lg text-gray-600 font-medium mt-2">
                  {done.name}님, 감사합니다.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border-2 border-gray-100 divide-y divide-gray-100">
                <div className="flex justify-between gap-4 p-5 text-lg">
                  <span className="font-bold text-gray-500">일정</span>
                  <span className="font-bold text-gray-900 text-right">
                    {format(parseISO(done.date), "yyyy년 MM월 dd일")} (
                    {WEEKDAYS[getDay(parseISO(done.date))]}) {done.time}
                  </span>
                </div>
                <div className="p-5 text-lg space-y-3">
                  <div className="flex justify-between gap-4">
                    <span className="font-bold text-gray-500 shrink-0">
                      후원금
                    </span>
                    <span className="font-bold text-gray-900 text-right">
                      3만원, 신청자 성함으로 입금
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-4">
                    <span className="font-bold text-gray-800">
                      {BANK_ACCOUNT}
                    </span>
                    <button
                      type="button"
                      onClick={copyAccount}
                      className="shrink-0 flex items-center gap-1.5 bg-brand text-white text-base font-bold px-4 py-2.5 rounded-xl active:scale-95 transition"
                    >
                      <Copy size={16} /> 복사
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-base text-gray-500 font-medium mt-5 text-center">
                {done.smsSent
                  ? "같은 내용을 문자로도 보내드렸습니다."
                  : "안내 문자 발송에 실패했습니다. 이 화면을 캡처해 두세요."}
              </p>

              <button
                type="button"
                onClick={() => setDone(null)}
                className="md:hidden w-full mt-8 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl text-lg"
              >
                처음으로
              </button>
            </div>
          ) : selectedGenderSeat && selectedDayInfo ? (
            <div className="flex-1 md:overflow-y-auto p-6 md:p-10 animate-fade-in relative">
              <button
                type="button"
                onClick={handleBack}
                className="md:hidden flex items-center gap-2 text-gray-500 font-bold text-lg hover:text-gray-800 transition mb-6"
              >
                <ChevronLeft size={24} /> 뒤로 가서 날짜 다시 선택하기
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 p-5 rounded-[20px] bg-brand-soft mb-8">
                <div>
                  <p className="text-sm font-semibold text-brand">신청하는 일정</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 mt-0.5">
                    {format(parseISO(selectedDayInfo.target_date), "M월 d일")}{" "}
                    ({WEEKDAYS[getDay(parseISO(selectedDayInfo.target_date))]}){" "}
                    <span className="whitespace-nowrap">
                      {selectedDayInfo.session_time || "오전 10시"}
                    </span>
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap bg-white px-3 py-1.5 rounded-full text-sm font-bold ${gender === "남자" ? "text-male" : "text-female"}`}
                >
                  {gender}석
                </span>
              </div>

              <form onSubmit={handleReservation} className="space-y-10 pb-10">
                {/* 1. 개인정보 */}
                <div className="bg-white p-6 md:p-8 rounded-[20px] shadow-card space-y-6">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-4 text-xl md:text-2xl">
                    1. 개인정보 입력
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="userName" className="block text-base md:text-lg font-bold text-gray-700 ml-1">
                        성함
                      </label>
                      <input
                        id="userName"
                        type="text"
                        autoComplete="name"
                        maxLength={30}
                        name="userName"
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-brand bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="예: 홍길동"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="userCell" className="block text-base md:text-lg font-bold text-gray-700 ml-1">
                        소속셀
                      </label>
                      <input
                        id="userCell"
                        type="text"
                        maxLength={30}
                        name="userCell"
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-brand bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="예: 1A16"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="userAge" className="block text-base md:text-lg font-bold text-gray-700 ml-1">
                        나이
                      </label>
                      <input
                        id="userAge"
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        name="userAge"
                        // 숫자만 남김 (화면 전체를 다시 그리지 않도록 상태 대신 직접 수정)
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.value = el.value.replace(/\D/g, "");
                        }}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-brand bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="예: 32"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="userPhone" className="block text-base md:text-lg font-bold text-gray-700 ml-1">
                        연락처
                      </label>
                      <input
                        id="userPhone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        pattern="01\d-\d{3,4}-\d{4}"
                        title="010-1234-5678 형식으로 입력해 주세요."
                        value={userPhone}
                        maxLength={13}
                        onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-brand bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="010-1234-5678"
                      />
                      <p className="text-sm md:text-base text-gray-500 font-medium ml-1 mt-2">
                        * 안내 문자를 받을 수 있는 번호를 정확히 적어주세요.
                        <br />* 숫자만 누르셔도 - 이 자동으로 들어갑니다.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl mt-4">
                    <p className="text-base md:text-lg text-amber-800 font-bold leading-relaxed">
                      ⚠️ 꼭 확인해 주세요!
                      <br />
                      예약이 확정된 후에는{" "}
                      <span className="text-red-600 underline">
                        날짜 변경이 어렵습니다.
                      </span>{" "}
                      일정을 다시 한번 꼼꼼히 확인해 주세요.
                    </p>
                  </div>
                </div>

                {/* 2. 사역 안내 및 동의 */}
                <div className="bg-white p-6 md:p-8 rounded-[20px] shadow-card space-y-6">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-4 text-xl md:text-2xl">
                    2. 소조 사역 안내 및 동의
                  </h3>
                  <ul className="text-lg md:text-xl text-gray-700 space-y-4 bg-gray-50 p-6 rounded-2xl leading-loose font-medium border border-gray-200">
                    <li className="flex gap-2 items-start">
                      <span className="text-brand font-bold mt-1">•</span>{" "}
                      <span>소조 세션은 90분입니다.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-brand font-bold mt-1">•</span>{" "}
                      <span>
                        소조 세션은 3만원의 후원금을 받고 있습니다. 이 후원금은
                        소조사역 운영 및 사역자 훈련비용, 더 어려운 곳의 영혼을
                        섬기는데 쓰입니다.
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-red-500 font-bold mt-1">•</span>{" "}
                      <span>
                        <span className="text-red-600 font-bold underline">
                          신청하시는 분 성함으로 입금하여 주시기 바랍니다.
                        </span>{" "}
                        신청 후에는 환불되지 않습니다. <br />
                        <span className="inline-flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-bold">{BANK_ACCOUNT}</span>
                          <button
                            type="button"
                            onClick={copyAccount}
                            className="inline-flex items-center gap-1 text-sm font-bold text-brand bg-white border border-gray-300 px-3 py-1.5 rounded-lg active:scale-95 transition"
                          >
                            <Copy size={14} /> 복사
                          </button>
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-brand font-bold mt-1">•</span>{" "}
                      <span>
                        소조 세션에는 인도하는 사역자 1인과 중보자(최소 1명)가
                        세션에 팀으로 함께 할 수도 있습니다. 중보자는 세션 중
                        중요 내용을 적어서 후에 제공할 수 있고, 중보로 세션을
                        돕습니다.{" "}
                        <strong className="text-black bg-yellow-100 px-1">
                          세션 진행 중 개인녹음은 불가합니다.
                        </strong>
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-brand font-bold mt-1">•</span>{" "}
                      <span>
                        아래의 사역은 귀하의 자발적인 참여를 통해 이루어집니다.
                        따라서 사역자는 귀하의 참여를 기대하기 어렵다고 판단할
                        경우, 사역을 중단할 수 있습니다.
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-brand font-bold mt-1">•</span>{" "}
                      <span>
                        소조는 성령님이 주도하시는 성령 사역이며, 모든
                        사역자들은 상담 관련 자격증 보유자가 아닐 수 있으며 의학
                        또는 카운슬링 분야에서의 전문가들이 아닐 수도 있습니다.
                      </span>
                    </li>
                  </ul>
                  <div className="p-6 bg-brand/5 border-2 border-brand/20 rounded-2xl text-center">
                    <p className="text-lg md:text-xl font-bold text-gray-800 mb-6 leading-relaxed">
                      * 본인은 위의 내용을 모두 이해하고 나의 자발적인 의지로
                      소조를 받고자 신청하며, 수원 하나교회 및 소조 사역자는
                      사역 내용에 대하여 어떠한 법적인 책임이 없음을 확인합니다.
                    </p>
                    <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-10">
                      <label className="flex items-center justify-center gap-3 cursor-pointer p-4 bg-white rounded-xl border-2 border-brand/20 hover:border-brand transition">
                        <input
                          type="radio"
                          checked={isAgreed === true}
                          onChange={() => setIsAgreed(true)}
                          className="w-6 h-6 accent-brand"
                        />{" "}
                        <span className="text-xl font-bold text-brand">
                          동의한다
                        </span>
                      </label>
                      <label className="flex items-center justify-center gap-3 cursor-pointer p-4 bg-white rounded-xl border-2 border-red-100 hover:border-red-400 transition">
                        <input
                          type="radio"
                          checked={isAgreed === false}
                          onChange={() => setIsAgreed(false)}
                          className="w-6 h-6 accent-red-500"
                        />{" "}
                        <span className="text-xl font-bold text-red-500">
                          동의하지 않는다
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. 사전 질문 */}
                {isAgreed && (
                  <div className="animate-fade-in space-y-6 bg-white p-6 md:p-8 rounded-[20px] shadow-card">
                    <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-4 text-xl md:text-2xl">
                      3. 사전 질문 (선택사항)
                    </h3>
                    <div className="space-y-3">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        소조사역을 통해 기대하는 것
                      </label>
                      <textarea
                        name="expectations"
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg h-32 outline-none focus:border-brand bg-gray-50 focus:bg-white resize-none"
                        placeholder="자유롭게 적어주세요."
                      />
                    </div>
                    <div className="space-y-3 pt-4">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        소조사역과 관련 궁금한 것
                      </label>
                      <textarea
                        name="questions"
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg h-32 outline-none focus:border-brand bg-gray-50 focus:bg-white resize-none"
                        placeholder="자유롭게 적어주세요."
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isAgreed !== true || isLoading}
                  className="w-full bg-brand text-white font-bold py-6 rounded-2xl shadow-brand hover:bg-brand-dark transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none text-xl md:text-2xl mt-4"
                >
                  {isLoading ? "예약 처리 중입니다..." : "예약 완료하기"}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-300">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CalendarDays size={44} className="text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-400">
                왼쪽에서 날짜와 자리를 고르면
                <br />
                신청서가 여기에 열립니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
