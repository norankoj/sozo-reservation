"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Save,
  X,
  Edit2,
  Trash2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export default function AdminSettings() {
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 현재 수정 중인 행의 ID ('new'는 새로 추가 중인 행)
  const [editingId, setEditingId] = useState<string | null>(null);

  // 수정 중인 폼 데이터
  const [editForm, setEditForm] = useState({
    target_date: "",
    session_time: "오전 10시",
    max_male: 0,
    max_female: 0,
    is_open: true,
  });

  // 💡 정렬(Sorting) 상태 관리
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "target_date",
    direction: "desc", // 기본값: 최신 날짜가 위로
  });

  // 1. 데이터 불러오기
  const fetchAllAvailabilities = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("sozo_availability").select("*");
    if (data) setAvailabilities(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllAvailabilities();
  }, []);

  // 💡 2. 데이터 정렬 로직
  const sortedAvailabilities = [...availabilities].sort((a, b) => {
    if (sortConfig.key === "target_date") {
      if (a.target_date < b.target_date)
        return sortConfig.direction === "asc" ? -1 : 1;
      if (a.target_date > b.target_date)
        return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    }
    if (sortConfig.key === "is_open") {
      // true(오픈)와 false(마감) 정렬
      const valA = a.is_open ? 1 : 0;
      const valB = b.is_open ? 1 : 0;
      return sortConfig.direction === "asc" ? valA - valB : valB - valA;
    }
    return 0;
  });

  // 💡 3. 테이블 헤더 클릭 시 정렬 방향 바꾸기
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  // 💡 4. 정렬 아이콘 렌더링 함수
  const getSortIcon = (columnName: string) => {
    if (sortConfig.key !== columnName)
      return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={16} className="text-[#4A628A]" />
    ) : (
      <ChevronDown size={16} className="text-[#4A628A]" />
    );
  };

  // 새로운 일정 추가
  const handleAddNew = () => {
    if (editingId)
      return alert("먼저 작성 중인 내용을 저장하거나 취소해 주세요.");
    setEditingId("new");
    setEditForm({
      target_date: "",
      session_time: "오전 10시",
      max_male: 0,
      max_female: 0,
      is_open: true,
    });
  };

  // 기존 일정 수정
  const handleEdit = (item: any) => {
    if (editingId)
      return alert("먼저 작성 중인 내용을 저장하거나 취소해 주세요.");
    setEditingId(item.id);
    setEditForm({
      target_date: item.target_date,
      session_time: item.session_time || "오전 10시",
      max_male: item.max_male,
      max_female: item.max_female,
      is_open: item.is_open,
    });
  };

  // 저장 (추가 또는 수정)
  const handleSave = async () => {
    if (!editForm.target_date) return alert("예약 날짜를 선택해 주세요.");
    if (!editForm.session_time) return alert("시간을 입력해 주세요.");

    const payload = {
      target_date: editForm.target_date,
      session_time: editForm.session_time,
      max_male: Number(editForm.max_male),
      max_female: Number(editForm.max_female),
      is_open: editForm.is_open,
    };

    if (editingId === "new") {
      const { error } = await supabase
        .from("sozo_availability")
        .insert([payload]);
      if (error) {
        if (error.code === "23505")
          return alert("이미 설정된 날짜입니다. 기존 목록에서 수정해 주세요.");
        return alert("저장 중 오류가 발생했습니다.");
      }
    } else {
      const { error } = await supabase
        .from("sozo_availability")
        .update(payload)
        .eq("id", editingId);
      if (error) return alert("수정 중 오류가 발생했습니다.");
    }

    setEditingId(null);
    fetchAllAvailabilities();
  };

  // 삭제
  const handleDelete = async (id: string, date: string) => {
    if (!confirm(`${date} 일정을 정말 삭제하시겠습니까?`)) return;
    const { error } = await supabase
      .from("sozo_availability")
      .delete()
      .eq("id", id);
    if (error) alert("삭제 중 오류가 발생했습니다.");
    else fetchAllAvailabilities();
  };

  // 입력값 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value === "true" ? true : value === "false" ? false : value,
    }));
  };

  return (
    <div className="space-y-8">
      {/* 상단 헤더 및 추가 버튼 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">
            ⚙️ 예약 일정 설정
          </h1>
          <p className="text-gray-500 mt-1">
            예약 가능한 날짜와 시간, 인원을 직관적으로 관리하세요.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-[#4A628A] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#3A4D6D] transition active:scale-95 shadow-md"
        >
          <Plus size={20} /> 새로운 일정 추가
        </button>
      </div>

      {/* 리스트 테이블 영역 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-center whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 select-none">
              <tr>
                <th
                  className="py-4 px-4 text-gray-700 font-bold cursor-pointer hover:bg-gray-200 transition group"
                  onClick={() => requestSort("target_date")}
                  title="날짜순으로 정렬"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    날짜 {getSortIcon("target_date")}
                  </div>
                </th>

                <th className="py-4 px-4 text-gray-700 font-bold">시간</th>
                <th className="py-4 px-4 text-blue-600 font-bold">남자 정원</th>
                <th className="py-4 px-4 text-red-500 font-bold">여자 정원</th>

                <th
                  className="py-4 px-4 text-gray-700 font-bold cursor-pointer hover:bg-gray-200 transition group"
                  onClick={() => requestSort("is_open")}
                  title="오픈/마감 상태로 정렬"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    상태 {getSortIcon("is_open")}
                  </div>
                </th>

                <th className="py-4 px-4 text-gray-700 font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* 새로 추가하는 행 */}
              {editingId === "new" && (
                <tr className="bg-blue-50/30 animate-fade-in shadow-inner">
                  <td className="py-3 px-3">
                    <input
                      type="date"
                      name="target_date"
                      value={editForm.target_date}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] font-bold"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      name="session_time"
                      value={editForm.session_time}
                      onChange={handleChange}
                      placeholder="오전 10시"
                      className="w-28 border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] text-center font-bold"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      name="max_male"
                      min="0"
                      value={editForm.max_male}
                      onChange={handleChange}
                      className="w-20 border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] text-center text-blue-600 font-bold"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      name="max_female"
                      min="0"
                      value={editForm.max_female}
                      onChange={handleChange}
                      className="w-20 border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] text-center text-red-500 font-bold"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <select
                      name="is_open"
                      value={editForm.is_open.toString()}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] font-bold cursor-pointer"
                    >
                      <option value="true" className="text-green-600">
                        🟢 오픈
                      </option>
                      <option value="false" className="text-gray-500">
                        🔴 마감(닫힘)
                      </option>
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition font-bold text-xs"
                      >
                        <Save size={16} /> 저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400 transition font-bold text-xs"
                      >
                        <X size={16} /> 취소
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* 기존 데이터 렌더링 (정렬된 데이터 사용!) */}
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-gray-400 font-bold">
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : sortedAvailabilities.length === 0 && editingId !== "new" ? (
                <tr>
                  <td colSpan={6} className="py-10 text-gray-400 font-bold">
                    등록된 일정이 없습니다. 새로운 일정을 추가해 주세요.
                  </td>
                </tr>
              ) : (
                sortedAvailabilities.map((item) => {
                  const isEditing = editingId === item.id;

                  return isEditing ? (
                    // 수정 모드인 행
                    <tr key={item.id} className="bg-blue-50/30 shadow-inner">
                      <td className="py-3 px-3">
                        <input
                          type="date"
                          name="target_date"
                          value={editForm.target_date}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          name="session_time"
                          value={editForm.session_time}
                          onChange={handleChange}
                          className="w-28 border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] text-center font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          name="max_male"
                          min="0"
                          value={editForm.max_male}
                          onChange={handleChange}
                          className="w-20 border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] text-center text-blue-600 font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          name="max_female"
                          min="0"
                          value={editForm.max_female}
                          onChange={handleChange}
                          className="w-20 border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] text-center text-red-500 font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          name="is_open"
                          value={editForm.is_open.toString()}
                          onChange={handleChange}
                          className="border border-gray-300 rounded-lg p-2 outline-none focus:border-[#4A628A] font-bold cursor-pointer"
                        >
                          <option value="true" className="text-green-600">
                            🟢 오픈
                          </option>
                          <option value="false" className="text-gray-500">
                            🔴 마감(닫힘)
                          </option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={handleSave}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition font-bold text-xs"
                          >
                            <Save size={16} /> 저장
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400 transition font-bold text-xs"
                          >
                            <X size={16} /> 취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // 일반 보기 모드인 행
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition border-b border-gray-50"
                    >
                      <td className="py-4 px-4 font-bold text-gray-800 text-lg">
                        {item.target_date}
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-600">
                        {item.session_time || "오전 10시"}
                      </td>
                      <td className="py-4 px-4 text-blue-600 font-bold text-lg">
                        {item.max_male}명
                      </td>
                      <td className="py-4 px-4 text-red-500 font-bold text-lg">
                        {item.max_female}명
                      </td>
                      <td className="py-4 px-4">
                        {item.is_open ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-black shadow-sm">
                            🟢 오픈됨
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs font-black shadow-sm">
                            🔴 닫힘
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-[#4A628A] hover:text-white transition shadow-sm"
                            title="수정"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(item.id, item.target_date)
                            }
                            className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm"
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
