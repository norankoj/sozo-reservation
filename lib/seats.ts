export type Reservation = {
  target_date: string;
  gender: string;
  status?: string | null;
};

export const isCancelled = (r: { status?: string | null }) =>
  r.status === "cancelled";

/** 날짜별로 묶고, 취소된 건을 뺀 성별 예약 수를 함께 돌려준다. */
export function groupByDate<T extends Reservation>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const list = groups.get(r.target_date);
    if (list) list.push(r);
    else groups.set(r.target_date, [r]);
  }
  return [...groups].map(([date, list]) => ({
    date,
    rows: list,
    male: list.filter((r) => r.gender === "남자" && !isCancelled(r)).length,
    female: list.filter((r) => r.gender === "여자" && !isCancelled(r)).length,
  }));
}
