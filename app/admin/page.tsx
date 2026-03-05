"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [availabilities, setAvailabilities] = useState<any[]>([]);

  useEffect(() => {
    const fetchAvailabilities = async () => {
      const { data, error } = await supabase
        .from("sozo_availability")
        .select("*")
        .order("target_date", { ascending: true });

      if (!error) setAvailabilities(data || []);
    };
    fetchAvailabilities();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-gray-800">📊 대시보드</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700">
            전체 예약 오픈 현황
          </h2>
        </div>
        <table className="min-w-full text-center">
          <thead className="bg-white border-b">
            <tr>
              <th className="py-4 px-4 text-gray-500 font-medium">날짜</th>
              <th className="py-4 px-4 text-gray-500 font-medium">남자 정원</th>
              <th className="py-4 px-4 text-gray-500 font-medium">여자 정원</th>
              <th className="py-4 px-4 text-gray-500 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {availabilities.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-gray-400">
                  설정된 날짜가 없습니다. '설정' 메뉴에서 추가해주세요.
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
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        오픈됨
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                        닫힘
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
