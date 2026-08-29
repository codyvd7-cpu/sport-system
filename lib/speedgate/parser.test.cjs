const { parseLine, parseChunk, applyEvent, armBlockers } = require('/tmp/sgtest/parser.js');
const { INITIAL_STATUS } = require('/tmp/sgtest/types.js');

let pass = 0, fail = 0;
const results = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; results.push(`  ok    ${name}`); }
  else { fail++; results.push(`  FAIL  ${name}\n          expected ${e}\n          actual   ${a}`); }
}

console.log('\n── Documented messages (from the brief) ──');
check('PONG|1',              parseLine('PONG|1'),              { type:'pong', value:1 });
check('HELLO|1|1.0.0',       parseLine('HELLO|1|1.0.0'),       { type:'hello', protocolVersion:1, firmwareVersion:'1.0.0' });
check('STATE|READY',         parseLine('STATE|READY'),         { type:'state', state:'READY' });
check('STATE|WAIT',          parseLine('STATE|WAIT'),          { type:'state', state:'WAIT' });
check('NODE|START_RX|1',     parseLine('NODE|START_RX|1'),     { type:'node', node:'START_RX', online:true });
check('NODE|FINISH_TX|0',    parseLine('NODE|FINISH_TX|0'),    { type:'node', node:'FINISH_TX', online:false });
check('BEAM|START|CLEAR',    parseLine('BEAM|START|CLEAR'),    { type:'beam', gate:'start', clear:true });
check('BEAM|FINISH|BLOCK',   parseLine('BEAM|FINISH|BLOCK'),   { type:'beam', gate:'finish', clear:false });
check('SYNC|1|4463',         parseLine('SYNC|1|4463'),         { type:'sync', valid:true, rttUs:4463 });
check('RSSI|START_RX|-62',   parseLine('RSSI|START_RX|-62'),   { type:'rssi', node:'START_RX', rssi:-62 });
check('DIST|30',             parseLine('DIST|30'),             { type:'distance', metres:30 });
check('ARMED|17',            parseLine('ARMED|17'),            { type:'armed', runId:17 });
check('RUN|START|17',        parseLine('RUN|START|17'),        { type:'runStarted', runId:17 });
check('RESULT|17|4287|30',   parseLine('RESULT|17|4287|30'),   { type:'result', runId:17, elapsedMs:4287, distanceM:30 });
check('FAULT|TIMEOUT',       parseLine('FAULT|TIMEOUT'),       { type:'fault', code:'TIMEOUT' });

console.log('\n── Malformed / hostile input (must never throw) ──');
const nasty = ['', '   ', '|||', 'RESULT', 'RESULT|', 'RESULT|abc|def|ghi', 'STATE|', 'STATE|BOGUS',
  'NODE|NOT_A_NODE|1', 'BEAM|MIDDLE|CLEAR', 'BEAM|START|MAYBE', 'RESULT|17|0|30', 'RESULT|17|-500|30',
  'DIST|0', 'DIST|-5', 'ARMED|notanumber', '\u0000\u0001binary', 'A'.repeat(5000)];
let threw = 0;
for (const n of nasty) {
  try { const r = parseLine(n); if (!r || !r.type) threw++; }
  catch { threw++; results.push(`  FAIL  threw on: ${JSON.stringify(n.slice(0,30))}`); fail++; }
}
if (threw === 0) { pass++; results.push(`  ok    ${nasty.length} malformed inputs handled without throwing`); }

console.log('\n── Future-proofing ──');
check('unknown future event',  parseLine('SPLIT|17|1200'),      { type:'unknown', raw:'SPLIT|17|1200' });
check('unknown future fault',  parseLine('FAULT|WIND_ASSISTED'),{ type:'fault', code:'WIND_ASSISTED' });
check('lowercase accepted',    parseLine('state|ready'),        { type:'state', state:'READY' });

console.log('\n── Multi-line chunk ──');
check('chunk splits',
  parseChunk('STATE|READY\nBEAM|START|CLEAR\nSYNC|1|4463').map(e => e.type),
  ['state','beam','sync']);

console.log('\n── Status folding ──');
let s = INITIAL_STATUS;
for (const line of ['HELLO|1|1.0.0','STATE|READY','NODE|START_TX|1','NODE|START_RX|1',
                    'NODE|FINISH_TX|1','NODE|MASTER|1','BEAM|START|CLEAR','BEAM|FINISH|CLEAR',
                    'SYNC|1|4463','DIST|30']) {
  s = applyEvent(s, parseLine(line));
}
check('firmware captured', s.firmwareVersion, '1.0.0');
check('all four nodes online', Object.values(s.nodes), [true,true,true,true]);
check('both beams clear', s.beams, { start:true, finish:true });
check('distance set', s.distanceM, 30);

console.log('\n── ARM safety gate (the important one) ──');
const ready = { ...s, connection: 'connected' };
check('ready → no blockers', armBlockers(ready), []);

check('disconnected blocks',
  armBlockers({ ...ready, connection: 'disconnected' }), ['Not connected to the gates']);
check('misaligned start blocks',
  armBlockers({ ...ready, beams: { start:false, finish:true } }), ['Start gate alignment required']);
check('offline node blocks',
  armBlockers({ ...ready, nodes: { ...ready.nodes, FINISH_TX:false } }), ['1 unit offline']);
check('bad sync blocks',
  armBlockers({ ...ready, sync: { valid:false, rttUs:0 } }), ['Timing not synchronised']);
check('fault blocks',
  armBlockers({ ...ready, hardwareState:'FAULT' }), ['Hardware fault — reset the gates']);
check('already running blocks',
  armBlockers({ ...ready, hardwareState:'RUNNING' }), ['A run is already in progress']);
check('multiple problems all reported',
  armBlockers({ ...ready, connection:'disconnected', beams:{start:false,finish:false} }).length, 3);

console.log('\n── Fault state clears on recovery ──');
let f = applyEvent(INITIAL_STATUS, parseLine('FAULT|TIMEOUT'));
check('fault recorded', f.lastFault, 'TIMEOUT');
f = applyEvent(f, parseLine('STATE|READY'));
check('fault cleared on READY', f.lastFault, null);

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
