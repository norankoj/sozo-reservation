"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, UserCircle2 } from "lucide-react"; // 아이콘 추가
import "@/style/calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function Home() {
  const [dateValue, setDateValue] = useState<Value>(new Date());
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGenderSeat, setSelectedGenderSeat] = useState<string | null>(
    null,
  );

  const [userName, setUserName] = useState("");
  const [userCell, setUserCell] = useState("");
  const [userAge, setUserAge] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [gender, setGender] = useState("남자");
  const [isAgreed, setIsAgreed] = useState<boolean | null>(null);
  const [expectations, setExpectations] = useState("");
  const [questions, setQuestions] = useState("");

  useEffect(() => {
    const fetchOpenDates = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("sozo_availability")
        .select("*")
        .eq("is_open", true);
      if (data) setAvailabilities(data);
      setIsLoading(false);
    };
    fetchOpenDates();
  }, []);

  useEffect(() => {
    if (dateValue instanceof Date) {
      const targetDate = format(dateValue, "yyyy-MM-dd");
      const dayInfo = availabilities.find((a) => a.target_date === targetDate);
      setSelectedDayInfo(dayInfo || null);
      if (dayInfo) fetchReservations(targetDate);
      else setReservations([]);

      setUserName("");
      setUserCell("");
      setUserAge("");
      setUserPhone("");
      setIsAgreed(null);
      setExpectations("");
      setQuestions("");
      setSelectedGenderSeat(null);
    }
  }, [dateValue, availabilities]);

  const fetchReservations = async (targetDate: string) => {
    const { data } = await supabase
      .from("sozo_reservations")
      .select("*")
      .eq("target_date", targetDate);
    if (data) setReservations(data);
  };

  const bookedMale = reservations.filter((r) => r.gender === "남자").length;
  const bookedFemale = reservations.filter((r) => r.gender === "여자").length;
  const remainMale = selectedDayInfo
    ? selectedDayInfo.max_male - bookedMale
    : 0;
  const remainFemale = selectedDayInfo
    ? selectedDayInfo.max_female - bookedFemale
    : 0;

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayInfo || isLoading) return;
    if (isAgreed !== true)
      return alert("소조사역 내용에 동의하셔야 예약이 가능합니다.");
    setIsLoading(true);
    const targetDate = format(dateValue as Date, "yyyy-MM-dd");
    const { error } = await supabase.from("sozo_reservations").insert([
      {
        target_date: targetDate,
        user_name: userName,
        user_phone: userPhone,
        gender: gender,
        cell: userCell,
        age: userAge,
        expectations: expectations,
        questions: questions,
      },
    ]);
    if (error) alert("예약 중 오류가 발생했습니다.");
    else {
      alert("예약이 성공적으로 완료되었습니다!");
      fetchReservations(targetDate);
      setSelectedGenderSeat(null);
    }
    setIsLoading(false);
  };

  const SeatSelector = ({ isMobile }: { isMobile: boolean }) => (
    <div
      className={`grid grid-cols-2 gap-4 ${isMobile ? "mt-8 pb-10" : "mb-8"}`}
    >
      <button
        type="button"
        onClick={() =>
          remainMale > 0 && (setSelectedGenderSeat("남자"), setGender("남자"))
        }
        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center ${selectedGenderSeat === "남자" ? "border-2 border-blue-500 bg-blue-50 text-blue-600   shadow-lg" : remainMale > 0 ? "bg-white border-blue-100 text-blue-600 hover:border-blue-300" : "bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed text-gray-400"}`}
      >
        <span className="text-xs font-bold mb-1">남자 잔여</span>
        <span className="text-2xl font-black">
          {remainMale > 0 ? `${remainMale}명` : "마감"}
        </span>
      </button>
      <button
        type="button"
        onClick={() =>
          remainFemale > 0 && (setSelectedGenderSeat("여자"), setGender("여자"))
        }
        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center ${selectedGenderSeat === "여자" ? "border-2 border-red-500 bg-red-50 text-red-600 shadow-lg" : remainFemale > 0 ? "bg-white border-red-100 text-red-600 hover:border-red-300" : "bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed text-gray-400"}`}
      >
        <span className="text-xs font-bold mb-1">여자 잔여</span>
        <span className="text-2xl font-black">
          {remainFemale > 0 ? `${remainFemale}명` : "마감"}
        </span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-10">
      <div className="max-w-6xl w-full bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-screen md:h-[850px]">
        {/* --- 왼쪽: 달력 및 모바일용 버튼 --- */}
        <div
          className={`w-full md:w-[45%] p-6 md:p-10 bg-white border-r border-gray-100 flex flex-col overflow-y-auto ${selectedGenderSeat ? "hidden md:flex" : "flex"}`}
        >
          <h1 className="text-3xl font-black text-[#4A628A] mb-8 tracking-tighter">
            SOZO 예약
          </h1>
          <div className="flex-1">
            <Calendar
              onChange={setDateValue}
              value={dateValue}
              formatDay={(locale, date) => format(date, "d")}
              next2Label={null}
              prev2Label={null}
              tileDisabled={({ date }) =>
                !availabilities.some(
                  (a) => a.target_date === format(date, "yyyy-MM-dd"),
                )
              }
              tileContent={({ date, view }) => {
                if (
                  view === "month" &&
                  availabilities.some(
                    (a) => a.target_date === format(date, "yyyy-MM-dd"),
                  )
                ) {
                  return (
                    <div className="flex flex-col items-center justify-center mt-1">
                      <div className="w-1.5 h-1.5 bg-[#4A628A] rounded-full mb-0.5"></div>
                      <span className="text-[10px] font-bold text-[#4A628A]">
                        가능
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
          </div>
          {selectedDayInfo && (
            <div className="md:hidden">
              <SeatSelector isMobile={true} />
            </div>
          )}
        </div>

        {/* --- 오른쪽: 폼 영역 --- */}
        <div
          className={`w-full md:w-[55%] bg-gray-50 overflow-y-auto ${selectedGenderSeat ? "flex" : "hidden md:flex"}`}
        >
          <div className="p-6 md:p-10 w-full">
            {selectedDayInfo ? (
              <div className="space-y-8 animate-fade-in">
                {/* 모바일 전용 상단 네비게이션 */}
                <div className="md:hidden flex flex-col gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedGenderSeat(null)}
                    className="flex items-center gap-1 text-gray-400 font-bold"
                  >
                    <ChevronLeft size={20} /> 날짜 다시 선택하기
                  </button>
                  {/* 💡 모바일 전용 성별 확인 배너 */}
                  <div
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black shadow-lg ${gender === "남자" ? "bg-blue-50 text-blue-600 border border-blue-500" : "bg-red-50 text-red-600 border border-red-500"}`}
                  >
                    <UserCircle2 size={24} />
                    <span>{gender} 좌석 예약 진행 중</span>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-6 hidden md:block">
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                    {format(dateValue as Date, "yyyy년 MM월 dd일")} 예약
                  </h2>
                </div>

                {/* PC 전용 좌석 선택 버튼 */}
                <div className="hidden md:block">
                  <SeatSelector isMobile={false} />
                </div>

                {selectedGenderSeat && (
                  <form
                    onSubmit={handleReservation}
                    className="space-y-8 animate-fade-in"
                  >
                    {/* PC에서만 보이는 작은 성별 표시 배너 (상단 버튼이 활성화된 상태를 보조) */}
                    <div className="hidden md:flex items-center justify-between bg-white px-6 py-3 rounded-xl border border-gray-200 shadow-sm">
                      <span className="text-sm font-bold text-gray-500">
                        {format(dateValue as Date, "yyyy년 MM월 dd일")}
                      </span>
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full ${gender === "남자" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}
                      >
                        {gender} 선택됨
                      </span>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                      <h3 className="font-bold text-[#4A628A] border-b pb-2 mb-2 text-base">
                        1. 개인정보 입력
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">
                            성함
                          </label>
                          <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#4A628A] bg-gray-50 focus:bg-white"
                            required
                            placeholder="홍길동"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">
                            소속셀
                          </label>
                          <input
                            type="text"
                            value={userCell}
                            onChange={(e) => setUserCell(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#4A628A] bg-gray-50 focus:bg-white"
                            required
                            placeholder="예: 청년 1셀"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">
                            나이
                          </label>
                          <input
                            type="number"
                            value={userAge}
                            onChange={(e) => setUserAge(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#4A628A] bg-gray-50 focus:bg-white"
                            required
                            placeholder="32"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">
                            연락처
                          </label>
                          <input
                            type="tel"
                            value={userPhone}
                            maxLength={13}
                            onChange={(e) =>
                              setUserPhone(
                                e.target.value.replace(/[^0-9-]/g, ""),
                              )
                            }
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#4A628A] bg-gray-50 focus:bg-white"
                            required
                            placeholder="010-1234-5678"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">
                        * 문자발송을 받으실 수 있는 휴대전화 번호를 입력하여
                        주시기 바랍니다.
                      </p>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                          ⚠️ <strong>확인해 주세요!</strong> 예약 확정 시{" "}
                          <strong>날짜 변경이 어렵습니다.</strong> 일정을 다시
                          한번 확인하신 후 예약 버튼을 눌러주세요.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                      <h3 className="font-bold text-[#4A628A] border-b pb-2 mb-3 text-base">
                        2. 소조 사역 안내 및 동의
                      </h3>
                      <ul className="text-[11px] text-gray-500 space-y-2.5 list-disc pl-4 bg-gray-50 p-5 rounded-xl leading-relaxed">
                        <li>소조 세션은 90분입니다.</li>
                        <li>
                          소조 세션은 3만원의 후원금을 받고 있습니다. 이
                          후원금은 소조사역 운영 및 사역자 훈련비용, 더 어려운
                          곳의 영혼을 섬기는데 쓰입니다.
                        </li>
                        <li>
                          <span className="font-bold text-red-500">
                            신청하시는 분 성함으로 입금하여 주시기 바랍니다.
                          </span>{" "}
                          신청 후에는 환불되지 않습니다. (국민은행
                          920301-01-728406 하나교회)
                        </li>
                        <li>
                          소조 세션에는 인도하는 사역자 1인과 중보자(최소 1명)가
                          세션에 팀으로 함께 할 수도 있습니다. 중보자는 세션 중
                          중요 내용을 적어서 후에 제공할 수 있고, 중보로 세션을
                          돕습니다.{" "}
                          <span className="font-bold text-gray-800">
                            세션 진행 중 개인녹음은 불가합니다.
                          </span>
                        </li>
                        <li>
                          아래의 사역은 귀하의 자발적인 참여를 통해
                          이루어집니다. 따라서 사역자는 귀하의 참여를 기대하기
                          어렵다고 판단할 경우, 사역을 중단할 수 있습니다.
                        </li>
                        <li>
                          소조는 성령님이 주도하시는 성령 사역이며, 모든
                          사역자들은 상담 관련 자격증 보유자가 아닐 수 있으며
                          의학 또는 카운슬링 분야에서의 전문가들이 아닐 수도
                          있습니다.
                        </li>
                      </ul>
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <p className="text-xs font-bold text-gray-700 mb-4 leading-relaxed">
                          본인은 위의 내용을 모두 이해하고 나의 자발적인 의지로
                          소조를 받고자 신청하며, 수원 하나교회 및 소조 사역자는
                          사역 내용에 대하여 어떠한 법적인 책임이 없음을
                          확인합니다.
                        </p>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-black text-[#4A628A]">
                            <input
                              type="radio"
                              checked={isAgreed === true}
                              onChange={() => setIsAgreed(true)}
                              className="w-5 h-5 accent-[#4A628A]"
                            />{" "}
                            동의한다
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-black text-red-500">
                            <input
                              type="radio"
                              checked={isAgreed === false}
                              onChange={() => setIsAgreed(false)}
                              className="w-5 h-5 accent-red-500"
                            />{" "}
                            동의하지 않는다
                          </label>
                        </div>
                      </div>
                    </div>

                    {isAgreed && (
                      <div className="animate-fade-in space-y-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-[#4A628A] border-b pb-2 mb-3 text-base">
                          3. 사전 질문 (선택사항)
                        </h3>
                        <textarea
                          value={expectations}
                          onChange={(e) => setExpectations(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-4 text-sm h-28 outline-none focus:ring-2 focus:ring-[#4A628A] bg-gray-50 resize-none font-sans"
                          placeholder="소조사역을 통해 기대하는 것"
                        />
                        <textarea
                          value={questions}
                          onChange={(e) => setQuestions(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-4 text-sm h-28 outline-none focus:ring-2 focus:ring-[#4A628A] bg-gray-50 resize-none font-sans"
                          placeholder="소조사역과 관련 궁금한 것"
                        />
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isAgreed !== true || isLoading}
                      className="w-full bg-[#4A628A] text-white font-black py-5 rounded-2xl shadow-xl hover:bg-[#3A4D6D] transition-all disabled:bg-gray-300 text-lg"
                    >
                      {isLoading ? "처리 중..." : "예약 완료하기"}
                    </button>
                    <div className="pb-10"></div>
                  </form>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center">
                <div className="text-5xl mb-4">🗓️</div>
                <p className="text-lg font-bold">
                  예약 가능한 날짜를
                  <br />
                  먼저 선택해 주세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
