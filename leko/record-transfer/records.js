export const keys = Object.freeze({
  speech: ['speechPracticeScripts','speechPracticeActiveScript','speechPracticeSelectedNumbers'],
  leko: ['lekoActiveDay','lekoCustomScript','lekoVoice']
});
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const safeName = v => typeof v === 'string' && v.length <= 300 && !['__proto__','prototype','constructor'].includes(v);
const string = (v, max=1000000) => typeof v === 'string' && v.length <= max;
const only = (v, allowed) => Object.keys(v).every(k=>allowed.includes(k));
export function storageKey(tool, key, legacy=false) {
  if (!keys[tool]?.includes(key)) throw Error('Unknown tool or record');
  return legacy ? key : `almool:language:${tool}:v1:${key}`;
}
function validRecord(key, value) {
  if (!string(value)) return false;
  if (key === 'speechPracticeScripts') {
    const rows = JSON.parse(value);
    return Array.isArray(rows) && rows.length <= 500 && rows.every(row=>
      object(row) && only(row,['id','name','markdown','updatedAt']) &&
      safeName(row.id) && string(row.name,500) && string(row.markdown) &&
      Number.isFinite(row.updatedAt) && row.updatedAt >= 0);
  }
  if (key === 'speechPracticeSelectedNumbers') {
    const rows = JSON.parse(value);
    return object(rows) && Object.keys(rows).length <= 500 && Object.entries(rows).every(([id, numbers])=>
      safeName(id) && Array.isArray(numbers) && numbers.length <= 10000 &&
      numbers.every(v=>Number.isSafeInteger(v)&&v>=0 || string(v,100)));
  }
  if (key === 'lekoCustomScript') return string(value);
  return string(value,1000);
}
export function validateBackup(input, tool) {
  if (!keys[tool] || !object(input) || input.format !== 'almool-device-records' ||
      input.version !== 1 || input.tool !== tool || !object(input.records) ||
      !only(input,['format','version','tool','createdAt','records'])) throw Error('Wrong backup format or tool');
  if (JSON.stringify(input).length > 2000000) throw Error('Backup is too large');
  for (const [key,value] of Object.entries(input.records)) {
    if (!keys[tool].includes(key) || !validRecord(key,value)) throw Error('Invalid record');
  }
  return input;
}
export function exportRecords(storage, tool, legacy=false) {
  const records = Object.fromEntries(keys[tool].flatMap(key=>{
    const value = storage.getItem(storageKey(tool,key,legacy));
    return value === null ? [] : [[key,value]];
  }));
  return validateBackup({format:'almool-device-records',version:1,tool,
    createdAt:new Date().toISOString(),records},tool);
}
export function importRecords(storage, backup, tool, legacy=false) {
  validateBackup(backup,tool);
  const names = keys[tool].map(key=>storageKey(tool,key,legacy));
  const prior = names.map(key=>[key,storage.getItem(key)]);
  try {
    // Import explicitly replaces this tool's allowed records only.
    for (const name of names) storage.removeItem(name);
    for (const [key,value] of Object.entries(backup.records)) storage.setItem(storageKey(tool,key,legacy),value);
  } catch (error) {
    for (const [key,value] of prior) {
      if (value === null) storage.removeItem(key); else storage.setItem(key,value);
    }
    throw error;
  }
}
