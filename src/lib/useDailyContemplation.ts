import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { dailyContemplation } from "../data/contemplation";
import { useContent } from "./content";

export function useDailyContemplation() {
  const { bible } = useContent();
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setDate(now);
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50);
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return { date, passage: dailyContemplation(date, bible.verses) };
}
