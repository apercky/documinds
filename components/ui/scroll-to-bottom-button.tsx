"use client";

import { ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";

interface Props {
  children: React.ReactNode;
  className?: string;
}

const ScrollToBottomButton: React.FC<Props> = ({ children, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showButton, setShowButton] = useState(false);
  const t = useTranslations("UI");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
      setShowButton(!isAtBottom);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll(); // chiama subito per mostrare o nascondere all'inizio

    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`overflow-y-auto h-[80vh] px-4 ${className} ios-scroll-padding scrollbar-hide`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>

      {showButton && (
        <Button
          onClick={() => {
            scrollToBottom();
          }}
          size="icon"
          variant="outline"
          className="absolute bottom-14 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50 inline-flex rounded-full shadow-md"
          aria-label={t("scrollToBottom")}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ScrollToBottomButton;
