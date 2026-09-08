/**
 * 입력 중인 전화번호에 하이픈을 넣어 줍니다. 숫자만 눌러도 010-1234-5678 로 보입니다.
 * 하이픈을 직접 넣어 입력해도 결과는 같습니다.
 */
export const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};
