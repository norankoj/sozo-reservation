"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Phone, Users, Trash2, CalendarDays } from "lucide-react";

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sozo_reservations")
      .select("*")
      .order("target_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("데이터 로딩 에러:", error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `정말로 ${name}님의 예약을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.`,
      )
    )
      return;

    const { error } = await supabase
      .from("sozo_reservations")
      .delete()
      .eq("id", id);

    if (error) {
      alert("삭제 중 오류가 발생했습니다.");
    } else {
      alert("예약이 삭제되었습니다.");
      fetchReservations();
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex justify-between items-center bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
          📊 전체 예약 명단
        </h1>
        <button
          onClick={fetchReservations}
          className="bg-[#4A628A] text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm md:text-base font-bold hover:bg-[#3A4D6D] transition shadow-md active:scale-95"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold">
          데이터를 불러오는 중입니다...
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-20 text-center text-gray-400 font-bold">
          아직 접수된 예약이 없습니다.
        </div>
      ) : (
        <>
          {/* ====================================================
              📱 모바일 레이아웃 (카드 형태)
          ==================================================== */}
          <div className="md:hidden space-y-4">
            {reservations.map((res) => (
              <div
                key={res.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 relative overflow-hidden"
              >
                {/* 카드 상단: 날짜, 성별, 삭제버튼 */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <div className="font-black text-lg text-gray-800 flex items-center gap-1.5 mb-1.5">
                      <CalendarDays size={18} className="text-[#4A628A]" />{" "}
                      {res.target_date}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black ${res.gender === "남자" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}
                    >
                      {res.gender}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(res.id, res.user_name)}
                    className="text-gray-300 hover:text-red-500 p-2 bg-gray-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* 카드 중단: 개인정보 */}
                <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-xl">
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
                      <Users size={14} className="text-gray-400" /> {res.cell}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 ml-5">
                      {res.age}세
                    </p>
                  </div>
                </div>

                {/* 카드 하단: 질문 (스크롤 적용) */}
                <div className="space-y-2 text-xs text-gray-700 max-h-40 overflow-y-auto pr-1">
                  {res.expectations && (
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 leading-relaxed">
                      <span className="font-black text-blue-700 block mb-1">
                        ✨ [기대하는 점]
                      </span>
                      {res.expectations}
                    </div>
                  )}
                  {res.questions && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                      <span className="font-black text-gray-600 block mb-1">
                        🤔 [궁금한 점]
                      </span>
                      {res.questions}
                    </div>
                  )}
                  {!res.expectations && !res.questions && (
                    <div className="text-center text-gray-400 italic py-2 bg-gray-50 rounded-lg">
                      질문 미작성
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ====================================================
              💻 PC 레이아웃 (테이블 형태)
          ==================================================== */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5 font-black text-gray-700 w-36">
                      예약일 / 성별
                    </th>
                    <th className="px-6 py-5 font-black text-gray-700 w-48">
                      예약자 정보
                    </th>
                    <th className="px-6 py-5 font-black text-gray-700 w-32">
                      소속 / 나이
                    </th>
                    <th className="px-6 py-5 font-black text-gray-700">
                      사전 질문 및 기대사항
                    </th>
                    <th className="px-6 py-5 font-black text-gray-700 text-center w-24">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 align-top">
                        <div className="font-black text-gray-900 mb-2 text-base">
                          {res.target_date}
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black shadow-sm ${res.gender === "남자" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}
                        >
                          {res.gender}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-1.5 font-black text-gray-800 mb-1.5 text-base">
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
                        {/* 💡 이 부분에 max-h-40 (최대높이 약 160px)과 스크롤(overflow-y-auto)을 적용했습니다! */}
                        <div className="space-y-3 text-sm text-gray-700 max-h-40 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-200">
                          {res.expectations && (
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 leading-relaxed">
                              <span className="font-black text-blue-700 mr-1.5">
                                [기대]
                              </span>
                              {res.expectations}
                            </div>
                          )}
                          {res.questions && (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 leading-relaxed">
                              <span className="font-black text-gray-600 mr-1.5">
                                [궁금]
                              </span>
                              {res.questions}
                            </div>
                          )}
                          {!res.expectations && !res.questions && (
                            <span className="text-gray-400 italic bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold">
                              미작성
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top text-center">
                        <button
                          onClick={() => handleDelete(res.id, res.user_name)}
                          className="text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors p-2.5 rounded-xl"
                          title="예약 삭제"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
