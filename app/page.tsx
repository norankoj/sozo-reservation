"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import "@/style/calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function Home() {
  const [dateValue, setDateValue] = useState<Value>(new Date());
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 폼 상태 관리 (새로 추가된 항목들 포함!)
  const [userName, setUserName] = useState("");
  const [userCell, setUserCell] = useState("");
  const [userAge, setUserAge] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [gender, setGender] = useState("남자");
  const [password, setPassword] = useState("");

  // 동의 및 추가 질문 상태
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

      if (dayInfo) {
        fetchReservations(targetDate);
      } else {
        setReservations([]);
      }
      // 날짜가 바뀌면 폼 초기화
      resetForm();
    }
  }, [dateValue, availabilities]);

  const fetchReservations = async (targetDate: string) => {
    const { data } = await supabase
      .from("sozo_reservations")
      .select("*")
      .eq("target_date", targetDate);
    if (data) setReservations(data);
  };

  const resetForm = () => {
    setUserName("");
    setUserCell("");
    setUserAge("");
    setUserPhone("");
    setGender("남자");
    setPassword("");
    setIsAgreed(null);
    setExpectations("");
    setQuestions("");
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
    if (!selectedDayInfo) return;
    if (gender === "남자" && remainMale <= 0)
      return alert("남자 정원이 마감되었습니다!");
    if (gender === "여자" && remainFemale <= 0)
      return alert("여자 정원이 마감되었습니다!");
    if (isAgreed !== true)
      return alert("소조사역 내용에 동의하셔야 예약이 가능합니다.");

    const targetDate = format(dateValue as Date, "yyyy-MM-dd");

    const { error } = await supabase.from("sozo_reservations").insert([
      {
        target_date: targetDate,
        user_name: userName,
        user_phone: userPhone,
        gender: gender,
        cell: userCell,
        age: userAge,
        password: password,
        expectations: expectations,
        questions: questions,
      },
    ]);

    if (error) {
      alert("예약 중 오류가 발생했습니다.");
    } else {
      alert("🎉 예약이 성공적으로 완료되었습니다!");
      fetchReservations(targetDate);
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100 h-[90vh] md:h-[800px]">
        {/* 왼쪽: 예약 달력 (고정) */}
        <div className="w-full md:w-[45%] p-6 md:p-8 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col overflow-y-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#4A628A] mb-2">
            SOZO 예약
          </h1>
          <p className="text-sm md:text-base text-gray-500 mb-6">
            원하시는 날짜를 선택해주세요.
          </p>

          {!isLoading && availabilities.length === 0 && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-center text-sm font-bold border border-red-100">
              현재 예약 가능한 일정이 없습니다.
            </div>
          )}

          <div className="flex-1 min-h-[350px]">
            <Calendar
              onChange={setDateValue}
              value={dateValue}
              formatDay={(locale, date) => format(date, "d")}
              next2Label={null}
              prev2Label={null}
              tileDisabled={({ date }) => {
                const formatted = format(date, "yyyy-MM-dd");
                return !availabilities.some((a) => a.target_date === formatted);
              }}
              tileContent={({ date, view }) => {
                if (view === "month") {
                  const formatted = format(date, "yyyy-MM-dd");
                  if (availabilities.some((a) => a.target_date === formatted)) {
                    return (
                      <div className="flex flex-col items-center justify-center mt-1">
                        <div className="w-1.5 h-1.5 bg-[#4A628A] rounded-full mb-0.5"></div>
                        <span className="text-[10px] font-bold text-[#4A628A]">
                          가능
                        </span>
                      </div>
                    );
                  }
                }
                return null;
              }}
            />
          </div>
        </div>

        {/* 오른쪽: 예약 폼 (스크롤 가능 영역) */}
        <div className="w-full md:w-[55%] bg-gray-50 overflow-y-auto">
          <div className="p-6 md:p-8">
            {selectedDayInfo ? (
              <form
                id="reservation-form"
                onSubmit={handleReservation}
                className="space-y-8"
              >
                {/* 헤더 & 잔여석 */}
                <div>
                  <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800">
                      {format(dateValue as Date, "yyyy년 MM월 dd일")} 예약
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 text-center">
                      <p className="text-xs text-gray-500">남자 잔여</p>
                      <p
                        className={`text-xl font-bold ${remainMale > 0 ? "text-blue-600" : "text-gray-400"}`}
                      >
                        {remainMale > 0 ? `${remainMale}명` : "마감"}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-red-100 text-center">
                      <p className="text-xs text-gray-500">여자 잔여</p>
                      <p
                        className={`text-xl font-bold ${remainFemale > 0 ? "text-red-500" : "text-gray-400"}`}
                      >
                        {remainFemale > 0 ? `${remainFemale}명` : "마감"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* 1. 개인정보 입력 */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-[#4A628A] border-b pb-2 mb-4">
                    1. 개인정보 입력
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        성함
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none"
                        required
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        성별
                      </label>
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center p-2.5 border border-gray-300 rounded-lg cursor-pointer transition has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 has-[:checked]:text-blue-700">
                          <input
                            type="radio"
                            name="gender"
                            value="남자"
                            checked={gender === "남자"}
                            onChange={(e) => setGender(e.target.value)}
                            className="hidden"
                          />
                          <span className="font-medium text-sm">남자</span>
                        </label>
                        <label className="flex-1 flex items-center justify-center p-2.5 border border-gray-300 rounded-lg cursor-pointer transition has-[:checked]:bg-red-50 has-[:checked]:border-red-500 has-[:checked]:text-red-700">
                          <input
                            type="radio"
                            name="gender"
                            value="여자"
                            checked={gender === "여자"}
                            onChange={(e) => setGender(e.target.value)}
                            className="hidden"
                          />
                          <span className="font-medium text-sm">여자</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        소속셀
                      </label>
                      <input
                        type="text"
                        value={userCell}
                        onChange={(e) => setUserCell(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none"
                        required
                        placeholder="예: 3E01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        나이
                      </label>
                      <input
                        type="number"
                        value={userAge}
                        onChange={(e) => setUserAge(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none"
                        required
                        placeholder="예: 32"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연락처
                    </label>
                    <input
                      type="tel"
                      value={userPhone}
                      maxLength={13}
                      pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}"
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none"
                      required
                      placeholder="010-1234-5678"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      * 문자발송을 받으실 수 있는 휴대전화 번호를 입력하여
                      주시기 바랍니다.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      예약 비밀번호 (4자리)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none"
                      required
                      placeholder="**** (예약 확인/취소용)"
                    />
                  </div>
                </div>
                {/* 2. 소조 사역 설명 및 동의 */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-[#4A628A] border-b pb-2 mb-3">
                    2. 소조 사역 안내 및 동의
                  </h3>

                  <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 bg-gray-50 p-4 rounded-lg">
                    <li>소조 세션은 90분입니다.</li>
                    <li>
                      소조 세션은 3만원의 후원금을 받고 있습니다. 이 후원금은
                      소조사역 운영 및 사역자 훈련비용, 더 어려운 곳의 영혼을
                      섬기는데 쓰입니다.
                    </li>
                    <li>
                      <span className="font-bold text-red-500">
                        신청하시는 분 성함으로 입금하여 주시기 바랍니다.
                      </span>{" "}
                      신청 후에는 환불되지 않습니다. (국민은행 920301-01-728406
                      하나교회)
                    </li>
                    <li>
                      소조 세션에는 인도하는 사역자 1인과 중보자(최소 1명)가
                      세션에 팀으로 함께 할 수도 있습니다. 중보자는 세션 중 중요
                      내용을 적어서 후에 제공할 수 있고, 중보로 세션을 돕습니다.{" "}
                      <span className="font-bold">
                        세션 진행 중 개인녹음은 불가합니다.
                      </span>
                    </li>
                    <li>
                      아래의 사역은 귀하의 자발적인 참여를 통해 이루어집니다.
                      따라서 사역자는 귀하의 참여를 기대하기 어렵다고 판단할
                      경우, 사역을 중단할 수 있습니다.
                    </li>
                    <li>
                      소조는 성령님이 주도하시는 성령 사역이며, 모든 사역자들은
                      상담 관련 자격증 보유자가 아닐 수 있으며 의학 또는
                      카운슬링 분야에서의 전문가들이 아닐 수도 있습니다.
                    </li>
                  </ul>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-gray-800 mb-3 leading-relaxed">
                      * 본인은 위의 내용을 모두 이해하고 나의 자발적인 의지로
                      소조를 받고자 신청하며, 수원 하나교회 및 소조 사역자는
                      사역 내용에 대하여 어떠한 법적인 책임이 없음을 확인합니다.
                    </p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="consent"
                          checked={isAgreed === true}
                          onChange={() => setIsAgreed(true)}
                          className="w-4 h-4 text-[#4A628A] focus:ring-[#4A628A]"
                        />
                        <span className="text-sm font-bold text-[#4A628A]">
                          동의한다
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="consent"
                          checked={isAgreed === false}
                          onChange={() => setIsAgreed(false)}
                          className="w-4 h-4 text-red-500 focus:ring-red-500"
                        />
                        <span className="text-sm font-bold text-red-500">
                          동의하지 않는다
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                {/* 3. 추가 정보 (동의 시에만 표시) */}
                {isAgreed && (
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 animate-fade-in">
                    <h3 className="font-bold text-[#4A628A] border-b pb-2 mb-3">
                      3. 사전 질문 (선택사항)
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        소조사역을 통해 기대하는 것
                      </label>
                      <textarea
                        value={expectations}
                        onChange={(e) => setExpectations(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none resize-none h-20"
                        placeholder="자유롭게 적어주세요."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        소조사역과 관련 궁금한 것
                      </label>
                      <textarea
                        value={questions}
                        onChange={(e) => setQuestions(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#4A628A] outline-none resize-none h-20"
                        placeholder="자유롭게 적어주세요."
                      />
                    </div>
                  </div>
                )}
                {/* 제출 버튼 */}
                <button
                  type="submit"
                  disabled={
                    (remainMale <= 0 && remainFemale <= 0) || isAgreed !== true
                  }
                  className="w-full bg-[#4A628A] text-white font-bold py-4 rounded-xl hover:bg-[#3A4D6D] transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md text-lg mt-8"
                >
                  {remainMale <= 0 && remainFemale <= 0
                    ? "전체 마감되었습니다"
                    : "예약 완료하기"}
                </button>
                <div className="pb-10"></div> {/* 모바일 하단 여백 */}
              </form>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-4">🗓️</div>
                <p className="text-lg">예약 가능한 날짜를</p>
                <p className="text-lg">달력에서 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
