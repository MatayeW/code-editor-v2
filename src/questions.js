// XP is worked out from the level (difficulty) and the topic (concept).
// Change these numbers to change the XP for every question.
export const levelXp = { Easy: 20, Medium: 40, Hard: 60 };
export const topicXp = { Loops: 10, Strings: 15, Arrays: 20 };

const baseQuestions = [
  {
    id: 1,
    title: "Sum to N",
    concept: "Loops",
    difficulty: "Easy",
    description:
      "Write a function `sumToN(n)` that returns the sum of all whole numbers from 1 up to `n`. If `n` is 0, return 0.",
    functionName: "sumToN",
    params: ["n"],
    starterCode: "function sumToN(n) {\n  // Write your solution here\n\n}",
    examples: [
      { input: "n = 5", output: "15", explanation: "1 + 2 + 3 + 4 + 5 = 15" },
      { input: "n = 3", output: "6" },
    ],
    constraints: ["`0 ≤ n ≤ 10,000`", "`n` is a whole number"],
    hint: "Start with a total of 0, then use a for loop from 1 up to n and add each number to the total.",
    visibleTests: [
      { input: [5], expected: 15 },
      { input: [1], expected: 1 },
      { input: [10], expected: 55 },
    ],
    hiddenTests: [
      { input: [0], expected: 0 },
      { input: [100], expected: 5050 },
    ],
  },
  {
    id: 2,
    title: "First Unique Character",
    concept: "Strings",
    difficulty: "Medium",
    description:
      "Given a string `text`, find the first character that appears only once and return its index. If no unique character exists, return `-1`.",
    functionName: "firstUniqueChar",
    params: ["text"],
    starterCode:
      "function firstUniqueChar(text) {\n  // Write your solution here\n\n}",
    examples: [
      {
        input: 'text = "javascript"',
        output: "0",
        explanation: '"j" is the first character that appears once.',
      },
      { input: 'text = "aabb"', output: "-1" },
    ],
    constraints: [
      "`1 ≤ text.length ≤ 100,000`",
      "`text` contains lowercase English letters only",
    ],
    hint: "A letter is unique if its first position and its last position in the text are the same. Look at indexOf and lastIndexOf.",
    visibleTests: [
      { input: ["javascript"], expected: 0 },
      { input: ["aabb"], expected: -1 },
      { input: ["loveleetcode"], expected: 2 },
    ],
    hiddenTests: [
      { input: ["abcabcd"], expected: 6 },
      { input: ["z"], expected: 0 },
    ],
  },
  {
    id: 3,
    title: "Remove Duplicates",
    concept: "Arrays",
    difficulty: "Easy",
    description:
      "Write a function `removeDuplicates(arr)` that returns a new array with the repeated values removed. Keep the first time each value appears, in the same order.",
    functionName: "removeDuplicates",
    params: ["arr"],
    starterCode:
      "function removeDuplicates(arr) {\n  // Write your solution here\n\n}",
    examples: [
      { input: "arr = [1, 1, 2]", output: "[1, 2]" },
      { input: 'arr = ["x", "y", "x", "z"]', output: '["x", "y", "z"]' },
    ],
    constraints: ["`0 ≤ arr.length ≤ 10,000`", "Items are numbers or strings"],
    hint: "A Set only keeps unique values. Try turning the array into a Set, then back into an array.",
    visibleTests: [
      { input: [[1, 2, 2, 3, 3, 3]], expected: [1, 2, 3] },
      { input: [["a", "b", "a"]], expected: ["a", "b"] },
      { input: [[5, 5, 5]], expected: [5] },
    ],
    hiddenTests: [
      { input: [[]], expected: [] },
      { input: [[4, 1, 4, 2, 1]], expected: [4, 1, 2] },
    ],
  },
];

// add the xp to every question: level XP + topic XP
const questions = baseQuestions.map((q) => ({
  ...q,
  xp: levelXp[q.difficulty] + (topicXp[q.concept] || 0),
}));

export default questions;
