export const workshopStages = [
 {id:'upload',phase:'upload',label:'Завершение практики и отправка работ',time:'43:00',hint:'Участники сохраняют PNG и отправляют работы в галерею. Проверьте модерацию перед переходом к голосованию.'},
 {id:'voting',phase:'voting',label:'Голосование',time:'',hint:'Приём работ закрыт. У каждого участника до трёх лайков.'},
 {id:'words',phase:'words',label:'Впечатления',time:'',hint:'Голосование закрыто. Участники присылают впечатления, ведущая одобряет слова.'},
 {id:'results',phase:'results',label:'Итоговый показ и обсуждение',time:'',hint:'Сбор впечатлений закрыт. Обсуждаем результаты и одобренные слова.'}
];
export function workshopStageIndex(settings) {
 return workshopStages.findIndex(step=>step.id===settings.phase);
}
