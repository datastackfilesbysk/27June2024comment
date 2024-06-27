import * as vscode from "vscode";

export interface CommentCheckResult {
  name: string;
  comment: string[]; // Changed to string array
  hasComment: boolean;
  className: string;
}

export interface FileAnalysisResult {
  functions: CommentCheckResult[];
  classes: ClassesResult[];
  otherElements: OtherCodeElement[];
}
export interface OtherCodeElement {
  element: string;
  comment: string[]; // Changed to string array
  hasComment: boolean;
}
export interface ClassesResult {
  className: string;
  hasComment: boolean;
  comment: string[]; // Changed to string array
}

function immediateSmallerNumber(arr: number[], num: number): number {
  arr.sort((a, b) => a - b);
  let left = 0;
  let right = arr.length - 1;
  let result = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] >= num) {
      right = mid - 1;
    } else {
      result = arr[mid];
      left = mid + 1;
    }
  }
  return result;
}

function extractCommentContent(comment: string): string {
  const singleLineMatch = comment.match(/^\/\/\s*(.*)$/);
  if (singleLineMatch) {
    return singleLineMatch[1].trim();
  }

  const multiLineMatch = comment.match(/^\/\*\s*([\s\S]*?)\s*\*\/$/);
  if (multiLineMatch) {
    return multiLineMatch[0].replace(/^\s*\*+/gm, "").trim();
  }

  const xmlCommentMatch = comment.match(/^\/\/\/\s*(.*)$/gm);
  if (xmlCommentMatch) {
    return xmlCommentMatch
      .map((line) => {
        const trimmedLine = line.replace(/^\/\/\//, "").trim();
        if (trimmedLine.startsWith("<")) {
          return `/// ${trimmedLine}`;
        } else {
          return `/// ${trimmedLine.replace(/^\s*/, " ")}`; // Add extra space indentation
        }
      })
      .join("\n");
  }

  // const xmlCommentMatch = comment.match(/^\/\/\/\s*(.*)$/gm);
  // if (xmlCommentMatch) {
  //   return xmlCommentMatch
  //     .map((line) => line.replace(/^\/\/\//, "").trim())
  //     .join("\n");
  // }

  return comment.trim();
}

export function checkComments(
  content: string,
  filename: string
): Promise<FileAnalysisResult> {
  return new Promise((resolve, reject) => {
    if (!content || !filename) {
      reject("Invalid content or filename");
      return;
    }

    const methodRegex =
      /(?:public|protected|private|internal|static|\s)+[\w\<\>\[\]]+\s+(\w+)\s*\([^)]*\)\s*{/g;
    const classRegex = /class\s+(\w+)\s*{/g;
    const commentRegex =
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|\/\/\/[^\n]*(?:\n\/\/\/[^\n]*)*/g;
    const otherCodeRegex = /namespace\s+\w+|using\s+\w+|int\s+\w+|\w+\s+\w+;/g; // Example regex for other elements
    const methods: RegExpExecArray[] = [];
    const classes: RegExpExecArray[] = [];
    const comments: RegExpExecArray[] = [];
    const otherElements: RegExpExecArray[] = [];
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match);
    }
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match);
    }
    while ((match = commentRegex.exec(content)) !== null) {
      comments.push(match);
    }
    while ((match = otherCodeRegex.exec(content)) !== null) {
      otherElements.push(match);
    }

    const result: FileAnalysisResult = {
      functions: [],
      classes: [],
      otherElements: [],
    };

    const classMap = new Map<number, string>();
    classes.forEach((cls) => {
      const className = cls[1];
      if (cls.index !== undefined) {
        const classStartIndex = cls.index;
        classMap.set(classStartIndex, className);
      }
    });

    const otherElementMap = new Map<number, string>();
    otherElements.forEach((otherelem) => {
      const otherElement = otherelem[1];
      if (otherelem.index !== undefined) {
        const otherElementStartIndex = otherelem.index;

        otherElementMap.set(otherElementStartIndex, otherElement);
      }
    });
    const findClassName = (methodIndex: number): string => {
      let className = "null";
      for (let [classIndex, name] of classMap) {
        if (classIndex < methodIndex) {
          className = name;
        } else {
          break;
        }
      }
      return className;
    };

    const findCommentsBefore = (
      index: number,
      prevIndex: number | null
    ): RegExpExecArray[] => {
      let precedingComments: RegExpExecArray[];
      if (prevIndex !== null) {
        precedingComments = comments.filter(
          (comment) =>
            comment.index !== undefined &&
            comment.index < index &&
            comment.index > prevIndex
        );
      } else {
        precedingComments = comments.filter(
          (comment) => comment.index !== undefined && comment.index < index
        );
      }

      return precedingComments;
    };

    const extractCommentText = (
      commentMatches: RegExpExecArray[]
    ): string[] => {
      return commentMatches.map((comment) => extractCommentContent(comment[0]));
    };

    let maxLength =
      methods.length > classes.length ? methods.length : classes.length;

    for (let i = 0; i < maxLength; i++) {
      if (methods[i]) {
        let method = methods[i];
        const methodName = method[1];
        const prevMethodIndex = immediateSmallerNumber(
          [
            ...methods.map((m) => m.index),
            ...classes.map((c) => c.index),
            ...otherElements.map((o) => o.index),
          ],
          method.index!
        );

        if (method.index !== undefined) {
          const methodStartIndex = method.index;
          const className = findClassName(methodStartIndex);

          const methodComments = findCommentsBefore(
            methodStartIndex,
            prevMethodIndex
          );

          const hasValidComment = methodComments.some(
            (comment) =>
              comment[0].trim() !== "//" &&
              comment[0].trim() !== "///" &&
              comment[0].trim() !== "/* */"
          );

          result.functions.push({
            name: methodName,
            className: className,
            comment: hasValidComment ? extractCommentText(methodComments) : [],
            hasComment: !!methodComments.length && hasValidComment,
          });
        }
      }
      if (classes[i]) {
        let cls = classes[i];
        const className = cls[1];
        if (cls.index !== undefined) {
          const classStartIndex = cls.index;
          const prevClassIndex = immediateSmallerNumber(
            [
              ...methods.map((m) => m.index),
              ...classes.map((c) => c.index),
              ...otherElements.map((o) => o.index),
            ],
            classStartIndex
          );

          const classComments = findCommentsBefore(
            classStartIndex,
            prevClassIndex
          );

          const hasValidComment = classComments.some(
            (comment) =>
              comment[0].trim() !== "//" &&
              comment[0].trim() !== "///" &&
              comment[0].trim() !== "/* */"
          );

          result.classes.push({
            className: className,
            comment: hasValidComment ? extractCommentText(classComments) : [],
            hasComment: !!classComments.length && hasValidComment,
          });
        }
      }
    }
    resolve(result);
  });
}
