**Chapter 4: Threads — practice-set guide**

The practice set contains 100 original multiple-choice questions based on your 25-slide `ch4.ppt` and 26-page `Operating Systems 1.pdf`. The PDF is handwritten class notes; page 1 is blank. Each question has four choices, one correct answer, an explanation, and a slide/page reference. Application questions are new scenarios built from the supplied concepts, not predictions of your instructor's quiz.

**Copy into Flashbolt**

1. Open [the complete import text](chapter-4-threads-flashbolt-import.txt).
2. Select all of its text and copy it.
3. Create an empty Flashbolt set titled **Operating Systems — Chapter 4: Threads**.
4. Paste into the set's import field and use its import action.
5. Confirm that the set contains **100 questions**. Keep the `answer`, choice letters, `Correct Answer:`, and `Explanation` lines intact: Flashbolt uses them to retain answer choices and explanations.

The current quiz importer accepts at most 100 questions per paste. This file fits that limit. Its text was checked through the actual Flashbolt parser: all 100 questions, 400 choices, correct answers, and explanations survived. Correct answers are distributed evenly across A, B, C, and D.

**What to study**

| Questions | Topic | Main course references |
|---|---|---|
| 1–8 | Thread definition, private execution state, shared process resources | Slides 3–4, 7; PDF 3–5, 8 |
| 9–18 | Responsiveness, sharing, economy, scalability, concurrency, parallelism, work balance | Slides 4–6; PDF 5–7 |
| 19–27 | User and kernel threads, libraries, many-to-one | Slides 8–10; PDF 9–15 |
| 28–37 | One-to-one, many-to-many, blocking, costs, parallelism limits | Slides 11–12; PDF 13–17 |
| 38–46 | `fork()` versus `exec()` and multithreaded semantics | Slide 14; PDF 18–20 |
| 47–56 | Signals, handlers, synchronous/asynchronous events, delivery | Slides 15–16; PDF 20–22 |
| 57–66 | Cancellation requests, state, type, checkpoints, cleanup | Slides 17–18; PDF 23–24 |
| 67–74 | TLS, local versus shared data, thread-pool reuse | Slide 19; PDF 25 |
| 75–84 | Windows context/ETHREAD/KTHREAD/TEB; Linux tasks/clone/task_struct | Slides 21–24; PDF 26 |
| 85–90 | Combined scenarios and misleading generalizations | Relevant slides and notes are cited per question |
| 91–100 | Data splitting, historical examples, Pthreads code, cancellation table, register context | Slides 5, 7, 12, 17–18, 21 |

**The distinctions to explain in your own words**

Think of a process as the resource container and its threads as separate execution paths. Threads share process code, ordinary data, and open files. Each has its own ID, program counter, register state, and stack. A separate stack does not mean a separate process address space.

The four benefits are **responsiveness**, **resource sharing**, **economy**, and **scalability**. A responsive interface can keep working while a worker waits, provided the mapping and other dependencies permit it. Lower overhead does not mean zero overhead.

**Concurrency** means overlapping progress. **Parallelism** means simultaneous execution. One execution core can interleave tasks; multiple available execution resources can run them simultaneously. A larger user-thread count alone does not guarantee more parallelism.

| Mapping | User threads → kernel threads | If the only relevant kernel context blocks | Main tradeoff |
|---|---|---|---|
| Many-to-one | Many → one | Its mapped user threads cannot execute through it | Low user-space management overhead, but no multicore parallelism for those threads |
| One-to-one | One → one | Other runnable kernel threads can still be scheduled | Independent scheduling, with kernel-resource costs per thread |
| Many-to-many | Many → a set | Other available kernel threads can support work | Multiplexing flexibility without requiring one kernel thread per user thread |

When a question gives runnable user threads, mapped kernel threads, and available cores, look for the tightest limit. With 12 user threads, 3 kernel threads, and 8 available cores without SMT, at most 3 of those user threads execute simultaneously under that mapping.

`fork()` creates a child process. `exec()` replaces the running program image. The chapter asks which threads get copied by a fork operation; it does not mean that exec replaces only one thread's private code.

A signal is a notification: **generation → delivery → handling**. Keep its cause separate from its effect. Cancellation is a different mechanism: **request → permission from the target's state/type → cancellation and cleanup**.

| Cancellation settings | What to expect |
|---|---|
| Disabled | A request remains pending |
| Enabled + deferred | Cancellation can take effect at a cancellation point |
| Enabled + asynchronous | Cancellation need not wait for a normal cancellation point |

`pthread_create(&tid, 0, worker, NULL)` creates the worker and writes its identifier into `tid`. `pthread_cancel(tid)` requests cancellation of that identified thread. `pthread_testcancel()` is an explicit cancellation point. A request does not prove the target has already terminated.

**TLS belongs to the thread**, not to one function call or necessarily one incoming request. An ordinary automatic local belongs to a particular call. An ordinary process-wide global is shared. A reused pool worker can retain TLS between jobs, so initialize request-specific state appropriately.

For Windows, associate **ETHREAD** with the owning process and KTHREAD links, **KTHREAD** with scheduling/synchronization and the kernel stack, and **TEB** with user-space thread information and TLS. For Linux, associate **task**, **clone()**, sharing flags, and **task_struct**.

**Clarifications to keep beside the handwritten notes**

- PDF pages 4 and 8 say threads cannot make system calls. That is not a general rule. Distinguish managing threads entirely in user space from an executing thread invoking a system call; the slide's user/kernel stacks also illustrate this distinction. [Linux threads reference](https://man7.org/linux/man-pages/man7/pthreads.7.html)
- PDF page 19's `fork(1)`/`fork(2)` labels are not portable function-call variants. Ordinary Linux `fork()` leaves the child with only the caller's thread; `fork(2)` in a manual names its section. [Linux fork reference](https://man7.org/linux/man-pages/man2/fork.2.html)
- PDF page 22 overgeneralizes asynchronous signals. Their effect depends on the signal and handling. Also, custom handlers cannot override SIGKILL or SIGSTOP. [Signal reference](https://man7.org/linux/man-pages/man7/signal.7.html)
- PDF page 25's simultaneous shared-variable access is not automatically deadlock. Unsynchronized shared updates can produce a race or lost update; deadlock involves waiting that prevents progress. TLS also does not automatically privatize every shared variable.
- Software multithreading is not synonymous with hardware Hyper-Threading/SMT. Likewise, one-to-one can operate on a single core; parallel execution additionally needs suitable hardware resources.
- Preserve version qualifiers in the slides: Solaris Green Threads, Solaris before version 9, Solaris 9 and later, and Windows with ThreadFiber are different examples. “One-to-one is always best” is not a universal conclusion; the models have tradeoffs.

If your instructor expects a particular shorthand, use the named model or API to make the scope explicit. The explanations mark these clarifications so you can distinguish course shorthand from general OS behavior.

**Study for understanding**

Work through the topic groups first. Before revealing an answer, explain why it is right and why the nearest distractor is wrong. Then use Flashbolt's shuffled testing to avoid memorizing the order. Revisit missed questions until you can explain the mechanism without the choices.

Prioritize the comparisons: private/shared state; concurrency/parallelism; the three mappings; fork/exec; signal/cancellation; cancellation state/type; TLS/local/global; and Windows/Linux structures. The final ten questions cover small details and the code/table images that are easy to overlook.

Scope follows the files you supplied. Topics such as Amdahl's law or OpenMP were not included because they do not appear in this version of your Chapter 4 deck.
