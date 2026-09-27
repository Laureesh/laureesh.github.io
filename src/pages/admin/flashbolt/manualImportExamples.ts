export const manualImportExamples = [
  {
    title: "Term :: definition",
    description: "One card per line. Separate the question or term from its answer with ::.",
    text: "Firewall :: Filters network traffic.\nIDS :: Detects suspicious network activity.",
  },
  {
    title: "Spreadsheet / tab-separated pairs",
    description: "Copy two columns from a spreadsheet: term first, definition second. The space between columns below is a tab.",
    text: "Firewall\tFilters network traffic.\nIDS\tDetects suspicious network activity.",
  },
  {
    title: "Multiline question and answer",
    description: "Use :: before the answer and a blank line between cards. Answers can span multiple lines.",
    text: "Explain this scenario:\nAn application fails. :: Check the logs.\nThen retry.\n\nWhat next? :: Monitor recovery.",
  },
  {
    title: "Multiple choice with an answer key",
    description: "End the question with a question mark. Put each choice on its own line, then Answer: followed by the correct letter or full answer.",
    text: "Which tool captures packets?\nA. Wireshark\nB. A text editor\nC. A calculator\nAnswer: A",
  },
  {
    title: "Choices inside a term :: answer pair",
    description: "Include lettered choices before :: and the full correct answer after it.",
    text: "Which tool captures packets? A. Wireshark B. A text editor C. A calculator :: Wireshark",
  },
  {
    title: "True or false",
    description: "Include True and False choices, followed by :: and the correct answer.",
    text: "A firewall can filter network traffic. True False :: True",
  },
  {
    title: "CyberDefense Pro module quiz",
    description: "Paste the full quiz review. Lettered choices, Correct Answer: markers, and explanations are preserved. Multiple marked answers become a select-all card; Incorrect answer: marks are excluded from the answer key.",
    text: `Question 1
Correct
Which controls help? (Select two.)

answer

A
Validate input.
Correct Answer:
Correct

B
Apply updates.
Correct Answer:
Correct

C
Share passwords.

Explanation
Validate input and apply updates to reduce vulnerabilities.

Keep explanations on multiple lines or in separate paragraphs.`,
  },
  {
    title: "LMS quiz results",
    description: "Copy the question review with Selected / Unselected labels and correctness markers. Include Correct Answer for the answer key, especially for missed questions.",
    text: `Question 1
Which tool captures packets?
Correct Answer
Unselected Wireshark
Incorrect Response
Selected A text editor
Unselected A calculator`,
  },
  {
    title: "Kahoot question list",
    description: "Copy the full list with answers shown, including Questions (count) and the correct labels. Multiple correct labels are supported.",
    text: `Questions (1)
Hide answers
Question layout
Which tool captures packets?
Wireshark, correct
WiresharkWireshark
A text editorA text editor
A calculatorA calculator`,
  },
  {
    title: "Quizlet term-list HTML",
    description: "Paste the term-list HTML containing Term rows and both card sides. A Quizlet URL belongs in the link import section instead.",
    text: `<div aria-label="Term" class="SetPageTermsList-term">
  <div data-testid="set-page-term-card-side">
    <span class="TermText">Firewall</span>
  </div>
  <div data-testid="set-page-term-card-side">
    <span class="TermText">Filters network traffic.</span>
  </div>
</div>`,
  },
  {
    title: "Plain study notes",
    description: "Paste one statement per line to generate question-and-answer cards. Bullets and numbered lists work too; review the generated cards after importing.",
    text: "A firewall is a network security control.\nAn operating system manages hardware resources.\nSoftware is non-tangible.",
  },
];
