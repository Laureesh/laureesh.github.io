# Operating Systems — Final Review

225 multiple-choice questions with four choices, one marked answer, a short explanation, and source references. The set combines overlapping material from the supplied files and includes calculation practice. It is a review of the supplied topics, not a prediction of the final exam.

## Import into one Flashbolt set

The current quiz importer ends with `cards.slice(0, 100)`, so importing all questions in one paste would silently lose questions. These three files stay below that limit. **Import them separately into the same set; do not concatenate them into one paste.**

1. In Flashbolt, choose **Create set** and title it **Operating Systems — Final Review**.
2. Open [Part 1](01-fundamentals-structures-processes-flashbolt-import.txt), copy its entire contents, paste into the set's paste-import field, and choose **Import pasted cards**. Expect **82 cards**.
3. In that same set, repeat with [Part 2](02-threads-deadlocks-bankers-flashbolt-import.txt). Expect **145 cards total**.
4. Repeat with [Part 3](03-memory-files-cloud-flashbolt-import.txt). Expect **225 cards total**.
5. Check the resulting set before studying. The current project implementation saves the set after each successful paste import.

The files use Flashbolt's existing `Question`, `answer`, `Correct Answer:`, and `Explanation` format. Correct-choice positions are balanced and shuffled. Each prompt includes a topic label so related questions are easy to find. No application code was changed, and no set was written into your account.

## Coverage

| Topic | Question numbers | Count | Import part |
| --- | --- | ---: | ---: |
| Fundamentals | 1–23 | 23 | 1 |
| OS structures | 24–48 | 25 | 1 |
| Processes and IPC | 49–82 | 34 | 1 |
| Threads | 83–108 | 26 | 2 |
| Deadlocks | 109–135 | 27 | 2 |
| Banker calculation practice | 136–145 | 10 | 2 |
| Memory | 146–183 | 38 | 3 |
| File systems | 184–208 | 25 | 3 |
| Cloud and virtualization | 209–225 | 17 | 3 |

Cloud computing is included because the supplied Fundamentals textbook has a full chapter on it. Scheduling coverage follows the supplied material: process states, queues, scheduler roles, swapping, and context switches. Detailed scheduling algorithms and page-replacement algorithms were not added as though they appeared in these files.

## Source map

All source files are in `../../os-d2l-study-material/`. Page references count from the first PDF page, including title pages. “Fundamentals textbook” in the cards means **Operating System Fundamentals**, by Umar Khokhar and Binh Tran, stored as `6d91d1e3073af520afaca981b4967c60.pdf`.

| Supplied source | Reviewed material used |
| --- | --- |
| `6d91d1e3073af520afaca981b4967c60.pdf` | Foundations, structures, processes, threads, deadlocks, memory, files, cloud; pp. 2–61 |
| `Ch_1(0S).pdf` | Handwritten OS overview, hardware, storage, management, computing environments |
| `ch1.pptx` | Foundations, OS functions, environments; substantive material starts at slide 9 |
| `ch2.pptx` | Services, modes, system calls, OS design and structures, debugging, boot |
| `Operating Systems 2.pdf` | Handwritten OS structures and system-call notes |
| `ch3.pptx` | Process layout and states, PCB, scheduling, process operations, IPC |
| `Operating Systems 3.pdf` | Handwritten process and communication notes |
| `ch4 (1).ppt` | Threading models, benefits, cancellation, signals, TLS, Windows/Linux examples |
| `Operating Systems 1 (1).pdf` | Handwritten threading notes |
| `ch7.ppt` | Deadlock conditions, graphs, prevention, avoidance, Banker, recovery |
| `Operating Systems.pdf` | Handwritten deadlock and Banker notes |
| `ch8.ppt` | Allocation, segmentation, paging, address translation, TLBs |
| `ch11.ppt` | Files, access methods, directories, sharing, protection |
| `RPReplay_Final1793736619.MP4` | Visible Banker worksheet and worked sequence; sampled frames at 00:00, 01:30, 03:00, 04:30, 06:00, 07:00 |

The recording was reviewed visually for the worksheet and its calculation steps; its audio was **not transcribed**, so audio-only remarks are not represented. Handwriting text extraction was imperfect. Unclear handwriting was cross-checked against the slides and typed textbook where possible, and uncertain diagram details were not invented. Source references identify the supporting topic sections, rather than claiming every explanation is a quotation. Questions, distractors, and explanations are newly written.

## Important distinctions when reviewing the notes

Some source statements are oversimplified, inconsistent, or appear to contain errors. These cards use the following distinctions:

