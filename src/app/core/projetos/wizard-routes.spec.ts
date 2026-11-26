import { WizardRoutes, idDoCampo } from './wizard-routes';

describe('WizardRoutes', () => {
  it('monta rotas absolutas com o id do projeto', () => {
    expect(WizardRoutes.etapa('7', 2)).toEqual({ commands: ['/projetos', '7', 'etapa-2'], extras: { queryParams: {} } });
    expect(WizardRoutes.etapa('7', 3, { origem: 'revisao', aba: 'fornos' }).extras.queryParams).toEqual({ origem: 'revisao', aba: 'fornos' });
    expect(WizardRoutes.revisao('7').commands).toEqual(['/projetos', '7', 'revisao']);
  });
  it('o item 0 também vai na URL (índice base 0)', () => {
    expect(WizardRoutes.etapa('7', 4, { origem: 'revisao', item: 0 }).extras.queryParams).toEqual({ origem: 'revisao', item: 0 });
  });
  it('item da validação leva à etapa, campo e item certos', () => {
    expect(WizardRoutes.doItem('7', { etapa: 'cargas-especiais', campo: 'medidorExclusivo', aba: null, item: null }).commands).toEqual(['/projetos', '7', 'etapa-5']);
    expect(WizardRoutes.doItem('7', { etapa: 'projeto', campo: 'cep' }).commands).toEqual(['/projetos', '7', 'etapa-1']);
  });
  it('id do campo a focar, por etapa', () => {
    expect(idDoCampo('comercial', 'areaM2', 2, null)).toBe('area-espaco-2');
    expect(idDoCampo('residencial', 'quantidadeUnidades', 1, null)).toBe('unidades-1');
    expect(idDoCampo('area-comum', null, null, 'fornos')).toBe('fornos');
    expect(idDoCampo('cargas-especiais', 'potenciaBombaIncendioCv', null, null)).toBe('potenciaCv');
    expect(idDoCampo('cargas-especiais', 'medidorExclusivo', null, null)).toBe('medidorExclusivo');
    expect(idDoCampo('comercial', null, null, null)).toBeNull();
  });
});
