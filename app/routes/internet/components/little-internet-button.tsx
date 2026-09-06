import {
  useScrollerCanSend,
  useScrollerDispatch,
} from "../../../components/scroller";
import { motion } from "motion/react";

export function LittleInternetButton() {
  const dispatch = useScrollerDispatch();

  const canSendAdd = useScrollerCanSend({ type: "add" });
  const canSendReset = useScrollerCanSend({ type: "reset" });

  return (
    <div className="h-10 bg-white flex divide-x divide-black/10 w-fit ring ring-black/10 shadow rounded overflow-hidden">
      <motion.button
        className="h-full flex items-center border-b-2 border-gray-4 px-3 not-disabled:hover:bg-gray-2 disabled:cursor-not-allowed disabled:text-gray-8"
        disabled={!canSendAdd}
        onClick={() => dispatch({ type: "add" })}
      >
        Add a computer
      </motion.button>
      <button
        className="h-full aspect-square flex items-center justify-center border-b-2 border-gray-4 not-disabled:hover:bg-gray-2 disabled:cursor-not-allowed disabled:text-gray-8"
        disabled={!canSendReset}
        onClick={() => dispatch({ type: "reset" })}
      >
        <span className="sr-only">Reset</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19.2617 20.25V16.25H15.2617" />
          <path d="M4.75 3.75V7.75H8.75" />
          <path d="M3.81383 10.9688C3.7717 11.3066 3.75 11.6508 3.75 12C3.75 16.5563 7.44365 20.25 12 20.25C14.6766 20.25 17.1111 18.9754 18.6322 17" />
          <path d="M20.186 13.0312C20.2281 12.6934 20.2498 12.3492 20.2498 12C20.2498 7.44365 16.5562 3.75 11.9998 3.75C9.32326 3.75 6.88871 5.02463 5.36768 7" />
        </svg>
      </button>
    </div>
  );
}
