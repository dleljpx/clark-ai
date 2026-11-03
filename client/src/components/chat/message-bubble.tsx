import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const inlineHtml = (value: string) => escapeHtml(value)
  .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\((.*?)\)\/%\^(.*?)\^%\//g, '<a href="$2">$1</a>');

const inlinePlainText = (value: string) => value
  .replace(/\((.*?)\)\/%\^(.*?)\^%\//g, "$1 ($2)")
  .replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/```|`/g, "");

function renderTableForClipboard(source: string) {
  const cells = Array.from(source.matchAll(/%R(\d+)\$C(\d+)\s*([\s\S]*?)(?=\s*%R\d+\$C\d+|$)/g));
  const rows: Record<number, Record<number, string>> = {};
  let maxRow = 0;
  let maxColumn = 0;

  for (const cell of cells) {
    const row = Number(cell[1]);
    const column = Number(cell[2]);
    rows[row] ??= {};
    rows[row][column] = cell[3].trim();
    maxRow = Math.max(maxRow, row);
    maxColumn = Math.max(maxColumn, column);
  }

  const htmlRows: string[] = [];
  const textRows: string[] = [];
  for (let rowNumber = 1; rowNumber <= maxRow; rowNumber++) {
    const row = rows[rowNumber] ?? {};
    const tag = rowNumber === 1 ? "th" : "td";
    const values = Array.from({ length: maxColumn }, (_, index) => row[index + 1] ?? "");
    htmlRows.push(`<tr>${values.map((value) => `<${tag}>${inlineHtml(value)}</${tag}>`).join("")}</tr>`);
    textRows.push(values.map(inlinePlainText).join(" | "));
  }

  return {
    html: `<table><tbody>${htmlRows.join("")}</tbody></table>`,
    text: textRows.join("\n"),
  };
}

function formatMessageForClipboard(content: string) {
  const blocks: Array<{ html: string; text: string }> = [];
  const storeBlock = (html: string, text: string) => {
    const index = blocks.push({ html, text }) - 1;
    return `\u0000BLOCK${index}\u0000`;
  };

  let formatted = content.replace(/@&([\s\S]*?)(?:&@|$)/g, (_match, tableContent: string) => {
    const table = renderTableForClipboard(tableContent);
    return storeBlock(table.html, table.text);
  });

  formatted = formatted.replace(/#([\s\S]*?)#/g, (match, listContent: string) => {
    if ((listContent.match(/~/g) ?? []).length <= 2) return match;
    const items = listContent.split(/~|\n/).map((item) => item.trim()).filter(Boolean);
    return storeBlock(
      `<ul>${items.map((item) => `<li>${inlineHtml(item)}</li>`).join("")}</ul>`,
      items.map((item) => `- ${inlinePlainText(item)}`).join("\n")
    );
  });

  const formattedParts = formatted.split(/(\u0000BLOCK\d+\u0000)/g);
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  for (const part of formattedParts) {
    const blockMatch = part.match(/^\u0000BLOCK(\d+)\u0000$/);
    if (blockMatch) {
      const block = blocks[Number(blockMatch[1])];
      htmlParts.push(block.html);
      textParts.push(block.text);
      continue;
    }

    const lines = part.split(/\r?\n/);
    for (let index = 0; index < lines.length;) {
      if (/^\s*-\s+/.test(lines[index])) {
        const items: string[] = [];
        while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*-\s+/, ""));
          index++;
        }
        htmlParts.push(`<ul>${items.map((item) => `<li>${inlineHtml(item)}</li>`).join("")}</ul>`);
        textParts.push(items.map((item) => `- ${inlinePlainText(item)}`).join("\n"));
      } else {
        htmlParts.push(inlineHtml(lines[index]));
        textParts.push(inlinePlainText(lines[index]));
        index++;
      }
      if (index < lines.length && !/^\s*-\s+/.test(lines[index])) {
        htmlParts.push("<br>");
        textParts.push("\n");
      }
    }
  }

  return { html: `<div>${htmlParts.join("")}</div>`, text: textParts.join("").trim() };
}

