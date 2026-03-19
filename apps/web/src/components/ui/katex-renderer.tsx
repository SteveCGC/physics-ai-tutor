"use client";

import React, { useEffect, useRef } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface KatexRendererProps {
  /** LaTeX 公式字符串，不含 $ 符号 */
  expression: string;
  /** 是否为行内公式（默认 false，即块级公式） */
  inline?: boolean;
  className?: string;
}

/**
 * KaTeX 公式渲染组件
 * 用法（行内）: <KatexRenderer expression="F=ma" inline />
 * 用法（块级）: <KatexRenderer expression="\frac{1}{2}mv^2" />
 */
export function KatexRenderer({
  expression,
  inline = false,
  className,
}: KatexRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(expression, containerRef.current, {
          throwOnError: false,
          displayMode: !inline,
          output: "html",
          strict: false,
        });
      } catch (error) {
        if (containerRef.current) {
          containerRef.current.textContent = expression;
        }
        console.warn("[KatexRenderer] 渲染失败:", error);
      }
    }
  }, [expression, inline]);

  return (
    <span
      ref={containerRef}
      className={cn(
        inline ? "inline-flex items-center" : "block overflow-x-auto py-2",
        className
      )}
      aria-label={`数学公式: ${expression}`}
    />
  );
}

/**
 * 混合文本渲染：自动解析 $...$ 行内公式和 $$...$$ 块级公式
 * 用法: <MathText text="已知 $F=ma$，求加速度 $a$。" />
 */
interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className }: MathTextProps) {
  const parts = parseMathText(text);

  return (
    <span className={cn("leading-relaxed", className)}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <React.Fragment key={index}>{part.content}</React.Fragment>;
        }
        return (
          <KatexRenderer
            key={index}
            expression={part.content}
            inline={part.type === "inline-math"}
          />
        );
      })}
    </span>
  );
}

type TextPart =
  | { type: "text"; content: string }
  | { type: "inline-math"; content: string }
  | { type: "block-math"; content: string };

function parseMathText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  // 先匹配块级 $$...$$，再匹配行内 $...$
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  const inlineRegex = /\$([^$\n]+?)\$/g;

  let lastIndex = 0;

  // 用统一正则按顺序处理
  const combined = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // 块级公式
      parts.push({ type: "block-math", content: match[1] });
    } else if (match[2] !== undefined) {
      // 行内公式
      parts.push({ type: "inline-math", content: match[2] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  // 消除未使用的正则警告
  void blockRegex;
  void inlineRegex;

  return parts;
}
