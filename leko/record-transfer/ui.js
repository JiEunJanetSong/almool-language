import {exportRecords,validateBackup,importRecords} from './records.js';
const config=document.querySelector('meta[name="almool-device-tool"]');
if (config) {
  const tool=config.content, legacy=config.dataset.legacy==='true';
  const ko=document.documentElement.lang.startsWith('ko');
  const text=(en,kr)=>ko?kr:en;
  const element=(tag,content)=>{const node=document.createElement(tag);node.textContent=content;return node;};
  const panel=element('details','');panel.className='almool-device-records';
  panel.append(element('summary',text('Device records','기기 학습 기록')));
  const note=element('p',text('Export your saved scripts and learning settings. Import replaces only this tool’s records on this device.',
    '저장한 대본과 학습 설정을 내려받으세요. 가져오기는 이 기기의 현재 도구 기록만 교체합니다.'));
  const download=element('button',text('Export records','기록 내보내기'));download.type='button';
  const label=element('label',text('Choose a backup to import','가져올 백업 선택'));
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';label.append(file);
  const status=element('p','');status.setAttribute('role','status');
  const apply=element('button',text('Replace these records and reload','이 도구의 기록 교체 후 새로고침'));apply.type='button';apply.hidden=true;
  let pending=null;
  download.onclick=()=>{
    try {
      const value=exportRecords(localStorage,tool,legacy);
      const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`almool-${tool}-${new Date().toISOString().slice(0,10)}.json`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent=text('Backup download started. Keep it private.','백업 다운로드를 시작했습니다. 개인적으로 보관하세요.');
    } catch {status.textContent=text('Could not read device records. No records were changed.','기기 기록을 읽을 수 없습니다. 기록은 변경되지 않았습니다.');}
  };
  file.onchange=async()=>{
    pending=null;apply.hidden=true;
    try {
      const selected=file.files?.[0];if(!selected)return;
      if(selected.size>2000000)throw Error('size');
      pending=validateBackup(JSON.parse(await selected.text()),tool);
      status.textContent=text(`${Object.keys(pending.records).length} record groups ready. Export current records before replacing them.`,
        `${Object.keys(pending.records).length}개 기록 묶음을 확인했습니다. 교체 전에 현재 기록을 내보내세요.`);
      apply.hidden=false;
    } catch {status.textContent=text('This backup is invalid or belongs to another tool.','백업 형식이 올바르지 않거나 다른 도구의 백업입니다.');}
  };
  apply.onclick=()=>{
    if(!pending)return;
    try {importRecords(localStorage,pending,tool,legacy);location.reload();}
    catch {status.textContent=text('Import failed. Check device storage space.','가져오지 못했습니다. 기기 저장 공간을 확인하세요.');}
  };
  panel.append(note,download,label,status,apply);
  document.body.append(panel);
}
