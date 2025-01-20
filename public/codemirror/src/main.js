import { EditorView, basicSetup } from "codemirror";
import { keymap, ViewUpdate, ViewPlugin, WidgetType, Decoration } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { Vim, vim } from "@replit/codemirror-vim";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { javascript, esLint } from "@codemirror/lang-javascript";
import { lintGutter, linter, openLintPanel } from "@codemirror/lint";

import {
  highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
  rectangularSelection, crosshairCursor,
  lineNumbers, highlightActiveLineGutter
} from "@codemirror/view"
import {
  defaultHighlightStyle, indentOnInput, bracketMatching,
  foldGutter, foldKeymap
} from "@codemirror/language"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"

import Linter from "eslint4b-prebuilt";

let md_highlight = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: t.heading1,
      fontWeight: "bold",
      fontFamily: "sans-serif",
      fontSize: "28px",
      textDecoration: "none",
    },
    {
      tag: t.heading2,
      fontWeight: "bold",
      fontFamily: "sans-serif",
      fontSize: "26px",
      textDecoration: "none",
    },
    {
      tag: t.heading3,
      fontWeight: "bold",
      fontFamily: "sans-serif",
      fontSize: "24px",
      textDecoration: "none",
    },
    {
      tag: t.heading4,
      fontWeight: "bold",
      fontFamily: "sans-serif",
      fontSize: "22px",
      textDecoration: "none",
    },
    {
      tag: t.heading5,
      fontWeight: "bold",
      fontFamily: "sans-serif",
      fontSize: "20px",
      textDecoration: "none",
    },
    {
      tag: t.link,
      fontFamily: "sans-serif",
      textDecoration: "underline",
      color: "#1c9aa0",
    },
    { tag: t.emphasis, fontFamily: "sans-serif", fontStyle: "italic" },
    {
      tag: t.strong,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      color: "#a07e3b",
    },
    { tag: t.monospace, fontFamily: "monospace" },
    { tag: t.content, fontFamily: "sans-serif" },
    { tag: t.meta, color: "darkgrey" },
  ]),
);


export {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
  searchKeymap, highlightSelectionMatches,
  defaultKeymap, history, historyKeymap,
  highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
  rectangularSelection, crosshairCursor,
  lineNumbers, highlightActiveLineGutter,
  defaultHighlightStyle, indentOnInput, bracketMatching,
  foldGutter, foldKeymap,
  EditorView,
  EditorState,
  basicSetup,
  vim,
  Vim,
  keymap,
  markdown,
  md_highlight,
  javascript,
  esLint,
  lintGutter, linter, openLintPanel,
  Linter,
  Compartment,
  t,
  syntaxTree,
  HighlightStyle, syntaxHighlighting,
  ViewUpdate, ViewPlugin, WidgetType, Decoration
};
