"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("로그인 실패: 정보를 다시 확인해주세요.");
    } else {
      router.push("/admin"); // 로그인 성공 시 대시보드로 이동
    }
  };

  return (
    <div className="min-h-screen bg-[#4A628A] flex items-center justify-center p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-[#4A628A] mb-6 text-center">
          SOZO 관리자 로그인
        </h1>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#4A628A]"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#4A628A]"
            required
          />
          <button
            type="submit"
            className="w-full bg-[#4A628A] text-white font-bold py-3 rounded-lg hover:bg-[#3A4D6D] transition"
          >
            로그인
          </button>
        </div>
      </form>
    </div>
  );
}
