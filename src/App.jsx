import { useEffect, useRef, useState } from "react";

const BASE = [
  "코러스",
  "건반",
  "기타",
  "드럼",
  "베이스",
  "보컬",
  "인트로",
  "아웃트로",
  "브릿지",
  "후렴",
  "간주",
];
const DEFAULT_WORDS = BASE.map((text) => ({ text, color: "#2f5fd0" }));
const PRESET = [
  "#2f5fd0",
  "#d03a2f",
  "#1e9e5a",
  "#e08a00",
  "#8a3fd0",
  "#d0359a",
  "#00889e",
  "#555555",
];

const load = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const store = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

/* ---- 박스 DOM 헬퍼: 스타일을 전부 인라인으로 → 저장/복사해도 모양 유지 ---- */
function styleBox(el, color) {
  el.dataset.color = color;
  el.style.cssText = `display:inline-block;vertical-align:middle;border:2px solid ${color};border-radius:6px;padding:2px 12px;margin:2px 4px;line-height:1.4;font-weight:600;background:#fff;color:${color};max-width:260px;text-align:left;cursor:pointer`;
}
function setMemo(el, text) {
  let m = el.querySelector(".m");
  if (!text) {
    m?.remove();
    return;
  }
  if (!m) {
    m = document.createElement("div");
    m.className = "m";
    m.style.cssText =
      "font-size:12px;font-weight:400;color:#444;white-space:pre-wrap;word-break:break-all;line-height:1.35;border-top:1px solid #ddd;margin-top:2px;padding-top:2px";
    el.appendChild(m);
  }
  m.textContent = text;
}
function makeBox(text, color) {
  const d = document.createElement("div");
  d.className = "box";
  d.contentEditable = "false";
  const t = document.createElement("span");
  t.className = "t";
  t.textContent = text;
  d.appendChild(t);
  styleBox(d, color);
  return d;
}
function cleanHTML(pad) {
  const c = pad.cloneNode(true);
  c.querySelectorAll(".box").forEach((b) => {
    b.removeAttribute("contenteditable");
    b.classList.remove("sel");
    b.style.cursor = "";
  });
  return c.innerHTML;
}
function plainText(pad) {
  const c = pad.cloneNode(true);
  c.querySelectorAll(".box").forEach((b) => {
    const m = b.querySelector(".m");
    b.replaceWith(
      `[${b.querySelector(".t").textContent}${m ? ": " + m.textContent : ""}]`,
    );
  });
  return c.textContent.replace(/\u00A0/g, " ");
}

