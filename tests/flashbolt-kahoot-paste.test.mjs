import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuizResults } from '../src/pages/admin/flashbolt/note-parser.ts';

const copied = String.raw`Questions (13)

Hide answers
Question layout

set of instructions or piece of code to execute specific tasks.
hardwarehardware
Software, correct
softwaresoftware
diskdisk
Solid State DriveSolid State Drive
operating system is \_\_\_\_ software.
applicationapplication
System , correct
systemsystem
Issue SpecificIssue Specific
none of thesenone of these
\_\_\_\_\_\_ acts as intermediary between the users and the hardware.
softwaresoftware
programprogram
Operating system, correct
operating systemoperating system
Disk DriversDisk Drivers
The users can directly use hardware without Operating system, however it would not be convenient and easy.
True, correct
truetrue
falsefalse
each application program has its own resources requirements, if these applications have direct access to hardware then
it can easily managableit can easily managable
it is efficient way to utilize resourcesit is efficient way to utilize resources
user friendly and convinientuser friendly and convinient
Clash of resources utilization, correct
clash of resources utilizationclash of resources utilization
in the abstract view of the system, the users are located at level \_\_\_
00
11
22
3, correct
33
Which of the following is the primary goal of the general purpose computer Operating system.
Convenience , correct
convenienceconvenience
efficiencyefficiency
The core part of Operating system that helps the users/applications to interact with hardware
Device DriversDevice Drivers
device controllersdevice controllers
Kernel, correct
kernelkernel
Utility ProgramsUtility Programs
if the user/application requests anything through kernel then it is called\_\_\_\_\_
System RequestSystem Request
User RequestUser Request
system interruptsystem interrupt
System Call, correct
System CallSystem Call
which are three main components of the general purpose computers
RAM, CPU, ROMRAM, CPU, ROM
CPU, Device controllers, RAM, correct
CPU, Device controllers, RAMCPU, Device controllers, RAM
CPU, ALU, Control UnitCPU, ALU, Control Unit
none of thesenone of these
Device controllers are the incharge of the specific device, it also contain \_\_\_\_ to avoid CPU idle condition.
pointerpointer
Local Buffer, correct
Local BufferLocal Buffer
RAMRAM
cachecache
Computer components may create \_\_\_\_ and Upon receiving CPU suspends its on-going tasks and get that one done.
requestsrequests
User InteractionUser Interaction
Interrupts, correct
interruptsinterrupts
callscalls
In the computer systems, the smallest storage device is Cache.
truetrue
False, correct
false`;

test('imports all 13 questions from the supplied Kahoot copy with correct choices', () => {
  const cards = parseQuizResults(copied);
  assert.equal(cards.length, 13);
  assert.deepEqual(cards.map(card => card.definition), ['Software', 'System', 'Operating system', 'True', 'Clash of resources utilization', '3', 'Convenience', 'Kernel', 'System Call', 'CPU, Device controllers, RAM', 'Local Buffer', 'Interrupts', 'False']);
  assert.deepEqual(cards.map(card => card.answerChoices.length), [4, 4, 4, 2, 4, 4, 2, 4, 4, 4, 4, 4, 2]);
  assert.deepEqual(cards[5].answerChoices, ['0', '1', '2', '3']);
  assert.equal(cards[1].term, 'operating system is ____ software.');
  assert.equal(cards[3].questionType, 'true-false');
  assert.equal(cards[12].questionType, 'true-false');
  for (const card of cards) assert.deepEqual(card.correctAnswers, [card.definition]);
});

test('supports CRLF and rejects incomplete or unmarked question lists', () => {
  assert.equal(parseQuizResults(copied.replaceAll('\n', '\r\n')).length, 13);
  assert.deepEqual(parseQuizResults(copied.replace('Questions (13)', 'Questions (14)')), []);
  assert.deepEqual(parseQuizResults(copied.replaceAll(/, correct/g, '')), []);
});