- **Threads and system calls:** A thread can invoke a system call on behalf of its process. Whether a blocking call stalls other user threads depends on the mapping, especially many-to-one versus one-to-one. “Threads cannot make system calls” should not be memorized as a universal rule.
- **Kernel-scheduled thread versus kernel-mode execution:** Being scheduled as a kernel thread does not mean application instructions run permanently with kernel privilege.
- **Shared variables:** Conflicting concurrent updates can cause a race; sharing or simultaneous access alone does not prove deadlock. TLS gives each thread its own instance of data.
- **Mutual exclusion:** Multiple instances of a resource type do not automatically make each instance shareable. A cycle proves deadlock for single-instance resource types, but need not do so for multiple instances.
- **Safe versus unsafe:** An unsafe state is not necessarily already deadlocked. Banker is an avoidance algorithm and needs componentwise resource comparisons.
- **Base and limit:** When the limit is a length, legal offsets satisfy `0 <= offset < limit`, as in the memory slides. The upper endpoint is not included.
- **Pages and frames:** Pages divide logical memory; frames divide physical memory. A page is not defined merely as a disk partition. Paging avoids external fragmentation of frame allocation but can waste space inside the final page.
- **Logical addresses:** A logical address belongs to a process address space; it is not inherently a disk-sector address.
- **Permissions:** The basic classes are owner, group, and others. Read/write/execute are 4/2/1. `777` grants all three rights to all classes; `111` grants execute only, despite the textbook's conflicting example.
- **Mounting:** Mounting attaches a file system to a location in the namespace. It is not the same operation as installing an application.
- **Course conventions and historical examples:** Mode-bit values and binary “KB” notation are identified as course conventions. Historical OS product/version details are not presented as current product specifications. Pipe directionality and thread-fork behavior depend on the platform/API.

For grading-sensitive differences, compare the explanation with your instructor's terminology rather than memorizing an inconsistent sentence without context.

## Recording exercise: complete worked reference

The worksheet's total resources are **(11, 7, 10)**. All vectors below use the order **(R1, R2, R3)**.

| Process | Allocation | Maximum | Need = Maximum − Allocation |
| --- | --- | --- | --- |
| P1 | (3,1,1) | (5,7,3) | (2,6,2) |
| P2 | (0,2,0) | (4,2,6) | (4,0,6) |
| P3 | (1,1,1) | (3,1,4) | (2,0,3) |
| P4 | (4,0,0) | (4,1,2) | (0,1,2) |
| P5 | (0,1,0) | (2,4,4) | (2,3,4) |

Allocated totals are (8,5,2), so initial Available is **(3,2,8)**. Both P3 and P4 can be selected first. The illustrated safe sequence is **P3 → P2 → P4 → P5 → P1**.

| Step | Work before | Process Need | Allocation released | Work after |
| --- | --- | --- | --- | --- |
| P3 | (3,2,8) | (2,0,3) | (1,1,1) | (4,3,9) |
| P2 | (4,3,9) | (4,0,6) | (0,2,0) | (4,5,9) |
| P4 | (4,5,9) | (0,1,2) | (4,0,0) | (8,5,9) |
| P5 | (8,5,9) | (2,3,4) | (0,1,0) | (8,6,9) |
| P1 | (8,6,9) | (2,6,2) | (3,1,1) | (11,7,10) |

Check every resource component before selecting a process. The net update after its simulated completion is **Work += Allocation**, not Work += Maximum. More than one safe sequence may be valid.

## Calculation reminders

| Task | Rule |
| --- | --- |
| Banker remaining need | `Need = Max - Allocation`, componentwise |
| Initial resources available | `Available = Total - sum(Allocations)`, per resource type |
| Banker eligibility | Every component of `Need <= Work` |
| Contiguous translation | Check `0 <= logical < limit`, then `physical = base + logical` |
| Segment translation | Check the selected segment and offset, then `physical = segment base + offset` |
| Page number | `floor(logical address / page size)` |
| Page offset | `logical address mod page size` |
| Paging translation | `physical = frame number * page size + offset` |
| Number of pages | `ceil(process bytes / page size)` |
| Internal waste from rounding | `allocated bytes - process bytes` |
| Two-level access-time example | `hit rate * hit cost + miss rate * full miss-path cost` |

Attempt the calculation questions on paper before revealing the choices. Then review conceptual questions by explaining why the incorrect alternatives fail.

## Validation

Each import file was run through this project's actual `parseQuizResults` and `applyDetectedQuestionType` functions. Checks confirmed **82 + 63 + 80 = 225 unique questions**, four choices per card, exact correct answers, retained explanations/source text, and multiple-choice detection with both LF and CRLF line endings. The recorded Banker matrix and safe sequence, fixed-partition examples, paging arithmetic, and fragmentation calculations were independently checked in code. This validates local parsing; it is not a claim that a live account import has been performed.
