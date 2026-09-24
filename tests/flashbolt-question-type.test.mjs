import assert from 'node:assert/strict';
import test from 'node:test';
import {detectQuestionType,applyDetectedQuestionType,withCorrectChoiceAnswers} from '../src/pages/admin/flashbolt/questionTypeDetection.ts';
test('multiple correct answers override single-choice wording and repair older Kahoot imports', () => {
 const card = {id:'multi',term:'Select the correct answer.',definition:'Resources; Task ended',answerChoices:['Resources','Instructions','Task ended','None'],questionType:'multiple-choice'};
 const repaired = withCorrectChoiceAnswers(card);
 assert.equal(repaired.questionType,'select-all');
 assert.deepEqual(repaired.correctAnswers,['Resources','Task ended']);
 assert.equal(applyDetectedQuestionType(repaired).questionType,'select-all');
 assert.equal(withCorrectChoiceAnswers({...card,definition:'Unknown; Task ended'}).correctAnswers,undefined);
 assert.equal(withCorrectChoiceAnswers({...card,definition:'Resources; Resources'}).questionType,'multiple-choice');
});
test('detects explicit question instructions with punctuation and mixed case',()=>{
 for(const text of ['Which protocols? (Choose two.)','Select the three correct answers.','CHOOSE 2.','Select all that apply.','More than one answer may be correct.']) assert.equal(detectQuestionType(text),'select-all',text);
 for(const text of ['Which service? (Select the best answer.)','Choose one.','Select the correct response.']) assert.equal(detectQuestionType(text),'multiple-choice',text);
 for(const text of ['True or False? The service is enabled.','Is this statement true or false?','Statement. (True/False)']) assert.equal(detectQuestionType(text),'true-false',text);
 assert.equal(detectQuestionType('Match each term to its definition.'),'matching');
 assert.equal(detectQuestionType('Fill in the blanks.'),'written');
});
test('avoids guesses from ordinary questions or lesson content',()=>{
 for(const text of ['What is DNS?','Compare two cloud services.','The Boolean values are true or false.','Choose a topic to study.','A matching algorithm finds similar records.']) assert.equal(detectQuestionType(text),null,text);
});
test('manual override stays selected and can be re-enabled',()=>{
 const card={id:'a',term:'Choose two.',definition:'A; B',questionType:'written',questionTypeMode:'manual'};
 assert.equal(applyDetectedQuestionType(card),card);
 assert.equal(applyDetectedQuestionType({...card,questionTypeMode:'auto'}).questionType,'select-all');
});
test('auto true/false does not invent correct answers or lose previous authored choices',()=>{
 const card={id:'a',term:'True or False?',definition:'Original explanation',answerChoices:['DNS','DHCP'],correctAnswers:['DNS'],questionType:'multiple-choice'};
 const detected=applyDetectedQuestionType(card);
 assert.deepEqual(detected.answerChoices,['True','False']);
 assert.equal(detected.definition,card.definition);
 assert.deepEqual(detected.correctAnswers,card.correctAnswers);
 const restored=applyDetectedQuestionType({...detected,term:'Select the best answer.'});
 assert.deepEqual(restored.answerChoices,card.answerChoices);
 assert.equal(restored.autoTypePreviousChoices,undefined);
 assert.equal(applyDetectedQuestionType({id:'b',term:'True or False?',definition:''}).correctAnswers,undefined);
});
test('matching initializes pairs once and keeps edited pairs',()=>{
 const card=applyDetectedQuestionType({id:'c',term:'Match each term.',definition:''});
 assert.equal(card.matchingPairs.length,4);
 card.matchingPairs[0].left='Edited';
 assert.deepEqual(applyDetectedQuestionType(card).matchingPairs,card.matchingPairs);
});
