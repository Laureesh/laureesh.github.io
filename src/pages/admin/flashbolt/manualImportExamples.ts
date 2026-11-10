export const manualImportExamples = [
  {
    title: "One correct choice + explanation",
    description: "Put Correct Answer: directly after the right choice. End with Explanation and your explanation text.",
    text: `Question 1
Which tool captures network packets?

answer
A
Wireshark
Correct Answer:
B
A text editor
C
A calculator

Explanation
Wireshark captures network traffic so you can inspect individual packets.`,
  },
  {
    title: "Multiple correct choices + explanation",
    description: "Include Select two in the question. Mark each right choice with Correct Answer: on the next line.",
    text: `Question 1
Which actions help secure an account? (Select two.)

answer
A
Use a unique password.
Correct Answer:
B
Enable multi-factor authentication.
Correct Answer:
C
Share your password.

Explanation
A unique password limits password reuse attacks. Multi-factor authentication adds another verification step.`,
  },
  {
    title: "Website review — revealed answer + explanation",
    description: "Keep the question, Correct answer: line, and explanation. You can leave out website buttons and category labels.",
    text: "Question 1\nWhich concept adjusts resources to demand?\nCorrect answer: Elasticity\nResources grow and shrink with demand.",
  },
  {
    title: "Basic flashcards — term :: definition",
    description: "One card per line. Separate the question or term from its answer with ::.",
    text: "Firewall :: Filters network traffic.\nIDS :: Detects suspicious network activity.",
  },
  {
    title: "Spreadsheet — two tab-separated columns",
    description: "Copy two columns from a spreadsheet: term first, definition second. The space between columns below is a tab.",
    text: "Firewall\tFilters network traffic.\nIDS\tDetects suspicious network activity.",
  },
  {
    title: "Long answers — multiple lines with ::",
    description: "Use :: before the answer and a blank line between cards. Answers can span multiple lines.",
    text: "Explain this scenario:\nAn application fails. :: Check the logs.\nThen retry.\n\nWhat next? :: Monitor recovery.",
  },
  {
    title: "Lettered choices — Answer: A",
    description: "End the question with a question mark. Put each choice on its own line, then Answer: followed by the correct letter or full answer.",
    text: "Which tool captures packets?\nA. Wireshark\nB. A text editor\nC. A calculator\nAnswer: A",
  },
  {
    title: "Compact choices — one line with ::",
    description: "Include lettered choices before :: and the full correct answer after it.",
    text: "Which tool captures packets? A. Wireshark B. A text editor C. A calculator :: Wireshark",
  },
  {
    title: "True / false — statement + correct answer",
    description: "Include True and False choices, followed by :: and the correct answer.",
    text: "A firewall can filter network traffic. True False :: True",
  },
  {
    title: "CyberDefense review — graded choices",
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
    title: "LMS review — Selected / Unselected choices",
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
    title: "Kahoot — copied list with correct labels",
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
    title: "Quizlet — HTML for both card sides",
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
    title: "Study notes — generate cards from statements",
    description: "Paste one statement per line to generate question-and-answer cards. Bullets and numbered lists work too; review the generated cards after importing.",
    text: "A firewall is a network security control.\nAn operating system manages hardware resources.\nSoftware is non-tangible.",
  },
];