interface MessageBubbleProps {
  message: Message;
  onFeedbackChange?: (
    messageId: string,
    conversationId: string,
    role: "user" | "assistant",
    feedback: "liked" | "disliked" | "cleared"
  ) => void;
}

export default function MessageBubble({ message, onFeedbackChange }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
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
      if (message.imageUrl && !message.content.trim()) {
        if (!navigator.clipboard.write || typeof ClipboardItem === "undefined") {
          throw new Error("Image clipboard is not supported by this browser.");
        }
        const sourceBlob = await (await fetch(message.imageUrl)).blob();
        const bitmap = await createImageBitmap(sourceBlob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image conversion failed.")), "image/png");
        });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      } else {
        const clipboardContent = formatMessageForClipboard(message.content);
        if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
          const item = new ClipboardItem({
            "text/html": new Blob([clipboardContent.html], { type: "text/html" }),
            "text/plain": new Blob([clipboardContent.text], { type: "text/plain" }),
          });
          await navigator.clipboard.write([item]);
        } else {
          await navigator.clipboard.writeText(clipboardContent.text);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[MESSAGE_COPY_FAILED]", err);
      toast({
        title: "Failed to copy",
        description: "There was an error [MESSAGE_COPY_FAILED].",
        variant: "destructive",
      });
    }
  };

  const renderSectionText = (text: string, keyPrefix: string) => {
    const lines = text.split("\n");
    const nodes: React.ReactNode[] = [];
    for (let index = 0; index < lines.length;) {
      if (/^\s*-\s+/.test(lines[index])) {
        const start = index;
        const items: string[] = [];
        while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*-\s+/, ""));
          index++;
        }
        nodes.push(
          <ul key={`${keyPrefix}-dash-list-${start}`} className="list-disc list-inside mb-2">
            {items.map((item, itemIndex) => (
              <li key={`${keyPrefix}-dash-list-${start}-${itemIndex}`}>{renderText(item, `${keyPrefix}-dash-${start}-${itemIndex}`)}</li>
            ))}
          </ul>
        );
      } else {
        nodes.push(
          <React.Fragment key={`${keyPrefix}-line-${index}`}>
            {renderText(lines[index], `${keyPrefix}-line-${index}`)}
            {index < lines.length - 1 ? <br /> : null}
          </React.Fragment>
        );
        index++;
      }
    }
    return nodes;
  };

  const handleLike = (isLike: boolean) => {
    const nextLiked = liked === isLike ? null : isLike;
    setLiked(nextLiked);
    const role = message.role === "user" ? "user" : "assistant";
    onFeedbackChange?.(message.id, message.conversationId, role, nextLiked === null ? "cleared" : nextLiked ? "liked" : "disliked");
  };

  /**
   * renderText: handles code fences (```), inline code (`), bold (**text**),
   * and custom embed syntax (label)/%^url^%/
   */
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
          if (ipIndex % 2 === 1) {
            return (
              <code
                key={`${k}-inline-${pIndex}-${ipIndex}`}
                className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
              >
                {ip}
              </code>
            );
          }

          // handle bold and embeds inside the non-code text
          const boldParts = ip.split("**");
          return boldParts.map((bp, bpIndex) => {
            // process embed syntax inside this bold/non-bold fragment
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
              <strong key={`${k}-bold-${pIndex}-${ipIndex}-${bpIndex}`}>{bp}</strong>
            ) : (
              bp
            );
          });
        });
      });
    };

    return handleMarkdown(txt, keyPrefix);
  };

  /**
   * renderContent:
  * - detects table blocks defined between @& ... &@ and renders tables using
   *   %R{row}$C{col} text% tokens.
  * - outside table blocks: detects list blocks wrapped by # ... # and renders lists using ~ as
   *   bullet separators. Everything else is treated as regular text and passed
   *   through renderText for markdown handling.
   */
  const renderContent = (content: string) => {
    // Split into table vs non-table sections. Keep capturing group to preserve table content.
    const tableSections = content.split(/@&([\s\S]*?)(?:&@|$)/g);

    return tableSections.map((section, i) => {
      // odd-index in the split = inside @& &@ table area
      if (i % 2 === 1) {
        // parse table rows/cols in this section
        const tableRegex = /%R(\d+)\$C(\d+)\s*([\s\S]*?)(?=\s*%R\d+\$C\d+|$)/g;
        const tableMatches = Array.from(section.matchAll(tableRegex));
        if (tableMatches.length === 0) return null;

        const tableData: Record<number, Record<number, string>> = {};
        let maxRow = 0;
        let maxCol = 0;
        for (const match of tableMatches) {
          const row = parseInt(match[1], 10);
          const col = parseInt(match[2], 10);
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
      }

      // Outside tables: handle lists and normal text.
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      const listBlockRegex = /#([\s\S]*?)#/g;
      let match;
      while ((match = listBlockRegex.exec(section)) !== null) {
        const blockStart = match.index;
        const blockEnd = match.index + match[0].length;
        const listRaw = match[1] || "";
        if ((listRaw.match(/~/g) ?? []).length <= 2) continue;

        // push text before the list block
        if (blockStart > lastIndex) {
          const beforeText = section.slice(lastIndex, blockStart);
          parts.push(
            <div key={`text-${i}-${lastIndex}`}>{renderSectionText(beforeText, `outside-${i}-${lastIndex}`)}</div>
          );
        }

        // split by ~ or newline, but keep items that contain non-whitespace
        const items = listRaw
          .split(/~|\n/g)
          .map((s) => s.trim())
          .filter(Boolean);

        parts.push(
          <ul key={`list-${i}-${blockStart}`} className="list-disc list-inside mb-2">
            {items.map((item, idx) => (
              <li key={`list-${i}-${blockStart}-li-${idx}`}>
                {renderText(item, `list-${i}-${blockStart}-li-${idx}`)}
              </li>
            ))}
          </ul>
        );

        lastIndex = blockEnd;
      }

      // push any remaining content after the last list block
      if (lastIndex < section.length) {
        const remaining = section.slice(lastIndex);
        parts.push(<div key={`text-${i}-end`}>{renderSectionText(remaining, `outside-${i}-end`)}</div>);
      }

      return <div key={`section-${i}`}>{parts}</div>;
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
              : "bg-white dark:bg-card text-gray-900 dark:text-foreground rounded-bl-md"
          }`}
        >
          {message.imageUrl && (
            <div className="mb-2">
              <button type="button" className="block cursor-zoom-in" onClick={() => setImageZoomed(true)} aria-label="Zoom uploaded image">
                <img src={message.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded-lg" />
              </button>
            </div>
          )}

          {message.imageText && (
            <div className="mb-2 p-2 bg-muted rounded text-xs text-muted-foreground border-l-2 border-primary">
              <span className="font-medium">Extracted text:</span> {message.imageText}
            </div>
          )}

          <div
            className={`${
              isUser ? "not-prose text-white text-sm" : "prose prose-sm max-w-none prose-gray dark:prose-invert"
            }`}
          >
            {renderContent(message.content)}
          </div>
        </div>

        <div className={`message-actions flex ${isUser ? "justify-end" : "justify-start"} items-center mt-1 space-x-2`}>
          <span className="text-xs text-muted-foreground">{formatTimestamp(message.createdAt)}</span>

          {isUser ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              aria-label="Copy message"
              data-testid={`button-copy-${message.id}`}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          ) : (
            <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                data-testid={`button-copy-${message.id}`}
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
          )}

          {onFeedbackChange && (
            <>
              <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-2 text-xs ${
                      liked === true ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleLike(true)}
                    aria-label="Like message"
                    data-testid={`button-like-${message.id}`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-2 text-xs ${
                      liked === false ? "text-red-600 hover:text-red-700" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleLike(false)}
                    aria-label="Dislike message"
                    data-testid={`button-dislike-${message.id}`}
                  >
                    <ThumbsDown className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={imageZoomed} onOpenChange={setImageZoomed}>
        <DialogContent className="max-w-[95vw] border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Uploaded image</DialogTitle>
          {message.imageUrl && <img src={message.imageUrl} alt="Uploaded image enlarged" className="mx-auto max-h-[85vh] max-w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
