"use client";

import { useState, useEffect } from "react";
import { format, parseISO, getDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  UserCircle2,
  CalendarDays,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";

export default function Home() {
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);
  const [selectedGenderSeat, setSelectedGenderSeat] = useState<string | null>(
    null,
  );

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const [userName, setUserName] = useState("");
  const [userCell, setUserCell] = useState("");
  const [userAge, setUserAge] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [gender, setGender] = useState("남자");
  const [isAgreed, setIsAgreed] = useState<boolean | null>(null);
  const [expectations, setExpectations] = useState("");
  const [questions, setQuestions] = useState("");

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: availData } = await supabase
        .from("sozo_availability")
        .select("*")
        .eq("is_open", true)
        .order("target_date", { ascending: true });

      if (availData) setAvailabilities(availData);

      const { data: resData } = await supabase
        .from("sozo_reservations")
        .select("*");

      if (resData) setReservations(resData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const getRemainingSeats = (
    targetDate: string,
    maxMale: number,
    maxFemale: number,
  ) => {
    const dayReservations = reservations.filter(
      (r) => r.target_date === targetDate,
    );
    const bookedMale = dayReservations.filter(
      (r) => r.gender === "남자",
    ).length;
    const bookedFemale = dayReservations.filter(
      (r) => r.gender === "여자",
    ).length;
    return {
      remainMale: maxMale - bookedMale,
      remainFemale: maxFemale - bookedFemale,
    };
  };

  const resetForm = () => {
    setUserName("");
    setUserCell("");
    setUserAge("");
    setUserPhone("");
    setIsAgreed(null);
    setExpectations("");
    setQuestions("");
  };

  const handleBack = () => {
    setSelectedDayInfo(null);
    setSelectedGenderSeat(null);
    resetForm();
  };

  const handleSeatClick = async (dayInfo: any, selectedGender: string) => {
    setIsLoading(true);

    const maxSeat =
      selectedGender === "남자" ? dayInfo.max_male : dayInfo.max_female;

    const { data: currentReservations, error: checkError } = await supabase
      .from("sozo_reservations")
      .select("id")
      .eq("target_date", dayInfo.target_date)
      .eq("gender", selectedGender);

    if (checkError) {
      alert("좌석 상태를 확인하는 중 오류가 발생했습니다.");
      setIsLoading(false);
      return;
    }

    if (currentReservations && currentReservations.length >= maxSeat) {
      alert(
        "죄송합니다. 방금 다른 분께서 예약을 완료하셔서 해당 예약이 마감되었습니다. \n다른 예약일정을 선택해 주시기 바랍니다.",
      );

      const { data: resData } = await supabase
        .from("sozo_reservations")
        .select("*");
      if (resData) setReservations(resData);

      setIsLoading(false);
      return;
    }

    setSelectedDayInfo(dayInfo);
    setSelectedGenderSeat(selectedGender);
    setGender(selectedGender);
    setIsLoading(false);
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayInfo || isLoading) return;
    if (isAgreed !== true)
      return alert("소조사역 내용에 동의하셔야 예약이 가능합니다.");

    setIsLoading(true);

    const maxSeat =
      gender === "남자" ? selectedDayInfo.max_male : selectedDayInfo.max_female;
    const { data: finalCheck, error: finalError } = await supabase
      .from("sozo_reservations")
      .select("id")
      .eq("target_date", selectedDayInfo.target_date)
      .eq("gender", gender);

    if (!finalError && finalCheck && finalCheck.length >= maxSeat) {
      alert(
        "죄송합니다. 방금 다른 분께서 예약을 완료하셔서 해당 예약이 마감되었습니다. \n다른 예약일정을 선택해 주시기 바랍니다.",
      );
      const { data: resData } = await supabase
        .from("sozo_reservations")
        .select("*");
      if (resData) setReservations(resData);
      handleBack();
      setIsLoading(false);
      return;
    }

    // 찐 예약 진행
    const { error } = await supabase.from("sozo_reservations").insert([
      {
        target_date: selectedDayInfo.target_date,
        user_name: userName,
        user_phone: userPhone,
        gender: gender,
        cell: userCell,
        age: userAge,
        expectations: expectations,
        questions: questions,
      },
    ]);

    if (error) {
      alert("예약 중 오류가 발생했습니다.");
      setIsLoading(false);
    } else {
      try {
        await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: userName,
            userPhone: userPhone,
            targetDate: selectedDayInfo.target_date,
            sessionTime: selectedDayInfo.session_time || "오전 10시",
          }),
        });
      } catch (smsError) {
        console.error("문자 발송 실패:", smsError);
      }

      alert(
        "예약이 성공적으로 완료되었습니다!\n곧 문자로 안내가 발송될 예정입니다. 감사합니다.",
      );
      const { data: resData } = await supabase
        .from("sozo_reservations")
        .select("*");
      if (resData) setReservations(resData);

      handleBack();
      setIsLoading(false);
    }
  };

  const toggleDate = (id: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllExpanded =
    availabilities.length > 0 && expandedDates.size === availabilities.length;
  const toggleAll = () => {
    if (isAllExpanded) {
      setExpandedDates(new Set());
    } else {
      setExpandedDates(new Set(availabilities.map((a) => a.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start md:items-center justify-center p-0 md:p-6 lg:p-10 font-sans">
      <div className="max-w-6xl w-full bg-white md:rounded-3xl shadow-2xl md:overflow-hidden flex flex-col md:flex-row min-h-[100dvh] md:min-h-0 md:h-[850px] border-none md:border border-gray-100">
        {/* ==========================================
            좌측: 날짜 리스트 영역
        ========================================== */}
        <div
          className={`w-full md:w-[45%] flex flex-col border-r border-gray-200 bg-gray-50 ${selectedGenderSeat ? "hidden md:flex" : "flex"}`}
        >
          <div className="bg-[#4A628A] p-6 md:p-8 text-white shadow-md z-20 shrink-0 sticky top-0">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">
              SOZO 예약
            </h1>
            <p className="text-blue-100 text-base md:text-lg font-medium">
              원하시는 날짜를 선택해 주세요.
            </p>
          </div>

          <div className="flex-1 md:overflow-y-auto p-4 md:p-6 space-y-4">
            {isLoading ? (
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
                <div className="flex justify-end mb-3">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#4A628A] transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200"
                  >
                    <ChevronsUpDown size={16} />
                    {isAllExpanded ? "전체 접기" : "전체 펼치기"}
                  </button>
                </div>

                <div className="space-y-3">
                  {availabilities.map((day) => {
                    const dateObj = parseISO(day.target_date);
                    const dayOfWeek = WEEKDAYS[getDay(dateObj)];
                    const { remainMale, remainFemale } = getRemainingSeats(
                      day.target_date,
                      day.max_male,
                      day.max_female,
                    );
                    const displayTime = day.session_time || "오전 10시";
                    const isExpanded = expandedDates.has(day.id);

                    return (
                      <div
                        key={day.id}
                        className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                      >
                        <div
                          onClick={() => toggleDate(day.id)}
                          className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2.5 rounded-full text-[#4A628A]">
                              <CalendarDays size={24} />
                            </div>
                            <div>
                              <h2 className="text-lg md:text-xl font-black text-gray-800">
                                {format(dateObj, "yyyy년 MM월 dd일")}{" "}
                                <span className="text-gray-400 text-base md:text-lg">
                                  ({dayOfWeek})
                                </span>
                              </h2>
                              <div className="flex items-center gap-1.5 text-gray-600 font-bold mt-0.5 text-sm">
                                <Clock size={14} /> {displayTime} (90분 세션)
                              </div>
                            </div>
                          </div>
                          <div
                            className={`p-1.5 rounded-full transition-transform duration-300 ${isExpanded ? "bg-blue-50 text-[#4A628A]" : "bg-gray-50 text-gray-400"}`}
                          >
                            {isExpanded ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 md:px-5 md:pb-5 animate-fade-in border-t border-gray-100 pt-4 md:pt-5">
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() =>
                                  remainMale > 0 && handleSeatClick(day, "남자")
                                }
                                disabled={remainMale <= 0 || isLoading}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                  remainMale > 0
                                    ? selectedGenderSeat === "남자" &&
                                      selectedDayInfo?.id === day.id
                                      ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                                      : "border-blue-100 bg-blue-50/50 hover:bg-blue-100 cursor-pointer"
                                    : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <span
                                  className={`text-sm font-bold mb-1 ${selectedGenderSeat === "남자" && selectedDayInfo?.id === day.id ? "text-blue-100" : remainMale > 0 ? "text-blue-600" : "text-gray-400"}`}
                                >
                                  남자 잔여
                                </span>
                                <span
                                  className={`text-xl md:text-2xl font-black ${selectedGenderSeat === "남자" && selectedDayInfo?.id === day.id ? "text-white" : remainMale > 0 ? "text-gray-900" : "text-gray-400"}`}
                                >
                                  {remainMale > 0 ? `${remainMale}명` : "마감"}
                                </span>
                              </button>

                              <button
                                onClick={() =>
                                  remainFemale > 0 &&
                                  handleSeatClick(day, "여자")
                                }
                                disabled={remainFemale <= 0 || isLoading}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                  remainFemale > 0
                                    ? selectedGenderSeat === "여자" &&
                                      selectedDayInfo?.id === day.id
                                      ? "border-red-600 bg-red-500 text-white shadow-lg"
                                      : "border-red-100 bg-red-50/50 hover:bg-red-100 cursor-pointer"
                                    : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <span
                                  className={`text-sm font-bold mb-1 ${selectedGenderSeat === "여자" && selectedDayInfo?.id === day.id ? "text-red-100" : remainFemale > 0 ? "text-red-600" : "text-gray-400"}`}
                                >
                                  여자 잔여
                                </span>
                                <span
                                  className={`text-xl md:text-2xl font-black ${selectedGenderSeat === "여자" && selectedDayInfo?.id === day.id ? "text-white" : remainFemale > 0 ? "text-gray-900" : "text-gray-400"}`}
                                >
                                  {remainFemale > 0
                                    ? `${remainFemale}명`
                                    : "마감"}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            우측: 예약 폼 영역
        ========================================== */}
        <div
          className={`w-full md:w-[55%] flex flex-col bg-white ${selectedGenderSeat ? "flex" : "hidden md:flex"}`}
        >
          {selectedGenderSeat && selectedDayInfo ? (
            <div className="flex-1 md:overflow-y-auto p-6 md:p-10 animate-fade-in relative">
              <button
                type="button"
                onClick={handleBack}
                className="md:hidden flex items-center gap-2 text-gray-500 font-bold text-lg hover:text-gray-800 transition mb-6"
              >
                <ChevronLeft size={24} /> 뒤로 가서 날짜 다시 선택하기
              </button>

              <div
                className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl text-white font-black shadow-md ${gender === "남자" ? "bg-blue-600" : "bg-red-600"} gap-4 mb-8`}
              >
                <div className="text-xl md:text-2xl flex items-center gap-2">
                  {format(
                    parseISO(selectedDayInfo.target_date),
                    "yyyy년 MM월 dd일",
                  )}
                </div>
                <div className="flex items-center gap-2 text-xl md:text-2xl bg-white/20 px-4 py-2 rounded-xl">
                  {gender}석 예약 진행 중
                </div>
              </div>

              <form onSubmit={handleReservation} className="space-y-10 pb-10">
                {/* 1. 개인정보 */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-gray-100 shadow-sm space-y-6">
                  <h3 className="font-black text-[#4A628A] border-b-2 border-gray-100 pb-4 text-xl md:text-2xl">
                    1. 개인정보 입력
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        성함
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-[#4A628A] bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="예: 홍길동"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        소속셀
                      </label>
                      <input
                        type="text"
                        value={userCell}
                        onChange={(e) => setUserCell(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-[#4A628A] bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="예: 1A16"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        나이
                      </label>
                      <input
                        type="number"
                        value={userAge}
                        onChange={(e) => setUserAge(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-[#4A628A] bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="예: 32"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        연락처
                      </label>
                      <input
                        type="tel"
                        value={userPhone}
                        maxLength={13}
                        onChange={(e) =>
                          setUserPhone(e.target.value.replace(/[^0-9-]/g, ""))
                        }
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg outline-none focus:border-[#4A628A] bg-gray-50 focus:bg-white transition-all"
                        required
                        placeholder="010-1234-5678"
                      />
                      <p className="text-sm md:text-base text-gray-500 font-medium ml-1 mt-2">
                        * 안내 문자를 받을 수 있는 번호를 정확히 적어주세요.
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
                <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-gray-100 shadow-sm space-y-6">
                  <h3 className="font-black text-[#4A628A] border-b-2 border-gray-100 pb-4 text-xl md:text-2xl">
                    2. 소조 사역 안내 및 동의
                  </h3>
                  <ul className="text-lg md:text-xl text-gray-700 space-y-4 bg-gray-50 p-6 rounded-2xl leading-loose font-medium border border-gray-200">
                    <li className="flex gap-2 items-start">
                      <span className="text-[#4A628A] font-bold mt-1">•</span>{" "}
                      <span>소조 세션은 90분입니다.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#4A628A] font-bold mt-1">•</span>{" "}
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
                        <span className="font-bold">
                          국민은행 920301-01-728406 (하나교회)
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#4A628A] font-bold mt-1">•</span>{" "}
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
                      <span className="text-[#4A628A] font-bold mt-1">•</span>{" "}
                      <span>
                        아래의 사역은 귀하의 자발적인 참여를 통해 이루어집니다.
                        따라서 사역자는 귀하의 참여를 기대하기 어렵다고 판단할
                        경우, 사역을 중단할 수 있습니다.
                      </span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#4A628A] font-bold mt-1">•</span>{" "}
                      <span>
                        소조는 성령님이 주도하시는 성령 사역이며, 모든
                        사역자들은 상담 관련 자격증 보유자가 아닐 수 있으며 의학
                        또는 카운슬링 분야에서의 전문가들이 아닐 수도 있습니다.
                      </span>
                    </li>
                  </ul>
                  <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl text-center">
                    <p className="text-lg md:text-xl font-bold text-gray-800 mb-6 leading-relaxed">
                      * 본인은 위의 내용을 모두 이해하고 나의 자발적인 의지로
                      소조를 받고자 신청하며, 수원 하나교회 및 소조 사역자는
                      사역 내용에 대하여 어떠한 법적인 책임이 없음을 확인합니다.
                    </p>
                    <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-10">
                      <label className="flex items-center justify-center gap-3 cursor-pointer p-4 bg-white rounded-xl border-2 border-blue-100 hover:border-blue-400 transition">
                        <input
                          type="radio"
                          checked={isAgreed === true}
                          onChange={() => setIsAgreed(true)}
                          className="w-6 h-6 accent-[#4A628A]"
                        />{" "}
                        <span className="text-xl font-black text-[#4A628A]">
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
                        <span className="text-xl font-black text-red-500">
                          동의하지 않는다
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. 사전 질문 */}
                {isAgreed && (
                  <div className="animate-fade-in space-y-6 bg-white p-6 md:p-8 rounded-3xl border-2 border-gray-100 shadow-sm">
                    <h3 className="font-black text-[#4A628A] border-b-2 border-gray-100 pb-4 text-xl md:text-2xl">
                      3. 사전 질문 (선택사항)
                    </h3>
                    <div className="space-y-3">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        소조사역을 통해 기대하는 것
                      </label>
                      <textarea
                        value={expectations}
                        onChange={(e) => setExpectations(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg h-32 outline-none focus:border-[#4A628A] bg-gray-50 focus:bg-white resize-none"
                        placeholder="자유롭게 적어주세요."
                      />
                    </div>
                    <div className="space-y-3 pt-4">
                      <label className="text-base md:text-lg font-bold text-gray-700 ml-1">
                        소조사역과 관련 궁금한 것
                      </label>
                      <textarea
                        value={questions}
                        onChange={(e) => setQuestions(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg h-32 outline-none focus:border-[#4A628A] bg-gray-50 focus:bg-white resize-none"
                        placeholder="자유롭게 적어주세요."
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isAgreed !== true || isLoading}
                  className="w-full bg-[#4A628A] text-white font-black py-6 rounded-2xl shadow-xl hover:bg-[#3A4D6D] transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none text-xl md:text-2xl mt-4"
                >
                  {isLoading ? "예약 처리 중입니다..." : "예약 완료하기"}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-300">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <span className="text-5xl">📅</span>
              </div>
              <p className="text-xl font-bold text-gray-400">
                좌측 리스트에서 원하시는 날짜를 클릭하여
                <br />
                예약을 진행해 주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
