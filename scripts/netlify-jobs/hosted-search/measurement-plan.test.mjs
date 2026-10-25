import test from 'node:test';
import assert from 'node:assert/strict';
import {plan,requestURL} from './measurement-plan.mjs';
test('bounded complete matrix preserves both sorts and repetitions',()=>{assert.equal(plan.cases.length,16);assert.equal(new Set(plan.cases.map(x=>JSON.stringify(x))).size,16);assert.equal(plan.maxRequests,16);assert.equal(plan.production,false);});
test('only immutable disposable target permitted',()=>{for(const origin of ['https://moraltrade.org','https://moraltrade-rlhf-compat-20261021.netlify.app','http://6ada91ae3e191165820ee550--moraltrade-rlhf-compat-20261021.netlify.app','https://user@6ada91ae3e191165820ee550--moraltrade-rlhf-compat-20261021.netlify.app'])assert.throws(()=>requestURL(origin,plan.cases[0]));});
test('retains exact search controls and rejects invented cases',()=>{const origin='https://6ada91ae3e191165820ee550--moraltrade-rlhf-compat-20261021.netlify.app';const u=requestURL(origin,plan.cases[0]);assert.equal(u.pathname,'/offers');assert.equal(u.searchParams.get('render'),'server');assert.equal(u.searchParams.get('smart'),'1');assert.throws(()=>requestURL(origin,{...plan.cases[0]}));});

test('matrix cannot be mutated and alternate ports are rejected',()=>{assert.throws(()=>{plan.cases[0].count=1;});assert.throws(()=>plan.cases.push({}));assert.throws(()=>requestURL('https://6ada91ae3e191165820ee550--moraltrade-rlhf-compat-20261021.netlify.app:8443',plan.cases[0]));});
