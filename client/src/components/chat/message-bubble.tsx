import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const { toast } = useToast();

  const formatTimestamp = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleLike = (isLike: boolean) => {
    setLiked(liked === isLike ? null : isLike);
  };

  const renderText = (txt: string, keyPrefix: string) => {
    const embedRegex = /\((.*?)\)\/%\^(.*?)\^%\//g;

    const handleMarkdown = (input: string, k: string) => {
      const fenceParts = input.split("```");
      return fenceParts.map((part, pIndex) => {
        if (pIndex % 2 === 1) {
          const code = part.trim();
          return (
            <pre
              key={`${k}-code-${pIndex}`}
              className="bg-muted rounded-lg p-3 my-2 font-mono text-sm overflow-x-auto border"
            >
              <code className="text-foreground">{code}</code>
            </pre>
          );
        }

        const inlineParts = part.split("`");
        return inlineParts.map((ip, ipIndex) => {
          if (ipIndex % 2 === 1)
            return (
              <code
                key={`${k}-inline-${pIndex}-${ipIndex}`}
                className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
              >
                {ip}
              </code>
            );

          const boldParts = ip.split("**");
          return boldParts.map((bp, bpIndex) => {
            const embedParts = Array.from(bp.matchAll(embedRegex));
            if (embedParts.length > 0) {
              const fragments: any[] = [];
              let last = 0;
              embedParts.forEach((m, i) => {
                if (m.index! > last) fragments.push(bp.slice(last, m.index));
                fragments.push(
                  <a
                    key={`${k}-embed-${pIndex}-${ipIndex}-${bpIndex}-${i}`}
                    href={m[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {m[1]}
                  </a>
                );
                last = m.index! + m[0].length;
              });
              if (last < bp.length) fragments.push(bp.slice(last));
              return bpIndex % 2 === 1 ? (
                <strong key={`${k}-bold-${pIndex}-${ipIndex}-${bpIndex}`}>
                  {fragments}
                </strong>
              ) : (
                fragments
              );
            }
            return bpIndex % 2 === 1 ? (
              <strong key={`${k}-bold-${pIndex}-${ipIndex}-${bpIndex}`}>
                {bp}
              </strong>
            ) : (
              bp
            );
          });
        });
      });
    };
    return handleMarkdown(txt, keyPrefix);
  };

  const renderContent = (content: string) => {
    // Handle table regions between @& and &@
    const tableSections = content.split(/@&([\s\S]*?)&@/g);

    return tableSections.map((section, i) => {
      if (i % 2 === 1) {
        // Inside table
        const tableRegex = /%R(\d+)\$C(\d+)\s+([^%]+)/g;
        const tableMatches = Array.from(section.matchAll(tableRegex));

        if (tableMatches.length === 0) return null;

        const tableData: Record<number, Record<number, string>> = {};
        let maxRow = 0;
        let maxCol = 0;

        for (const match of tableMatches) {
          const row = parseInt(match[1]);
          const col = parseInt(match[2]);
          const text = match[3].trim();
          if (!tableData[row]) tableData[row] = {};
          tableData[row][col] = text;
          if (row > maxRow) maxRow = row;
          if (col > maxCol) maxCol = col;
        }

        return (
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="min-w-full border border-gray-300 text-sm">
              <tbody>
                {Array.from({ length: maxRow }).map((_, rIndex) => {
                  const rowNum = rIndex + 1;
                  const row = tableData[rowNum] || {};
                  const isHeader = rowNum === 1;
                  return (
                    <tr
                      key={`row-${rowNum}`}
                      className={isHeader ? "bg-muted font-bold" : "bg-transparent"}
                    >
                      {Array.from({ length: maxCol }).map((_, cIndex) => {
                        const colNum = cIndex + 1;
                        const cell = row[colNum] || "";
                        return (
                          <td
                            key={`r${rowNum}c${colNum}`}
                            className="border border-gray-300 px-3 py-2 text-left"
                          >
                            {renderText(cell, `table-${i}-r${rIndex}-c${cIndex}`)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      } else {
        // Normal content outside tables
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        // Updated bullet list syntax: starts with # and uses ~ for bullets
        const bulletRegex = /#([\s\S]*?)#/g;
        let match;

        while ((match = bulletRegex.exec(section)) !== null) {
          // Text before bullet list
          if (match.index > lastIndex) {
            const beforeText = section.slice(lastIndex, match.index);
            parts.push(
              <div key={`text-${i}-${lastIndex}`}>
                {renderText(beforeText, `outside-${i}-${lastIndex}`)}
              </div>
            );
          }

          // Extract bullet items
          const listContent = match[1]
            .split(/\n|~/g)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          parts.push(
            <ul key={`list-${i}-${match.index}`} className="list-disc list-inside mb-2">
              {listContent.map((item, idx) => (
                <li key={`list-${i}-${idx}`}>{renderText(item, `list-${i}-${idx}`)}</li>
              ))}
            </ul>
          );

          lastIndex = match.index + match[0].length;
        }

        // Remaining text after last list
        if (lastIndex < section.length) {
          const remainingText = section.slice(lastIndex);
          parts.push(
            <div key={`text-${i}-end`}>
              {renderText(remainingText, `outside-${i}-end`)}
            </div>
          );
        }

        return <div key={`section-${i}`}>{parts}</div>;
      }
    });
  };

  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} message-fade-in`}
      data-testid={`message-${message.id}`}
    >
      <div className="max-w-xs md:max-w-md lg:max-w-lg">
        <div
          className={`p-3 rounded-2xl ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-white dark:bg-card border border-border text-gray-900 dark:text-foreground rounded-bl-md"
          }`}
        >
          {message.imageUrl && (
            <div className="mb-2">
              <img
                src={message.imageUrl}
                alt="Uploaded"
                className="max-w-full h-auto rounded-lg border"
              />
            </div>
          )}

          {message.imageText && (
            <div className="mb-2 p-2 bg-muted rounded text-xs text-muted-foreground border-l-2 border-primary">
              <span className="font-medium">Extracted text:</span>{" "}
              {message.imageText}
            </div>
          )}

          <div
            className={`${
              isUser
                ? "not-prose text-white text-sm"
                : "prose prose-sm max-w-none prose-gray dark:prose-invert"
            }`}
          >
            {renderContent(message.content)}
          </div>
        </div>

        <div
          className={`flex ${isUser ? "justify-end" : "justify-start"} items-center mt-1 space-x-2`}
        >
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.createdAt)}
          </span>

          {!isUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs ${
                  liked === true
                    ? "text-green-600 hover:text-green-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleLike(true)}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs ${
                  liked === false
                    ? "text-red-600 hover:text-red-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleLike(false)}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
