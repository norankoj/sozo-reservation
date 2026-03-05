"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { User, Phone, Users, MessageSquare, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 예약 내역 불러오기
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

  // 예약 삭제 함수 (취소 처리용)
  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "정말로 이 예약을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.",
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">📊 전체 예약 명단</h1>
        <button
          onClick={fetchReservations}
          className="bg-[#4A628A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3A4D6D] transition"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          데이터를 불러오는 중입니다...
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-20 text-center text-gray-400">
          아직 접수된 예약이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-700">
                    예약일 / 성별
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-700">
                    예약자 정보
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-700">
                    소속 / 나이
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-700">
                    사전 질문 및 기대사항
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-700 text-center">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50 transition">
                    {/* 예약 날짜 및 성별 */}
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-gray-900 mb-1">
                        {res.target_date}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          res.gender === "남자"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {res.gender}
                      </span>
                    </td>

                    {/* 예약자 성함 및 연락처 */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800 mb-1">
                        <User size={14} className="text-gray-400" />{" "}
                        {res.user_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Phone size={14} className="text-gray-400" />{" "}
                        {res.user_phone}
                      </div>
                    </td>

                    {/* 소속 및 나이 */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-1.5 text-gray-700 mb-1">
                        <Users size={14} className="text-gray-400" /> {res.cell}
                      </div>
                      <div className="text-gray-500 text-xs pl-[20px]">
                        {res.age}세
                      </div>
                    </td>

                    {/* 사전 질문 내용 */}
                    <td className="px-6 py-4 align-top max-w-xs">
                      <div className="space-y-2 text-xs">
                        {res.expectations && (
                          <div className="bg-blue-50 p-2 rounded border border-blue-100">
                            <span className="font-bold text-blue-700 mr-1">
                              [기대]
                            </span>{" "}
                            {res.expectations}
                          </div>
                        )}
                        {res.questions && (
                          <div className="bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="font-bold text-gray-600 mr-1">
                              [궁금]
                            </span>{" "}
                            {res.questions}
                          </div>
                        )}
                        {!res.expectations && !res.questions && (
                          <span className="text-gray-300 italic">미작성</span>
                        )}
                      </div>
                    </td>

                    {/* 관리 버튼 */}
                    <td className="px-6 py-4 align-top text-center">
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-2"
                        title="예약 삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
