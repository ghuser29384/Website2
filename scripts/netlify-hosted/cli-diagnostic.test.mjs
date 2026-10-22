import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyCliFailure} from './cli-diagnostic.mjs';
test('classifies error without exposing stderr, stdout or tokens',()=>{
 const result=classifyCliFailure({status:1,stderr:'secret-sentinel unknown option --x',stdout:'Authorization: Bearer secret-other'});
 assert.deepEqual(result,{exitCode:1,signal:null,categories:['unknown-option']});
 assert(!JSON.stringify(result).includes('secret'));
});
test('unrecognized output is withheld',()=>assert.deepEqual(classifyCliFailure({stderr:'private configuration value'}).categories,['configuration']));
test('missing deploy directory is detected',()=>assert(classifyCliFailure({stderr:'The deploy directory x has not been found'}).categories.includes('missing-deploy-directory')));
