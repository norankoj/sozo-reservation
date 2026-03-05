"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { Edit2, CheckCircle, XCircle } from "lucide-react";
import "@/style/calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function AdminSettings() {
  const [dateValue, setDateValue] = useState<Value>(new Date());
  const [formattedDate, setFormattedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  const [maxMale, setMaxMale] = useState(0);
  const [maxFemale, setMaxFemale] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [availabilities, setAvailabilities] = useState<any[]>([]); // 💡 설정된 날짜 리스트 상태 추가

  // 1. 전체 설정 리스트 불러오기
  const fetchAllAvailabilities = async () => {
    const { data } = await supabase
      .from("sozo_availability")
      .select("*")
      .order("target_date", { ascending: true });

    if (data) setAvailabilities(data);
  };

  useEffect(() => {
    fetchAllAvailabilities();
  }, []);

  // 2. 달력 날짜 클릭 시 기존 설정 불러오기
  useEffect(() => {
    if (dateValue instanceof Date) {
      const targetDate = format(dateValue, "yyyy-MM-dd");
      setFormattedDate(targetDate);
      fetchExistingSetting(targetDate);
    }
  }, [dateValue]);

  const fetchExistingSetting = async (targetDate: string) => {
    const { data } = await supabase
      .from("sozo_availability")
      .select("*")
      .eq("target_date", targetDate)
      .maybeSingle();

    if (data) {
      setMaxMale(data.max_male);
      setMaxFemale(data.max_female);
      setIsOpen(data.is_open);
    } else {
      setMaxMale(0);
      setMaxFemale(0);
      setIsOpen(false);
    }
  };

  // 3. 리스트에서 [수정] 버튼 클릭 시 실행되는 함수
  const handleEditClick = (item: any) => {
    const newDate = new Date(item.target_date);
    setDateValue(newDate); // 달력 위치 이동
    setFormattedDate(item.target_date);
    setMaxMale(item.max_male);
    setMaxFemale(item.max_female);
    setIsOpen(item.is_open);

    // 페이지 상단으로 스무스하게 이동 (모바일/긴 페이지 대비)
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 4. 저장/수정 함수
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("sozo_availability").upsert(
      {
        target_date: formattedDate,
        max_male: maxMale,
        max_female: maxFemale,
        is_open: isOpen,
      },
      { onConflict: "target_date" },
    );

    if (error) {
      alert("저장 중 오류가 발생했습니다.");
    } else {
      alert(`${formattedDate} 설정이 저장되었습니다.`);
      fetchAllAvailabilities(); // 💡 저장 후 하단 리스트 새로고침
    }
  };

  return (
    <div className="space-y-10">
      <div className="max-w-4xl flex flex-col md:flex-row gap-8">
        {/* 왼쪽: 달력 */}
        <div className="w-full md:w-1/2">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">
            📅 날짜 선택
          </h1>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-center h-[450px]">
            <Calendar
              onChange={setDateValue}
              value={dateValue}
              formatDay={(locale, date) => format(date, "d")}
              next2Label={null}
              prev2Label={null}
            />
          </div>
        </div>

        {/* 오른쪽: 설정 폼 */}
        <div className="w-full md:w-1/2">
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

      {/* 💡 하단: 설정 현황 테이블 추가 */}
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          📋 현재 설정된 날짜 리스트
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full text-center">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-4 px-4 text-gray-600 font-bold">날짜</th>
                <th className="py-4 px-4 text-gray-600 font-bold">남자</th>
                <th className="py-4 px-4 text-gray-600 font-bold">여자</th>
                <th className="py-4 px-4 text-gray-600 font-bold">상태</th>
                <th className="py-4 px-4 text-gray-600 font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {availabilities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-gray-400">
                    설정된 예약 일정이 없습니다.
                  </td>
                </tr>
              ) : (
                availabilities.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4 font-semibold text-gray-700">
                      {item.target_date}
                    </td>
                    <td className="py-4 px-4 text-blue-600 font-medium">
                      {item.max_male}명
                    </td>
                    <td className="py-4 px-4 text-red-500 font-medium">
                      {item.max_female}명
                    </td>
                    <td className="py-4 px-4">
                      {item.is_open ? (
                        <div className="flex items-center justify-center gap-1 text-green-600 font-bold text-xs">
                          <CheckCircle size={14} /> 오픈됨
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-gray-400 font-bold text-xs">
                          <XCircle size={14} /> 닫힘
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="flex items-center gap-1 mx-auto bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#4A628A] hover:text-white transition"
                      >
                        <Edit2 size={12} /> 수정
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