export default function App() {
  const padRef = useRef(null);
  const saved = useRef(null);
  const [words, setWords] = useState(() => load("lp.words", DEFAULT_WORDS));
  const [defColor, setDefColor] = useState(() =>
    load("lp.defColor", "#2f5fd0"),
  );
  const [editing, setEditing] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [panel, setPanel] = useState(null); // { box, word, memo, color }

  useEffect(() => store("lp.words", words), [words]);
  useEffect(() => store("lp.defColor", defColor), [defColor]);

  // 에디터 안의 마지막 커서 위치를 기억 (버튼을 눌러도 위치 유지)
  useEffect(() => {
    const onSel = () => {
      const s = getSelection();
      if (s.rangeCount && padRef.current?.contains(s.anchorNode))
        saved.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const toast = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };

  function insertBox(word) {
    const pad = padRef.current;
    pad.focus();
    let r;
    if (saved.current && pad.contains(saved.current.startContainer)) {
      r = saved.current.cloneRange();
      r.collapse(false);
    } else {
      r = document.createRange();
      r.selectNodeContents(pad);
      r.collapse(false);
    }
    const box = makeBox(word.text, word.color);
    const sp = document.createTextNode("\u00A0");
    r.insertNode(sp);
    r.insertNode(box);
    const nr = document.createRange();
    nr.setStartAfter(sp);
    nr.collapse(true);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(nr);
    saved.current = nr.cloneRange();
  }

  function addWord() {
    const text = newWord.trim();
    if (!text || words.some((w) => w.text === text)) return;
    setWords([...words, { text, color: defColor }]);
    setNewWord("");
  }
  const setWordColor = (i, color) =>
    setWords(words.map((w, j) => (j === i ? { ...w, color } : w)));
  const removeWord = (i) => setWords(words.filter((_, j) => j !== i));

  /* ---- 박스 클릭 → 메모/색 패널 ---- */
  function closePanel() {
    panel?.box.classList.remove("sel");
    setPanel(null);
  }
  function onPadClick(e) {
    const box = e.target.closest(".box");
    if (!box || !padRef.current.contains(box)) return;
    panel?.box.classList.remove("sel");
    box.classList.add("sel");
    setPanel({
      box,
      word: box.querySelector(".t").textContent,
      memo: box.querySelector(".m")?.textContent ?? "",
      color: box.dataset.color || "#2f5fd0",
    });
  }
  function changeMemo(memo) {
    setMemo(panel.box, memo);
    setPanel({ ...panel, memo });
  }
  function changeColor(color) {
    styleBox(panel.box, color);
    panel.box.classList.add("sel");
    setPanel({ ...panel, color });
  }
  function deleteBox() {
    panel.box.remove();
    setPanel(null);
  }

  /* ---- 저장 / 복사 / 지우기 ---- */
  function saveFile() {
    const pad = padRef.current;
    if (!pad.textContent.trim()) return toast("내용이 없습니다");
    const name = (title.trim() || "제목없음").replace(/[\\/:*?"<>|]/g, "_");
    const esc = name.replace(/</g, "&lt;");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${esc}</title><style>body{font:16px/2.6 sans-serif;padding:24px;white-space:pre-wrap}</style></head><body>${cleanHTML(pad)}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${name}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("저장됨");
  }
  async function copy() {
    const pad = padRef.current;
    const html = `<div style="line-height:2.6">${cleanHTML(pad)}</div>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plainText(pad)], { type: "text/plain" }),
        }),
      ]);
      toast("복사됨");
    } catch {
      try {
        await navigator.clipboard.writeText(plainText(pad));
        toast("텍스트만 복사됨");
      } catch {
        toast("복사할 수 없습니다");
      }
    }
  }
  function clearAll() {
    const pad = padRef.current;
    if (pad.textContent && !confirm("내용을 모두 지울까요?")) return;
    pad.innerHTML = "";
    saved.current = null;
    setPanel(null);
  }
  function onPaste(e) {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text"));
  }

  return (
    <main>
      <h1>🎹 단어 박스 메모장</h1>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="곡 제목 (저장 파일명으로 사용)"
      />

      <div className="words">
        {words.map((w, i) =>
          editing ? (
            <span className="wedit" key={w.text}>
              <input
                type="color"
                value={w.color}
                onChange={(e) => setWordColor(i, e.target.value)}
                title="이 단어의 기본 색"
              />
              {w.text}
              <button
                onClick={() => removeWord(i)}
                aria-label={`${w.text} 삭제`}
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              key={w.text}
              className="w"
              style={{ borderColor: w.color }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertBox(w)}
            >
              {w.text}
            </button>
          ),
        )}
      </div>

      <div className="row">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
          placeholder="새 단어 추가"
        />
        <span className="mut">새 단어 색</span>
        <input
          type="color"
          value={defColor}
          onChange={(e) => setDefColor(e.target.value)}
        />
        <button onClick={addWord}>추가</button>
        <button onClick={() => setEditing(!editing)}>
          {editing ? "편집 완료" : "단어 편집"}
        </button>
      </div>
      {editing && (
        <div className="mut">
          단어 옆 동그란 색 버튼으로 그 단어의 기본 색을 바꿀 수 있어요. 이미
          만든 박스는 바뀌지 않습니다.
        </div>
      )}

      <div
        id="pad"
        ref={padRef}
        contentEditable
        suppressContentEditableWarning
        onClick={onPadClick}
        onPaste={onPaste}
        data-ph="버튼을 누르면 테두리 박스가 입력됩니다. 박스를 누르면 메모와 색을 바꿀 수 있어요."
      />

      {panel && (
        <div className="panel">
          <div className="row">
            <b>{panel.word}</b>
            <span className="mut">메모 · 색 수정</span>
          </div>
          <textarea
            rows={3}
            value={panel.memo}
            onChange={(e) => changeMemo(e.target.value)}
            placeholder="이 박스에 대한 메모를 적어 보세요"
            autoFocus
          />
          <div className="row">
            {PRESET.map((c) => (
              <button
                key={c}
                className={"sw" + (panel.color === c ? " on" : "")}
                style={{ background: c }}
                onClick={() => changeColor(c)}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={panel.color}
              onChange={(e) => changeColor(e.target.value)}
            />
          </div>
          <div className="row">
            <button className="del" onClick={deleteBox}>
              박스 삭제
            </button>
            <button className="pri" onClick={closePanel}>
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="row">
        <button className="pri" onClick={saveFile}>
          HTML로 저장
        </button>
        <button onClick={copy}>복사 (시트에 붙여넣기)</button>
        <button onClick={clearAll}>지우기</button>
        <span className="mut">{msg}</span>
      </div>
    </main>
  );
}
