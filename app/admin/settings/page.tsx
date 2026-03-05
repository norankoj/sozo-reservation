"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import Calendar from "react-calendar";
import { format } from "date-fns";
import "@/style/calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function AdminSettings() {
  const [dateValue, setDateValue] = useState<Value>(new Date()); // 달력 선택 값
  const [formattedDate, setFormattedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  const [maxMale, setMaxMale] = useState(0);
  const [maxFemale, setMaxFemale] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // 💡 달력에서 날짜를 클릭할 때마다 실행되는 마법 (기존 데이터 불러오기)
  useEffect(() => {
    if (dateValue instanceof Date) {
      const targetDate = format(dateValue, "yyyy-MM-dd");
      setFormattedDate(targetDate);
      fetchExistingSetting(targetDate);
    }
  }, [dateValue]);

  // 특정 날짜의 데이터가 DB에 있는지 확인하고 불러오는 함수
  const fetchExistingSetting = async (targetDate: string) => {
    const { data, error } = await supabase
      .from("sozo_availability")
      .select("*")
      .eq("target_date", targetDate)
      .maybeSingle(); // 데이터가 하나 있거나, 없거나

    if (data) {
      // 기존 설정이 있으면 입력창에 셋팅! (수정 모드)
      setMaxMale(data.max_male);
      setMaxFemale(data.max_female);
      setIsOpen(data.is_open);
    } else {
      // 기존 설정이 없으면 0으로 초기화! (새로 등록 모드)
      setMaxMale(0);
      setMaxFemale(0);
      setIsOpen(false);
    }
  };

  // 저장(또는 수정) 버튼을 눌렀을 때
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("sozo_availability").upsert(
      {
        target_date: formattedDate,
        max_male: maxMale,
        max_female: maxFemale,
        is_open: isOpen,
      },
      { onConflict: "target_date" }, // 같은 날짜면 기존 데이터를 덮어씁니다 (수정됨)
    );

    if (error) {
      alert("저장 중 오류가 발생했습니다.");
      console.error(error);
    } else {
      alert(`${formattedDate} 예약 설정이 저장/수정 되었습니다!`);
    }
  };

  return (
    <div className="max-w-4xl flex gap-8">
      {/* 왼쪽: 달력 영역 */}
      <div className="w-1/2">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">📅 날짜 선택</h1>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-center h-[450px]">
          <Calendar
            onChange={setDateValue}
            value={dateValue}
            formatDay={(locale, date) => format(date, "d")}
            next2Label={null} // 1년 단위 이동 버튼 숨기기 (깔끔하게)
            prev2Label={null}
          />
        </div>
      </div>

      {/* 오른쪽: 설정 폼 영역 */}
      <div className="w-1/2">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          ⚙️ 예약 인원 설정
        </h1>
        <form
          onSubmit={handleSave}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
            <span className="text-gray-500 font-medium">선택된 날짜</span>
            <span className="text-xl font-bold text-[#4A628A]">
              {formattedDate}
            </span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  남자 정원 (명)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxMale}
                  onChange={(e) => setMaxMale(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-3 text-center text-lg font-bold text-blue-600 focus:ring-2 focus:ring-[#4A628A] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  여자 정원 (명)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxFemale}
                  onChange={(e) => setMaxFemale(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-3 text-center text-lg font-bold text-red-500 focus:ring-2 focus:ring-[#4A628A] outline-none transition"
                />
              </div>
            </div>

            <div className="flex items-center bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4">
              <input
                type="checkbox"
                id="isOpen"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="w-6 h-6 text-[#4A628A] rounded focus:ring-[#4A628A] cursor-pointer"
              />
              <label
                htmlFor="isOpen"
                className="ml-3 cursor-pointer font-bold text-gray-700"
              >
                이 날짜의 예약을 오픈합니다 (ON)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-8 w-full bg-[#4A628A] text-white font-bold py-4 rounded-lg hover:bg-[#3A4D6D] transition shadow-md"
          >
            설정 저장 / 수정하기
          </button>
        </form>
      </div>
    </div>
  );
}
